import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import DashboardNavbar from '../components/dashboard-navbar.jsx';
import './dashboard.scss';

// Fix for default markers not showing in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom circular marker icon
const createCustomIcon = (color = '#52C41A') => {
    return L.divIcon({
        html: `
            <div style="
                width: 18px;
                height: 18px;
                background-color: ${color};
                border-radius: 50%;
                box-shadow: 
                    0 0 0 3px rgba(82, 196, 26, 0.4),
                    0 2px 8px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            "></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        className: 'custom-marker-icon',
    });
};

// Sample locations in South Africa (you can modify these)
const locations = [
    { id: 1, name: 'Johannesburg', lat: -26.2023, lng: 28.0436 },
    { id: 2, name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
    { id: 3, name: 'Durban', lat: -29.8587, lng: 31.0218 },
    { id: 4, name: 'Pretoria', lat: -25.7461, lng: 28.2293 },
    { id: 5, name: 'Bloemfontein', lat: -29.12, lng: 25.5169 },
];

export default function Dashboard() {
    // Center coordinates for South Africa
    const centerCoord = [-30.5, 22.5];

    return (
        <div className='dashboard-container'>
            <DashboardNavbar />
            <div className='map-wrapper'>
                <MapContainer
                    center={centerCoord}
                    zoom={6}
                    scrollWheelZoom={true}
                    className='leaflet-map'
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />
                    {locations.map((location) => (
                        <Marker
                            key={location.id}
                            position={[location.lat, location.lng]}
                            icon={createCustomIcon('#7db344')}
                        >
                            <Popup>
                                <div className='popup-content'>
                                    <h3>{location.name}</h3>
                                    <p>Lat: {location.lat.toFixed(4)}</p>
                                    <p>Lng: {location.lng.toFixed(4)}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
