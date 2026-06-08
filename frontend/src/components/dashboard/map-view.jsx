import L from 'leaflet';
import { Marker, TileLayer } from 'react-leaflet';

const getSIRProfileColor = (sirProfile) => {
    const profile = (sirProfile || '').toLowerCase();
    const colorMap = {
        resistant: '#7db344',
        intermediate: '#f08c00',
        susceptible: '#e03131',
    };
    return colorMap[profile] || '#999999';
};

const getPredominantSIRProfile = (locationSamples) => {
    if (!locationSamples || locationSamples.length === 0) {
        return 'unknown';
    }

    const profileCounts = {};

    locationSamples.forEach((sample) => {
        const profile = (sample.predicted_sir_profile || 'unknown').toLowerCase();
        profileCounts[profile] = (profileCounts[profile] || 0) + 1;
    });

    const keys = Object.keys(profileCounts);
    if (keys.length === 0) {
        return 'unknown';
    }

    return keys.reduce((a, b) => (profileCounts[a] > profileCounts[b] ? a : b));
};

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

export default function MapView({
    uniqueLocations,
    displayedSamples,
    onMarkerClick,
}) {
    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            {uniqueLocations.map((location) => {
                const locationSamples = displayedSamples.filter(
                    (s) => s.location_name === location.location_name,
                );
                const predominantProfile = getPredominantSIRProfile(locationSamples);
                const markerColor = getSIRProfileColor(predominantProfile);

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
                                const sortedSamples = locationSamples.sort(
                                    (a, b) =>
                                        new Date(b.collection_date) -
                                        new Date(a.collection_date),
                                );
                                onMarkerClick({
                                    location_name: location.location_name,
                                    latitude: location.latitude,
                                    longitude: location.longitude,
                                    samples: sortedSamples,
                                });
                            },
                        }}
                    />
                );
            })}
        </>
    );
}
