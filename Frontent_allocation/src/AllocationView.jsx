import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

const AllocationView = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/bus-allocation');
        if (!response.ok) {
          throw new Error('Failed to fetch allocations');
        }
        const data = await response.json();
        setAllocations(data.allocations || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocations();
    const interval = setInterval(fetchAllocations, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-spinner"></div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="allocations-container">
      <div className="allocations-header">
        <h1>Live Bus Allocations</h1>
        <div className="header-actions">
          <button className="refresh-btn">
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {allocations.length === 0 ? (
        <div className="no-allocations">
          <i className="fas fa-bus-slash"></i>
          <p>No active bus allocations found</p>
        </div>
      ) : (
        <div className="allocations-grid">
          {allocations.map((allocation, index) => (
            <div key={index} className="allocation-card">
              <div className="card-header">
                <h3>Route {allocation.route.number}: {allocation.route.name}</h3>
                <span className={`demand-badge ${allocation.demand.totalPassengers > 100 ? 'high' : 'medium'}`}>
                  {allocation.demand.totalPassengers} passengers
                </span>
              </div>
              
              <div className="route-summary">
                <div className="route-stops">
                  <div className="stop">
                    <div className="stop-marker start"></div>
                    <span>{allocation.route.source.name}</span>
                  </div>
                  <div className="stop-connector">
                    <div className="connector-line"></div>
                    <div className="stop-count">{allocation.route.totalStops} stops</div>
                  </div>
                  <div className="stop">
                    <div className="stop-marker end"></div>
                    <span>{allocation.route.destination.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="allocation-stats">
                <div className="stat">
                  <span className="stat-label">Buses Allocated</span>
                  <span className="stat-value">{allocation.allocation.busesAllocated}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Capacity</span>
                  <span className="stat-value">{allocation.allocation.totalCapacity}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Utilization</span>
                  <span className="stat-value">{allocation.allocation.utilizationPercentage}%</span>
                </div>
              </div>
              
              <div className="assigned-buses">
                <h4>Assigned Buses</h4>
                <div className="bus-list">
                  {allocation.allocation.buses.map((bus, busIndex) => (
                    <Link to={`/bus/${bus.busNumber}`} key={busIndex} className="bus-item">
                      <i className="fas fa-bus"></i>
                      <span>{bus.busNumber}</span>
                      <span className="bus-status">{bus.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
              
              <div className="card-footer">
                <span className="next-dispatch">
                  Next dispatch: {new Date(allocation.timing.nextDispatch).toLocaleTimeString()}
                </span>
                <button className="view-details-btn">
                  View Details <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AllocationView;