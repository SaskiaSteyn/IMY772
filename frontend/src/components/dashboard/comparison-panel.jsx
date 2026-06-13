import { ActionIcon, Stack, Text, Title } from '@mantine/core';
import { X } from 'lucide-react';
import { useRef, useEffect } from 'react';
import DissolvedOxygenChart from '../charts/dissolved-oxygen-chart';
import PHLevelChart from '../charts/ph-level-chart';
import SIRProfileChart from '../charts/sir-profile-chart';
import TDSChart from '../charts/tds-chart';
import WaterTemperatureChart from '../charts/water-temperature-chart';
import SampleAccordion from './sample-accordion';

export default function ComparisonPanel({
    location,
    onClose,
    scrollRef,
    onScroll,
    linkedScrollRef,
}) {
    const internalScrollRef = useRef(null);
    const { location_name, latitude, longitude, samples } = location;
    const sortedSamples = [...samples].sort(
        (a, b) => new Date(a.collection_date) - new Date(b.collection_date),
    );
    const isScrolling = useRef(false);

    // Expose internal scroll ref to parent
    useEffect(() => {
        if (scrollRef) {
            scrollRef.current = internalScrollRef.current;
        }
    }, [scrollRef]);

    // Handle scroll events and sync with linked panel
    useEffect(() => {
        const scrollContainer = internalScrollRef.current;
        if (!scrollContainer) return;

        const handleScroll = () => {
            if (isScrolling.current) return; // Prevent infinite loops

            isScrolling.current = true;

            if (onScroll) {
                onScroll(scrollContainer.scrollTop);
            }

            // Sync with linked panel if provided
            if (linkedScrollRef?.current) {
                linkedScrollRef.current.scrollTop = scrollContainer.scrollTop;
            }

            // Debounce the scroll lock
            setTimeout(() => {
                isScrolling.current = false;
            }, 50);
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [onScroll, linkedScrollRef]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: 'white',
                borderRadius: '0',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px',
                    borderBottom: '1px solid #e9ecef',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}
            >
                <Stack gap={4} style={{ flex: 1 }}>
                    <Title order={3} style={{ margin: 0, fontSize: '18px' }}>
                        {location_name}
                    </Title>
                    <Text size='sm' c='dimmed'>
                        {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                    </Text>
                </Stack>
                <ActionIcon
                    variant='subtle'
                    color='gray'
                    size='lg'
                    onClick={onClose}
                    aria-label={`Close ${location_name}`}
                >
                    <X size={20} />
                </ActionIcon>
            </div>

            {/* Scrollable content */}
            <div
                ref={internalScrollRef}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                }}
            >
                <Stack gap='lg'>
                    <WaterTemperatureChart samples={sortedSamples} />
                    <PHLevelChart samples={sortedSamples} />
                    <TDSChart samples={sortedSamples} />
                    <DissolvedOxygenChart samples={sortedSamples} />
                    <SIRProfileChart samples={sortedSamples} />
                    <SampleAccordion samples={sortedSamples} />
                </Stack>
            </div>
        </div>
    );
}
