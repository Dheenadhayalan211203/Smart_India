require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { KNN } = require('ml-knn');
const { DecisionTree } = require('decision-tree');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Dheena:yourpassword@cluster0.ser6ewc.mongodb.net/Smarttransit?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose models
const ticketSchema = new mongoose.Schema({}, { strict: false });
const stopSchema = new mongoose.Schema({}, { strict: false });
const busSchema = new mongoose.Schema({}, { strict: false });

const Ticket = mongoose.model('Ticket', ticketSchema, 'tickets');
const Stop = mongoose.model('Stop', stopSchema, 'stops');
const Bus = mongoose.model('Bus', busSchema, 'busdata');

// Utility functions
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function calculateRouteDemand() {
  const tickets = await Ticket.find({ onbstats: true });
  const routeDemand = {};

  tickets.forEach(ticket => {
    const routeKey = `${ticket.routenumber}_${ticket.source}_${ticket.destination}`;
    
    if (!routeDemand[routeKey]) {
      routeDemand[routeKey] = {
        routeNumber: ticket.routenumber,
        source: ticket.source,
        destination: ticket.destination,
        demand: 0,
        stops: new Set()
      };
    }
    
    routeDemand[routeKey].demand += 1;
    routeDemand[routeKey].stops.add(ticket.stopnumber);
  });

  return Object.values(routeDemand)
    .map(route => ({
      ...route,
      stops: Array.from(route.stops)
    }))
    .sort((a, b) => b.demand - a.demand);
}

