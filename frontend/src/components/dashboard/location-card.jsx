import { Checkbox, Stack, Text, Title, ActionIcon } from '@mantine/core';
import { X } from 'lucide-react';

export default function LocationCard({
    location,
    isSelected,
    isActive,
    onToggleSelect,
    onClose,
    onSelect,
}) {
    const { location_name, latitude, longitude } = location;

    return (
        <div
            className='location-card'
            onClick={() => onSelect(location.id)}
            style={{
                padding: '12px',
                border: isActive
                    ? '1px solid var(--mantine-primary-color-filled)'
                    : '1px solid #e9ecef',
                borderLeft: isActive
                    ? '3px solid var(--mantine-primary-color-filled)'
                    : '3px solid transparent',
                borderRadius: '6px',
                backgroundColor: isActive
                    ? 'var(--mantine-primary-color-light)'
                    : '#ffffff',
                transition: 'all 0.15s ease',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
            }}
        >
            <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect(location.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ marginTop: '2px', flexShrink: 0 }}
                aria-label={`Select ${location_name} for comparison`}
            />

            <Stack gap={3} style={{ flex: 1, minWidth: 0 }}>
                <Title order={5} style={{ margin: 0, fontSize: '14px' }}>
                    {location_name}
                </Title>
                <Text size='xs' c='dimmed'>
                    {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                </Text>
                <Text size='xs' c='dimmed'>
                    {location.samples?.length || 0} sample{location.samples?.length !== 1 ? 's' : ''}
                </Text>
            </Stack>

            <ActionIcon
                variant='subtle'
                color='gray'
                size='sm'
                onClick={(e) => {
                    e.stopPropagation();
                    onClose(location.id);
                }}
                style={{ flexShrink: 0 }}
                aria-label={`Close ${location_name}`}
            >
                <X size={16} />
            </ActionIcon>
        </div>
    );
}
