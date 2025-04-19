import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaQrcode } from 'react-icons/fa';

const Verify = () => {
    const navigate = useNavigate();
    const [hashedId, setScanresult] = useState(null);
    const [apiResponse, setApiResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner('reader', {
            qrbox: {
                width: 250,
                height: 250,
            },
            fps: 5
        });
        
        scanner.render(succes, error);
        
        function succes(result) {
            setIsLoading(true);
            scanner.clear();
            setScanresult(result);
            Toapi(result);
        }
        
        function error(err) {
            console.warn(err);
        }
        
        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner.", error);
            });
        };
    }, []);

    const Toapi = async (hashedId) => { 
        try {
            const response = await fetch('http://localhost:5000/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hashedId })
            });            
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            const data = await response.json();
            setApiResponse(data);
        } catch (error) {
            console.error('Error sending scan result to API:', error);
            setApiResponse("Error");
        } finally {
            setIsLoading(false);
        }
    }
    
    const getStatusContent = () => {
        if (!apiResponse) return null;

        let icon, title, statusClass;
        
        switch (apiResponse) {
            case "Passenger Boarded":
                icon = <FaCheckCircle className="status-icon" />;
                title = "Boarding Successful";
                statusClass = "status-success";
                break;
            case "Travel completed":
                icon = <FaCheckCircle className="status-icon" />;
                title = "Journey Completed";
                statusClass = "status-success";
                break;
            case "Not Ticket":
                icon = <FaTimesCircle className="status-icon" />;
                title = "Invalid Ticket";
                statusClass = "status-error";
                break;
            case "Ticket already used":
                icon = <FaExclamationTriangle className="status-icon" />;
                title = "Ticket Used";
                statusClass = "status-warning";
                break;
            default:
                icon = <FaExclamationTriangle className="status-icon" />;
                title = "Verification Error";
                statusClass = "status-error";
        }

        return (
            <div className={`status-container ${statusClass}`}>
                {icon}
                <div className="status-title">{title}</div>
                <div className="status-message">{apiResponse}</div>
                <div className="action-buttons">
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        Scan Another Ticket
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="verification-container">
            <div className="verification-header">
                <h1>Ticket Verification</h1>
                <p>Scan passenger QR code to verify ticket</p>
            </div>
            
            {isLoading ? (
                <div className="status-container">
                    <FaQrcode className="status-icon" />
                    <div className="status-title">Verifying Ticket</div>
                    <div className="status-message loading-text">Please wait...</div>
                </div>
            ) : hashedId ? (
                getStatusContent()
            ) : (
                <>
                    <div className="qr-scanner-container">
                        <div id="reader"></div>
                        <div className="scanner-overlay">
                            <div className="scanner-frame">
                                <div className="scanner-corner scanner-corner-tl"></div>
                                <div className="scanner-corner scanner-corner-tr"></div>
                                <div className="scanner-corner scanner-corner-bl"></div>
                                <div className="scanner-corner scanner-corner-br"></div>
                            </div>
                        </div>
                    </div>
                    <p>Position the QR code within the frame to scan</p>
                </>
            )}
        </div>
    );
};

export default Verify;