import { Alert, Button, Stack, Text } from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import LocationCard from './location-card';

export default function LocationList({
    locations,
    selectedLocationIds,
    activeLocationId,
    onToggleSelect,
    onRemove,
    onCompare,
    canCompare,
    onSelectLocation,
    selectionLimitReached,
}) {
    if (locations.length === 0) {
        return null;
    }

    return (
        <div
            className='location-list'
            style={{
                position: 'fixed',
                left: 'calc(var(--sidebar-width, 280px) + 1rem)',
                top: '1rem',
                width: '20rem',
                maxHeight: 'calc(100vh - 2rem)',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '-2px 0 12px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                animation: 'slideIn 0.3s ease-out',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px',
                    borderBottom: '1px solid #e9ecef',
                    flexShrink: 0,
                }}
            >
                <Text fw={600} size='sm'>
                    Open Locations
                </Text>
                {selectedLocationIds.length > 0 && (
                    <Text size='xs' c='dimmed' mt={4}>
                        Selected: {selectedLocationIds.length} / 2
                    </Text>
                )}
            </div>

            {/* Selection limit alert */}
            {selectionLimitReached && (
                <div style={{ padding: '8px 12px', flexShrink: 0 }}>
                    <Alert
                        icon={<AlertCircle size={14} />}
                        color='orange'
                        variant='light'
                        p='xs'
                        styles={{ message: { fontSize: '12px' } }}
                    >
                        Deselect a location before selecting another.
                    </Alert>
                </div>
            )}

            {/* Scrollable list */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                }}
            >
                <Stack gap={0}>
                    {locations.map((location) => (
                        <LocationCard
                            key={location.id}
                            location={location}
                            isSelected={selectedLocationIds.includes(location.id)}
                            isActive={location.id === activeLocationId}
                            onToggleSelect={onToggleSelect}
                            onClose={onRemove}
                            onSelect={onSelectLocation}
                        />
                    ))}
                </Stack>
            </div>

            {/* Compare Button */}
            <div
                style={{
                    padding: '12px',
                    borderTop: '1px solid #e9ecef',
                    flexShrink: 0,
                }}
            >
                <Button
                    fullWidth
                    onClick={onCompare}
                    disabled={!canCompare}
                    title={canCompare ? 'Click to compare locations' : 'Select 2 locations to compare'}
                >
                    Compare
                    {selectedLocationIds.length === 2 ? ' (2)' : ''}
                </Button>
            </div>
        </div>
    );
}