async function findPeakStop(routeNumber, stopNumbers) {
  const stopDemands = await Ticket.aggregate([
    { $match: { routenumber: routeNumber, stopnumber: { $in: stopNumbers } } },
    { $group: { _id: "$stopnumber", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  
  if (stopDemands.length === 0) return null;
  
  const stop = await Stop.findOne({ 
    routennumber: routeNumber, 
    stopnumber: stopDemands[0]._id 
  });
  
  return {
    stopNumber: stop.stopnumber,
    name: stop.stopname,
    passengers: stopDemands[0].count,
    location: {
      latitude: stop.latitude,
      longitude: stop.longitude
    }
  };
}

function calculateRouteDuration(stops) {
  let totalDistance = 0;
  for (let i = 1; i < stops.length; i++) {
    totalDistance += haversineDistance(
      stops[i-1].latitude,
      stops[i-1].longitude,
      stops[i].latitude,
      stops[i].longitude
    );
  }
  return Math.round(stops.length * 2 + totalDistance * 1);
}

function calculateArrivalTime(busLat, busLon, stopLat, stopLon) {
  const distance = haversineDistance(busLat, busLon, stopLat, stopLon);
  const minutes = Math.round((distance / 20) * 60);
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function allocateBuses(routeDemand, availableBuses, stops) {
  if (availableBuses.length === 0) {
    return { message: "No available buses", allocations: [] };
  }
  
  const highDemandRoutes = routeDemand.filter(route => route.demand > 50);
  
  if (highDemandRoutes.length === 0) {
    const defaultAllocations = await createDefaultAllocations(availableBuses, stops);
    return {
      message: "Default allocations (no high demand routes)",
      allocations: defaultAllocations,
      simulated: false
    };
  }
  
  const sourceStopLocations = [];
  const routeStopMap = {};
  
  for (const route of highDemandRoutes) {
    const sourceStop = await Stop.findOne({ 
      routennumber: route.routeNumber,
      stopnumber: Math.min(...route.stops)
    });
    
    if (sourceStop) {
      sourceStopLocations.push([
        sourceStop.latitude,
        sourceStop.longitude,
        route.routeNumber
      ]);
      routeStopMap[route.routeNumber] = {
        location: [sourceStop.latitude, sourceStop.longitude],
        demand: route.demand,
        routeData: route
      };
    }
  }
  
  const busLocations = availableBuses.map(bus => [
    bus.Latitude,
    bus.Longitude,
    bus.BusNo
  ]);
  
  const knn = new KNN(
    sourceStopLocations.map(loc => loc.slice(0, 2)), 
    sourceStopLocations.map(loc => loc[2])
  );
  
  const busAllocations = [];
  
  for (const bus of busLocations) {
    const [lat, lon, busNo] = bus;
    const predictedRoute = knn.predict([lat, lon]);
    
    const routeInfo = routeStopMap[predictedRoute];
    const distance = haversineDistance(lat, lon, routeInfo.location[0], routeInfo.location[1]);
    
    busAllocations.push({
      busNo,
      routeNumber: predictedRoute,
      distance,
      demand: routeInfo.demand,
      routeData: routeInfo.routeData
    });
  }
  
  busAllocations.sort((a, b) => a.distance - b.distance);
  
  const decisionTree = new DecisionTree({
    trainingSet: busAllocations,
    categoryAttr: 'routeNumber',
    ignoredAttributes: ['busNo', 'distance']
  });
  
  const routeGroups = {};
  busAllocations.forEach(allocation => {
    if (!routeGroups[allocation.routeNumber]) {
      routeGroups[allocation.routeNumber] = [];
    }
    routeGroups[allocation.routeNumber].push(allocation);
  });
  
  const finalAllocations = [];
  
  for (const [routeNumber, buses] of Object.entries(routeGroups)) {
    const route = routeStopMap[routeNumber].routeData;
    const routeStops = await Stop.find({ routennumber: routeNumber })
                              .sort({ stopnumber: 1 });
    const sourceStop = routeStops[0];
    const destinationStop = routeStops[routeStops.length - 1];

    const requiredBuses = Math.ceil(route.demand / 50);
    const allocatedBuses = buses.slice(0, requiredBuses);

    const busDetails = await Promise.all(allocatedBuses.map(async bus => {
      const busData = await Bus.findOne({ BusNo: bus.busNo });
      return {
        busNumber: bus.busNo,
        currentLocation: {
          latitude: busData.Latitude,
          longitude: busData.Longitude
        },
        capacity: busData.StaticSeatCount,
        availableSeats: busData.StaticSeatCount - busData.OccupiedSeatCount,
        distanceFromSource: haversineDistance(
          busData.Latitude,
          busData.Longitude,
          sourceStop.latitude,
          sourceStop.longitude
        ),
        estimatedArrival: calculateArrivalTime(
          busData.Latitude,
          busData.Longitude,
          sourceStop.latitude,
          sourceStop.longitude
        ),
        status: "Assigned"
      };
    }));

    finalAllocations.push({
      route: {
        number: routeNumber,
        name: `${sourceStop.stopname} to ${destinationStop.stopname}`,
        totalStops: routeStops.length,
        source: {
          name: sourceStop.stopname,
          location: {
            latitude: sourceStop.latitude,
            longitude: sourceStop.longitude
          },
          address: sourceStop.location_name
        },
        destination: {
          name: destinationStop.stopname,
          location: {
            latitude: destinationStop.latitude,
            longitude: destinationStop.longitude
          },
          address: destinationStop.location_name
        }
      },
      demand: {
        totalPassengers: route.demand,
        averagePerStop: Math.round(route.demand / route.stops.length),
        peakStop: await findPeakStop(routeNumber, route.stops)
      },
      allocation: {
        busesRequired: requiredBuses,
        busesAllocated: allocatedBuses.length,
        totalCapacity: allocatedBuses.length * 50,
        utilizationPercentage: Math.round((route.demand / (allocatedBuses.length * 50)) * 100),
        buses: busDetails
      },
      timing: {
        estimatedRouteDuration: calculateRouteDuration(routeStops),
        nextDispatch: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
  }

  return {
    message: "Bus allocation completed",
    allocations: finalAllocations,
    timestamp: new Date(),
    metadata: {
      totalBusesAllocated: finalAllocations.reduce((sum, alloc) => sum + alloc.allocation.busesAllocated, 0),
      totalPassengers: finalAllocations.reduce((sum, alloc) => sum + alloc.demand.totalPassengers, 0),
      averageUtilization: finalAllocations.length > 0 
        ? Math.round(finalAllocations.reduce((sum, alloc) => sum + alloc.allocation.utilizationPercentage, 0) / finalAllocations.length)
        : 0
    }
  };
}

async function createDefaultAllocations(buses, stops) {
  const routes = await Stop.aggregate([
    { $group: { _id: "$routennumber", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 2 }
  ]);

  if (routes.length === 0) return [];

  return Promise.all(routes.map(async route => {
    const routeStops = await Stop.find({ routennumber: route._id })
                               .sort({ stopnumber: 1 });
    const sourceStop = routeStops[0];
    const destinationStop = routeStops[routeStops.length - 1];

    const busesPerRoute = Math.floor(buses.length / routes.length);
    const allocatedBuses = buses.slice(0, busesPerRoute);

    const busDetails = await Promise.all(allocatedBuses.map(async bus => {
      return {
        busNumber: bus.BusNo,
        currentLocation: {
          latitude: bus.Latitude,
          longitude: bus.Longitude
        },
        capacity: bus.StaticSeatCount,
        availableSeats: bus.StaticSeatCount - bus.OccupiedSeatCount,
        distanceFromSource: haversineDistance(
          bus.Latitude,
          bus.Longitude,
          sourceStop.latitude,
          sourceStop.longitude
        ),
        status: "Standby"
      };
    }));

    return {
      route: {
        number: route._id,
        name: `${sourceStop.stopname} to ${destinationStop.stopname}`,
        source: {
          name: sourceStop.stopname,
          location: {
            latitude: sourceStop.latitude,
            longitude: sourceStop.longitude
          }
        },
        destination: {
          name: destinationStop.stopname,
          location: {
            latitude: destinationStop.latitude,
            longitude: destinationStop.longitude
          }
        }
      },
      allocation: {
        busesAllocated: allocatedBuses.length,
        buses: busDetails
      },
      message: "Default allocation (no demand data)"
    };
  }));
}

// API Endpoints

// Main allocation endpoint
app.get('/api/bus-allocation', async (req, res) => {
  try {
    const routeDemand = await calculateRouteDemand();
    const availableBuses = await Bus.find({ DutyStatus: 0 });
    const stops = await Stop.find();
    const allocation = await allocateBuses(routeDemand, availableBuses, stops);
    res.json(allocation);
  } catch (error) {
    console.error('Error in bus allocation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// New endpoint for bus-specific allocation
app.get('/api/bus/:busNumber', async (req, res) => {
  try {
    const { busNumber } = req.params;
    
    // First check if bus exists
    const bus = await Bus.findOne({ BusNo: busNumber });
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }
    
    // Check if bus is already allocated in any route
    const allAllocations = await calculateCurrentAllocations();
    const existingAllocation = allAllocations.find(alloc => 
      alloc.allocation.buses.some(b => b.busNumber === busNumber)
    );
    
    if (existingAllocation) {
      return res.json({
        message: "Existing allocation found",
        allocation: existingAllocation,
        busDetails: bus
      });
    }
    
    // If no allocation exists, create new allocation for this bus
    const routeDemand = await calculateRouteDemand();
    const stops = await Stop.find();
    
    if (routeDemand.length === 0) {
      // Create default allocation for this bus
      const defaultRoute = await Stop.findOne().sort({ routennumber: 1 });
      const routeStops = await Stop.find({ routennumber: defaultRoute.routennumber })
                                 .sort({ stopnumber: 1 });
      
      const allocation = {
        route: {
          number: defaultRoute.routennumber,
          name: `${routeStops[0].stopname} to ${routeStops[routeStops.length-1].stopname}`,
          source: {
            name: routeStops[0].stopname,
            location: {
              latitude: routeStops[0].latitude,
              longitude: routeStops[0].longitude
            }
          },
          destination: {
            name: routeStops[routeStops.length-1].stopname,
            location: {
              latitude: routeStops[routeStops.length-1].latitude,
              longitude: routeStops[routeStops.length-1].longitude
            }
          }
        },
        allocation: {
          buses: [{
            busNumber: bus.BusNo,
            currentLocation: {
              latitude: bus.Latitude,
              longitude: bus.Longitude
            },
            capacity: bus.StaticSeatCount,
            availableSeats: bus.StaticSeatCount - bus.OccupiedSeatCount,
            distanceFromSource: haversineDistance(
              bus.Latitude,
              bus.Longitude,
              routeStops[0].latitude,
              routeStops[0].longitude
            ),
            status: "Newly Assigned"
          }]
        },
        message: "Created new allocation for this bus"
      };
      
      return res.json(allocation);
    }
    
    // Find the best route for this bus
    const sourceStopLocations = [];
    const routeStopMap = {};
    
    for (const route of routeDemand) {
      const sourceStop = await Stop.findOne({ 
        routennumber: route.routeNumber,
        stopnumber: Math.min(...route.stops)
      });
      
      if (sourceStop) {
        sourceStopLocations.push([
          sourceStop.latitude,
          sourceStop.longitude,
          route.routeNumber
        ]);
        routeStopMap[route.routeNumber] = {
          location: [sourceStop.latitude, sourceStop.longitude],
          routeData: route
        };
      }
    }
    
    const knn = new KNN(
      sourceStopLocations.map(loc => loc.slice(0, 2)), 
      sourceStopLocations.map(loc => loc[2])
    );
    
    const predictedRoute = knn.predict([bus.Latitude, bus.Longitude]);
    const routeInfo = routeStopMap[predictedRoute];
    const routeStops = await Stop.find({ routennumber: predictedRoute })
                               .sort({ stopnumber: 1 });
    
    const allocation = {
      route: {
        number: predictedRoute,
        name: `${routeStops[0].stopname} to ${routeStops[routeStops.length-1].stopname}`,
        source: {
          name: routeStops[0].stopname,
          location: {
            latitude: routeStops[0].latitude,
            longitude: routeStops[0].longitude
          }
        },
        destination: {
          name: routeStops[routeStops.length-1].stopname,
          location: {
            latitude: routeStops[routeStops.length-1].latitude,
            longitude: routeStops[routeStops.length-1].longitude
          }
        }
      },
      allocation: {
        buses: [{
          busNumber: bus.BusNo,
          currentLocation: {
            latitude: bus.Latitude,
            longitude: bus.Longitude
          },
          capacity: bus.StaticSeatCount,
          availableSeats: bus.StaticSeatCount - bus.OccupiedSeatCount,
          distanceFromSource: haversineDistance(
            bus.Latitude,
            bus.Longitude,
            routeStops[0].latitude,
            routeStops[0].longitude
          ),
          status: "Newly Assigned"
        }]
      },
      message: "Created new allocation based on demand"
    };
    
    res.json(allocation);
    
  } catch (error) {
    console.error('Error in bus-specific allocation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

async function calculateCurrentAllocations() {
  const routeDemand = await calculateRouteDemand();
  const availableBuses = await Bus.find({ DutyStatus: 0 });
  const stops = await Stop.find();
  const { allocations } = await allocateBuses(routeDemand, availableBuses, stops);
  return allocations;
}

// Data inspection endpoints
app.get('/api/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find().limit(100);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stops', async (req, res) => {
  try {
    const stops = await Stop.find().limit(100);
    res.json(stops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/buses', async (req, res) => {
  try {
    const buses = await Bus.find().limit(100);
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/buses/available', async (req, res) => {
  try {
    const buses = await Bus.find({ DutyStatus: 0 });
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date(),
    dbState: mongoose.connection.readyState,
    memoryUsage: process.memoryUsage()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});