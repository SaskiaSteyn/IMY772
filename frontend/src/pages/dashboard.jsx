import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import DashboardNavbar from '../components/dashboard/dashboard-navbar.jsx';
import SamplePanel from '../components/dashboard/sample-panel.jsx';
import ComparisonOverlay from '../components/dashboard/comparison-overlay.jsx';
import { AskAiBar } from '../components/dashboard/ask-ai-bar.jsx';
import { useAiFilter } from '../hooks/useAiFilter.js';
import { useAuth } from '../context/auth-context.jsx';
import { useComparisonState } from '../hooks/useComparisonState.js';
import { fetchAllSamples } from '../api/sample-data-management.js';
import './dashboard.scss';

// Map SIR profile to color
const getSIRProfileColor = (sirProfile) => {
    const profile = (sirProfile || '').toLowerCase();
    const colorMap = {
        resistant: '#e03131',
        intermediate: '#f08c00',
        susceptible: '#7db344',
    };
    return colorMap[profile] || '#999999';
};

// Get the predominant SIR profile for a location
const getPredominantSIRProfile = (locationSamples) => {
    if (!locationSamples || locationSamples.length === 0) {
        return 'unknown';
    }

    const profileCounts = {};

    locationSamples.forEach((sample) => {
        const profile = (
            sample.predicted_sir_profile || 'unknown'
        ).toLowerCase();
        profileCounts[profile] = (profileCounts[profile] || 0) + 1;
    });

    const keys = Object.keys(profileCounts);
    if (keys.length === 0) {
        return 'unknown';
    }

    return keys.reduce((a, b) => (profileCounts[a] > profileCounts[b] ? a : b));
};

// Create custom circular marker icon
const createCustomIcon = (color = '#52C41A', isSelected = false) => {
    const size = isSelected ? 26 : 18;
    const anchor = isSelected ? 18 : 12;

    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return L.divIcon({
        html: `
            <div style="
                width: ${size}px;
                height: ${size}px;
                background-color: ${color};
                border-radius: 50%;
                ${isSelected ? `border: 3px solid #1890ff;` : ''}
                box-shadow:
                    0 0 0 3px ${hexToRgba(color, 0.4)},
                    ${isSelected ? '0 0 0 8px rgba(24, 144, 255, 0.2),' : ''}
                    0 2px 8px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            "></div>`,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
        popupAnchor: [0, -anchor],
        className: `custom-marker-icon-${color.replace('#', '')}`,
        bubblingMouseEvents: false,
    });
};

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

export default function Dashboard() {
    const [samples, setSamples] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    const aiFilter = useAiFilter();
    const displayedSamples =
        aiFilter.filters.length > 0
            ? aiFilter.applyFiltersToSamples(samples, aiFilter.filters)
            : samples;

    // Comparison state management
    const comparison = useComparisonState();

    const [retryCount, setRetryCount] = useState(0);
    const RETRY_INTERVAL_MS = 5000;

    // Fetch samples from the API, auto-retrying while the server is waking up
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        fetchAllSamples(controller.signal)
            .then((data) => {
                setSamples(data);
                setError(null);
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    console.error('Error fetching samples:', err);
                    setError(err.message);
                    const timer = setTimeout(() => {
                        setRetryCount((c) => c + 1);
                    }, RETRY_INTERVAL_MS);
                    return () => clearTimeout(timer);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [retryCount]);

    // Center coordinates for South Africa
    const centerCoord = [-30.5, 22.5];

    // Get unique locations (one per location_name + coordinates)
    const uniqueLocations = displayedSamples.reduce((acc, sample) => {
        const lat = parseFloat(sample.latitude)
        const lon = parseFloat(sample.longitude)
        if (isNaN(lat) || isNaN(lon)) return acc
        const exists = acc.some(
            (loc) =>
                loc.location_name === sample.location_name &&
                parseFloat(loc.latitude) === lat &&
                parseFloat(loc.longitude) === lon,
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

    const handleMarkerClick = (locationData) => {
        // addOpenLocation also sets this as the active location
        comparison.addOpenLocation(locationData);
    };

    const handleLocationCardClose = (id) => {
        // removeOpenLocation cleans all state for this location and auto-promotes remaining
        comparison.removeOpenLocation(id);
    };

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
                <div className='server-waking-up'>
                    <div className='server-waking-up__card'>
                        <div className='server-waking-up__spinner' />
                        <h2 className='server-waking-up__title'>
                            Server is waking up
                        </h2>
                        <p className='server-waking-up__body'>
                            The server may be starting up after a period of
                            inactivity. This usually takes under a minute.
                        </p>
                        <span className='server-waking-up__badge'>
                            Retrying automatically
                        </span>
                    </div>
                </div>
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
                        const locationSamples = displayedSamples.filter(
                            (s) => s.location_name === location.location_name,
                        );
                        const predominantProfile =
                            getPredominantSIRProfile(locationSamples);
                        const markerColor =
                            getSIRProfileColor(predominantProfile);

                        return (
                            <Marker
                                key={`${location.location_name}-${location.latitude}-${location.longitude}-${markerColor}`}
                                position={[
                                    parseFloat(location.latitude),
                                    parseFloat(location.longitude),
                                ]}
                                icon={createCustomIcon(markerColor, false)}
                                eventHandlers={{
                                    click: () => {
                                        const sortedSamples =
                                            locationSamples.sort(
                                                (a, b) =>
                                                    new Date(
                                                        b.collection_date,
                                                    ) -
                                                    new Date(a.collection_date),
                                            );
                                        handleMarkerClick({
                                            location_name:
                                                location.location_name,
                                            latitude: location.latitude,
                                            longitude: location.longitude,
                                            samples: sortedSamples,
                                        });
                                    },
                                }}
                            />
                        );
                    })}
                </MapContainer>
            </div>

            <div
                className={`ai-float${comparison.comparisonMode ? ' ai-float--side' : ''}`}
            >
                <AskAiBar
                    query={aiFilter.query}
                    setQuery={aiFilter.setQuery}
                    filters={aiFilter.filters}
                    loading={aiFilter.loading}
                    error={aiFilter.error}
                    onApply={() => {
                        comparison.closeAll();
                        aiFilter.applyFilter();
                    }}
                    onClear={aiFilter.clearFilter}
                    totalCount={samples.length}
                    filteredCount={displayedSamples.length}
                    appliedQuery={aiFilter.appliedQuery}
                    side={comparison.comparisonMode}
                />
            </div>

            {/* Single location panel */}
            {!comparison.comparisonMode && comparison.getActiveLocation() && (
                <SamplePanel
                    locationData={comparison.getActiveLocation()}
                    onClose={() =>
                        handleLocationCardClose(comparison.activeLocationId)
                    }
                    showCompareHint
                />
            )}

            {/* Comparison mode: two panels side-by-side */}
            {comparison.comparisonMode && (
                <ComparisonOverlay
                    locations={comparison.getSelectedLocations()}
                    onClosePanel={handleLocationCardClose}
                />
            )}
        </div>
    );
}
