import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBus, FaMapMarkerAlt, FaTicketAlt, FaRupeeSign } from "react-icons/fa";
import './Counter.css'

const Counter = () => {
    const navigate = useNavigate();

    const routes = {
        route1: { 
            name: "Chennai central to Panangal park", 
            stops: ["General Hospital Road, Evening Bazaar", "EVR Periyar Salai, Periamet, Ward 58", "EVR Periyar Salai, Periamet", "Gandhi Irwin Road", "Whannels Road", "Sacred Heart Shrine", "Pantheon Road 1", "Pantheon Road 2", "Pantheon Road 3", "College Road", "Sankara Nethralaya", "Sankara Nethralaya, College Road", "Haddows Road", "Uttamar Gandhi Salai", "Uttamar Gandhi Salai 2", "Valluvar Kottam High Road, Ward 110", "Valluvar Kottam High Road, Mahalingapuram", "Valluvar Kottam", "Valluvar Kottam High Road stop 2", "Thirumalai Road", "Sree Tantric Astrology", "North Usman Road"],
            routeno: 1,
            fare: "₹25",
            mapUrl: "https://maps.google.com/maps?q=Thiruvanmiyur+to+Koyambedu&output=embed"
        },
        route2: { 
            name: "Chennai central to Royapettah", 
            stops: ["General Hospital Road", "Tamil Nadu Government Multi Super Speciality Hospital MOUNT Road", "Anna Salai (Mount Road)", "General Patters Road", "Royapuram", "Royapuram stop 2", "(AMMK) Party Headquarters", "Peters Road"],
            routeno: 2,
            fare: "₹20",
            mapUrl: "https://maps.google.com/maps?q=Thiruvanmiyur+to+T.Nagar&output=embed"
        },
        route3: { 
            name: "Chennai central to Vysarpadi", 
            stops: ["General Hospital Road", "Platform 2A / 3", "Wall Tax Road 1", "Wall Tax Road 2", "Wall Tax Road 3", "Wall Tax Road 4", "Wall Tax Road 5", "Basin Bridge", "Erukkancheri High Road 1", "Erukkancheri High Road 2", "Erukkancheri High Road 3", "Moorthinagar Street", "Erukkancheri High Road 4"],
            routeno: 3,
            fare: "₹30",
            mapUrl: "https://maps.google.com/maps?q=Thiruvanmiyur+to+Broadway&output=embed"
        },
        route4: { 
            name: "Royapettah to Kodambakam", 
            stops: ["The New College", "Sacred Heart Matric 1", "Sacred Heart Matric 2", "Sacred Heart Matric 3", "Oxford University Press", "Uttamar Gandhi Salai", "The Spring Hotel", "Doctor M.G.R. Salai", "The Spring Hotel", "Doctor M.G.R. Salai", "Dr MGR Salai 1", "Dr MGR Salai 2", "Dr MGR Salai 3", "Mamabalam Highway", "Bank of Baroda"],
            routeno: 4,
            fare: "₹30",
            mapUrl: "https://maps.google.com/maps?q=Thiruvanmiyur+to+Broadway&output=embed"
        },
        route5: { 
            name: "Kodambakkam to Koyambedu", 
            stops: ["Dr Ambedkar Road", "Jawaharlal Nehru Road (100 Feet Road)", "Jawaharlal Nehru Road (100 Feet Road) stop 2", "Jawaharlal Nehru Road ward 127", "Jawaharlal Nehru Road ward 127 2", "Kaliamman Koil Street", "Kaliamman Koil Street stop 2", "CMWSSB Division 127", "Ward 145, Zone 11 Valasaravakkam", "CMWSSB Division 127 stop 2", "CMWSSB Division 127 stop 3"],
            routeno: 5,
            fare: "₹10 to 30",
            mapUrl: "https://maps.google.com/maps?q=Thiruvanmiyur+to+Broadway&output=embed"
        }
    };

    const [selectedRoute, setSelectedRoute] = useState(null);
    const [source, setSource] = useState(null);
    const [destination, setDestination] = useState(null);
    const [passengerCount, setPassengerCount] = useState(1);
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');

    const handleRouteSelect = (routeKey) => {
        setSelectedRoute(routeKey);
        setCurrentStep(2);
        setError('');
    };

    const handleSourceSelect = (stop) => {
        setSource(stop);
        setCurrentStep(3);
        setError('');
    };

    const handleDestinationSelect = (stop) => {
        if (routes[selectedRoute].stops.indexOf(stop) <= routes[selectedRoute].stops.indexOf(source)) {
            setError('Destination must be after the boarding point');
            return;
        }
        setDestination(stop);
        setCurrentStep(4);
        setError('');
    };

    const handlePassengerChange = (e) => {
        const count = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
        setPassengerCount(count);
    };

    const handleBookTicket = async () => {
        try {
            const selectedRouteData = routes[selectedRoute];
            const stopnumber = selectedRouteData.stops.indexOf(source)+1;
            const destinationstopnumber = selectedRouteData.stops.indexOf(destination)-1;
            
            const response = await axios.post("http://localhost:5000/counter", { 
                source, 
                destination,
                routenumber: selectedRouteData.routeno,
                stopnumber ,
                destinationstopnumber,
                passengercount: passengerCount,
                onbstats: false,
                deonbstats: false
            });
            
            navigate("/ticketbooked", { 
                state: { 
                    qrCode: response.data.qrCode,
                    source,
                    destination,
                    routenumber: selectedRouteData.routeno,
                    stopnumber,
                    destinationstopnumber
                } 
            });
        } catch (error) {
            console.error("Booking error:", error);
            setError('Failed to book ticket. Please try again.');
        }
    };

    return (

        <div className="wholecont"> 
        <div className="mtc-counter-container">
            <div className="mtc-counter-header">
                <div className="mtc-logo">
                    <span className="mtc-logo-red">MTC</span>
                    <span className="mtc-logo-blue">CHENNAI</span>
                </div>
                <h1><FaBus /> Bus Ticket Counter</h1>
            </div>

            <div className="mtc-booking-steps">
                {[1, 2, 3, 4].map(step => (
                    <div key={step} className={`step ${currentStep >= step ? 'active' : ''}`}>
                        <div className="step-number">{step}</div>
                        <div className="step-label">
                            {['Select Route', 'Boarding Point', 'Destination', 'Book Ticket'][step - 1]}
                        </div>
                    </div>
                ))}
            </div>

            {error && <div className="mtc-error-message">{error}</div>}

            <div className="mtc-booking-container">
                {currentStep === 1 && (
                    <div className="mtc-route-selection">
                        <h2><FaBus /> Select Your Bus Route</h2>
                        <div className="mtc-route-options">
                            {Object.keys(routes).map((routeKey) => (
                                <div 
                                    key={routeKey}
                                    className={`mtc-route-option ${selectedRoute === routeKey ? 'selected' : ''}`}
                                    onClick={() => handleRouteSelect(routeKey)}
                                >
                                    <h3>{routes[routeKey].name}</h3>
                                    <p><FaTicketAlt /> {routes[routeKey].fare} <FaRupeeSign /></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {currentStep === 2 && selectedRoute && (
                    <div className="mtc-stop-selection">
                        <h2><FaMapMarkerAlt /> Select Boarding Point</h2>
                        <ul>
                            {routes[selectedRoute].stops.map((stop, idx) => (
                                <li key={idx} onClick={() => handleSourceSelect(stop)}>{stop}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {currentStep === 3 && selectedRoute && source && (
                    <div className="mtc-stop-selection">
                        <h2><FaMapMarkerAlt /> Select Destination</h2>
                        <ul>
                            {routes[selectedRoute].stops.slice(routes[selectedRoute].stops.indexOf(source) + 1).map((stop, idx) => (
                                <li key={idx} onClick={() => handleDestinationSelect(stop)}>{stop}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="mtc-book-ticket">
                        <h2><FaTicketAlt /> Booking Details</h2>
                        <p><strong>Route:</strong> {routes[selectedRoute].name}</p>
                        <p><strong>From:</strong> {source}</p>
                        <p><strong>To:</strong> {destination}</p>
                        <p><strong>Route Number:</strong> {routes[selectedRoute].routeno}</p>
                        <label>
                            Passenger Count (1-10):
                            <input 
                                type="number" 
                                value={passengerCount} 
                                onChange={handlePassengerChange} 
                                min="1" 
                                max="10" 
                            />
                        </label>
                        
                        <button onClick={handleBookTicket}>Book Ticket</button>
                    </div>
                )}
            </div>
        </div>

        </div>
    );
};

export default Counter;