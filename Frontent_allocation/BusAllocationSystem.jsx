import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

const BusMap = () => {
  const [busData, setBusData] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [stopData, setStopData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [busRes, routeRes, stopRes] = await Promise.all([
          axios.get("http://localhost:3000/api/buses/available"),
          axios.get("http://localhost:3000/api/bus-allocation"),
          axios.get("http://localhost:3000/api/stops"),
        ]);
  
        console.log("Stops response:", stopRes.data); // 👈 Log to check
  
        setBusData(busRes.data);
        setRouteData(routeRes.data);
        setStopData(Array.isArray(stopRes.data) ? stopRes.data : []); // ✅ Ensure it's an array
      } catch (error) {
        console.error("Error fetching map data:", error);
      }
    };
  
    fetchData();
  }, []);
  

  return (
    <MapContainer
      center={[11.0168, 76.9558]} // Example: Coimbatore
      zoom={13}
      style={{ height: "100vh", width: "100%" }}
    >
      {/* OpenStreetMap TileLayer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render Stops */}
      {stopData.map((stop, index) => (
        <Marker
          key={index}
          position={[stop.latitude, stop.longitude]}
          icon={L.icon({
            iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          })}
        >
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}

      {/* Render Buses */}
      {busData.map((bus, index) => (
        <Marker
          key={`bus-${index}`}
          position={[bus.latitude, bus.longitude]}
          icon={L.icon({
            iconUrl: "/bus-icon.png", // Custom bus icon if you have
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })}
        >
          <Popup>{bus.busNumber}</Popup>
        </Marker>
      ))}

      {/* Render Routes (lines connecting stops per route) */}
      {routeData.map((route, idx) => (
        <Polyline
          key={`route-${idx}`}
          positions={route.stops.map(stop => [stop.latitude, stop.longitude])}
          color="blue"
        />
      ))}
    </MapContainer>
  );
};

export default BusMap;
