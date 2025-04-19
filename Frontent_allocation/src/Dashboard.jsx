import React, { useState, useEffect } from 'react';
 
import './App.css';
const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/bus-allocation');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setStats(data.metadata);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-spinner"></div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <h1>Transit System Overview</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Buses</h3>
          <p className="stat-value">{stats?.totalBusesAllocated || 0}</p>
          <p className="stat-label">Currently in service</p>
        </div>
        
        <div className="stat-card">
          <h3>Passengers Served</h3>
          <p className="stat-value">{stats?.totalPassengers || 0}</p>
          <p className="stat-label">Last allocation cycle</p>
        </div>
        
        <div className="stat-card">
          <h3>System Utilization</h3>
          <p className="stat-value">{stats?.averageUtilization || 0}%</p>
          <div className="utilization-bar">
            <div 
              className="utilization-fill" 
              style={{ width: `${stats?.averageUtilization || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="action-btn">
            <i className="fas fa-bus"></i>
            <span>View All Buses</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-map-marked-alt"></i>
            <span>View Routes</span>
          </button>
          <button className="action-btn">
            <i className="fas fa-chart-line"></i>
            <span>Performance Analytics</span>
          </button>
        </div>
      </div>

      <div className="recent-activity">
        <h2>Recent Allocations</h2>
        <div className="activity-list">
          {/* This would be populated with actual recent activity data */}
          <div className="activity-item">
            <div className="activity-icon">
              <i className="fas fa-bus"></i>
            </div>
            <div className="activity-details">
              <p>BUS009 assigned to Route 1</p>
              <small>2 minutes ago</small>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="activity-details">
              <p>High demand detected at Anna Salai</p>
              <small>5 minutes ago</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;