import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
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

export default function Dashboard() {
    const [samples, setSamples] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch samples from the API
    useEffect(() => {
        const fetchSamples = async () => {
            try {
                setLoading(true);
                const response = await fetch(
                    'http://localhost:3000/api/samples',
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                    },
                );

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error(
                        'Server response:',
                        response.status,
                        errorData,
                    );
                    throw new Error(`HTTP ${response.status}: ${errorData}`);
                }

                const data = await response.json();
                setSamples(data.samples || []);
            } catch (err) {
                console.error('Error fetching samples:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSamples();
    }, []);

    // Center coordinates for South Africa
    const centerCoord = [-30.5, 22.5];

    if (loading) {
        return (
            <div className='dashboard-container'>
                <DashboardNavbar />
                <div className='loading'>Loading map data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='dashboard-container'>
                <DashboardNavbar />
                <div className='error'>Error loading samples: {error}</div>
            </div>
        );
    }

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
                    {samples.map((sample) => (
                        <Marker
                            key={sample.sampleID}
                            position={[
                                parseFloat(sample.latitude),
                                parseFloat(sample.longitude),
                            ]}
                            icon={createCustomIcon('#7db344')}
                        >
                            <Popup>
                                <div className='popup-content'>
                                    <h3>{sample.location_name}</h3>
                                    <p>
                                        <strong>Sample ID:</strong>{' '}
                                        {sample.sampleID}
                                    </p>
                                    <p>
                                        <strong>Analysis Type:</strong>{' '}
                                        {sample.sample_analysis_type || 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Collection Date:</strong>{' '}
                                        {sample.collection_date
                                            ? new Date(
                                                  sample.collection_date,
                                              ).toLocaleDateString()
                                            : 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Collected By:</strong>{' '}
                                        {sample.collected_by || 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Water Temperature:</strong>{' '}
                                        {sample.water_temperature || 'N/A'}°C
                                    </p>
                                    <p>
                                        <strong>pH:</strong>{' '}
                                        {sample.ph || 'N/A'}
                                    </p>
                                    <p>
                                        <strong>Lat:</strong>{' '}
                                        {parseFloat(sample.latitude).toFixed(4)}
                                    </p>
                                    <p>
                                        <strong>Lng:</strong>{' '}
                                        {parseFloat(sample.longitude).toFixed(
                                            4,
                                        )}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}
