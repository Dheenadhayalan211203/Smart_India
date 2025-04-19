import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import './App.css';

const BusDetails = () => {
  const { busNumber } = useParams();
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBusData = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/bus/${busNumber}`);
        if (!response.ok) {
          throw new Error('Bus not found');
        }
        const data = await response.json();
        setBusData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBusData();
  }, [busNumber]);

  if (loading) return <div className="loading-spinner"></div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="bus-details-container">
      <div className="bus-header">
        <h1>
          <i className="fas fa-bus"></i> Bus {busNumber}
        </h1>
        <Link to="/" className="back-button">
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </Link>
      </div>

      <div className="bus-details-grid">
        <div className="bus-info-card">
          <h3>Bus Information</h3>
          <div className="info-item">
            <span className="info-label">Capacity:</span>
            <span className="info-value">{busData.busDetails?.StaticSeatCount || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className={`status-badge ${busData.allocation?.buses[0]?.status === 'Assigned' ? 'active' : 'standby'}`}>
              {busData.allocation?.buses[0]?.status || 'Unknown'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Current Location:</span>
            <span className="info-value">
              {busData.allocation?.buses[0]?.currentLocation 
                ? `${busData.allocation.buses[0].currentLocation.latitude.toFixed(6)}, 
                   ${busData.allocation.buses[0].currentLocation.longitude.toFixed(6)}`
                : 'Unknown'}
            </span>
          </div>
        </div>

        {busData.allocation && (
          <div className="route-info-card">
            <h3>Assigned Route</h3>
            <div className="route-header">
              <h4>{busData.allocation.route?.name || 'No route assigned'}</h4>
              <span className="route-number">Route {busData.allocation.route?.number}</span>
            </div>
            
            <div className="route-details">
              <div className="route-stop">
                <div className="stop-marker start"></div>
                <div className="stop-info">
                  <h5>Start: {busData.allocation.route?.source?.name}</h5>
                  <p>{busData.allocation.route?.source?.address}</p>
                </div>
              </div>
              
              <div className="route-stop">
                <div className="stop-marker end"></div>
                <div className="stop-info">
                  <h5>End: {busData.allocation.route?.destination?.name}</h5>
                  <p>{busData.allocation.route?.destination?.address}</p>
                </div>
              </div>
            </div>

            <div className="route-stats">
              <div className="stat-item">
                <span className="stat-label">Distance to Start</span>
                <span className="stat-value">
                  {busData.allocation.buses[0]?.distanceFromSource?.toFixed(2) || '0'} km
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Estimated Arrival</span>
                <span className="stat-value">
                  {busData.allocation.buses[0]?.estimatedArrival 
                    ? new Date(busData.allocation.buses[0].estimatedArrival).toLocaleTimeString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="map-container">
          <h3>Live Location</h3>
          <div className="map-placeholder">
            {/* In a real app, you would integrate with Google Maps or similar */}
            <img 
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${busData.allocation?.buses[0]?.currentLocation?.latitude || 13.0827},${busData.allocation?.buses[0]?.currentLocation?.longitude || 80.2707}&zoom=13&size=600x300&maptype=roadmap&markers=color:red%7C${busData.allocation?.buses[0]?.currentLocation?.latitude || 13.0827},${busData.allocation?.buses[0]?.currentLocation?.longitude || 80.2707}&key=YOUR_API_KEY`} 
              alt="Bus location map"
            />
            <div className="map-overlay">
              <button className="map-control">
                <i className="fas fa-location-arrow"></i> Track Live
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusDetails;