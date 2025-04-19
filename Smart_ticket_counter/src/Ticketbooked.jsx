import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Ticketbooked = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { qrCode, source, destination, routeno } = location.state || {};
    
    // Format current date and time in Chennai style
    const now = new Date();
    const bookingDate = now.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    const bookingTime = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div className="mtc-ticket-confirmation">
            <div className="mtc-confirmation-header">
                <div className="mtc-success-animation">
                    <div className="mtc-logo">
                        <span className="mtc-logo-red">MTC</span>
                        <span className="mtc-logo-blue">CHENNAI</span>
                    </div>
                    <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle className="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path className="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                    <h1>Ticket Booked Successfully!</h1>
                </div>
                <p className="mtc-confirmation-subtext">Your MTC bus ticket is ready</p>
            </div>

            <div className="mtc-ticket-card">
                <div className="mtc-ticket-header">
                    <h2>MTC E-Ticket</h2>
                    <div className="mtc-ticket-meta">
                        <span className="mtc-booking-date">{bookingDate}</span>
                        <span className="mtc-booking-time">{bookingTime}</span>
                    </div>
                </div>

                <div className="mtc-ticket-body">
                    <div className="mtc-route-details">
                        <div className="mtc-route-stop">
                            <span className="mtc-stop-label">From:</span>
                            <span className="mtc-stop-value">{source || 'Not specified'}</span>
                        </div>
                        <div className="mtc-route-stop">
                            <span className="mtc-stop-label">To:</span>
                            <span className="mtc-stop-value">{destination || 'Not specified'}</span>
                        </div>
                        {routeno && (
                            <div className="mtc-route-number">
                                <span>Route No:</span>
                                <strong>{routeno}</strong>
                            </div>
                        )}
                    </div>

                    {qrCode ? (
                        <div className="mtc-qr-container">
                            <img src={qrCode} alt="MTC Ticket QR Code" className="mtc-qr-code" />
                            <p className="mtc-scan-instruction">Show this QR code to the conductor</p>
                        </div>
                    ) : (
                        <div className="mtc-no-qr">
                            <p>Ticket reference will be sent to your registered mobile</p>
                        </div>
                    )}

                    <div className="mtc-ticket-terms">
                        <div className="mtc-term">
                            <span>✓</span> Valid for one journey only
                        </div>
                        <div className="mtc-term">
                            <span>✓</span> Non-transferable
                        </div>
                        <div className="mtc-term">
                            <span>✓</span> Valid ID proof required
                        </div>
                    </div>
                </div>

                <div className="mtc-ticket-footer">
                    <p>For queries contact: <strong>044-23455858</strong></p>
                </div>
            </div>

            <div className="mtc-action-buttons">
                <button 
                    className="mtc-print-btn"
                    onClick={() => window.print()}
                >
                    <span className="printer-icon">🖨️</span> Print Ticket
                </button>
                <button 
                    className="mtc-home-btn"
                    onClick={() => navigate('/')}
                >
                    Book Another Ticket
                </button>
            </div>

            <div className="mtc-customer-care">
                <p>Happy Journey! 🚌</p>
                <small>MTC Customer Care: 044-23455858 (6AM-10PM)</small>
            </div>
        </div>
    );
};

export default Ticketbooked;