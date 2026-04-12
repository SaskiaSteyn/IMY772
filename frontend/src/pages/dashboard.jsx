import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import DashboardNavbar from '../components/dashboard/dashboard-navbar.jsx';
import SamplePanel from '../components/dashboard/sample-panel.jsx';
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
const createCustomIcon = (color = '#52C41A', isSelected = false) => {
    const size = isSelected ? 26 : 18;
    const anchor = isSelected ? 18 : 12;

    return L.divIcon({
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background-color: ${color};
                border-radius: 50%;
                ${isSelected ? `border: 3px solid #1890ff;` : ''}
                box-shadow: 
                    0 0 0 3px rgba(125, 179, 68, 0.4),
                    ${isSelected ? '0 0 0 8px rgba(24, 144, 255, 0.2),' : ''}
                    0 2px 8px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
        popupAnchor: [0, -anchor],
        className: 'custom-marker-icon',
    });
};

export default function Dashboard() {
    const [samples, setSamples] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedLocationSamples, setSelectedLocationSamples] =
        useState(null);

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

    // Get unique locations (one per location_name + coordinates)
    const uniqueLocations = samples.reduce((acc, sample) => {
        const exists = acc.some(
            (loc) =>
                loc.location_name === sample.location_name &&
                parseFloat(loc.latitude) === parseFloat(sample.latitude) &&
                parseFloat(loc.longitude) === parseFloat(sample.longitude),
        );
        if (!exists) {
            acc.push({
                location_name: sample.location_name,
                latitude: sample.latitude,
                longitude: sample.longitude,
            });
        }
        return acc;
    }, []);

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
                    {uniqueLocations.map((location) => {
                        const isSelected =
                            selectedLocationSamples?.location_name ===
                            location.location_name;
                        return (
                            <Marker
                                key={`${location.location_name}-${location.latitude}-${location.longitude}`}
                                position={[
                                    parseFloat(location.latitude),
                                    parseFloat(location.longitude),
                                ]}
                                icon={createCustomIcon('#7db344', isSelected)}
                                eventHandlers={{
                                    click: () => {
                                        const locationSamples = samples
                                            .filter(
                                                (s) =>
                                                    s.location_name ===
                                                    location.location_name,
                                            )
                                            .sort(
                                                (a, b) =>
                                                    new Date(
                                                        b.collection_date,
                                                    ) -
                                                    new Date(a.collection_date),
                                            );
                                        setSelectedLocationSamples({
                                            location_name:
                                                location.location_name,
                                            latitude: location.latitude,
                                            longitude: location.longitude,
                                            samples: locationSamples,
                                        });
                                    },
                                }}
                            />
                        );
                    })}
                </MapContainer>
            </div>

            <SamplePanel
                locationData={selectedLocationSamples}
                onClose={() => setSelectedLocationSamples(null)}
            />
        </div>
    );
}
