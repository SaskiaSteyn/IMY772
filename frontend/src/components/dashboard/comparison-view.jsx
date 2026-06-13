import { ActionIcon, Group } from '@mantine/core';
import { ChevronLeft } from 'lucide-react';
import { useRef } from 'react';
import ComparisonPanel from './comparison-panel';
import './comparison-view.scss';

export default function ComparisonView({
    locations,
    onExit,
    onCloseLocation,
}) {
    if (locations.length !== 2) {
        return null;
    }

    const leftScrollRef = useRef(null);
    const rightScrollRef = useRef(null);

    const handleLeftScroll = () => {
        // When left panel scrolls, sync right panel
        if (leftScrollRef.current && rightScrollRef.current) {
            rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
        }
    };

    const handleRightScroll = () => {
        // When right panel scrolls, sync left panel
        if (rightScrollRef.current && leftScrollRef.current) {
            leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
        }
    };

    const handleCloseLocation = (locationId) => {
        onCloseLocation(locationId);
        // If we're down to 1 location, exit comparison
        if (locations.length <= 2) {
            onExit();
        }
    };

    return (
        <div className='comparison-view-container'>
            {/* Header */}
            <div className='comparison-header'>
                <Group>
                    <ActionIcon
                        variant='subtle'
                        onClick={onExit}
                        size='lg'
                        aria-label='Exit comparison'
                    >
                        <ChevronLeft size={24} />
                    </ActionIcon>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                        Comparing 2 Locations
                    </span>
                </Group>
            </div>

            {/* Comparison panels */}
            <div className='comparison-panels'>
                <div className='comparison-panel-wrapper'>
                    <ComparisonPanel
                        location={locations[0]}
                        scrollRef={leftScrollRef}
                        onScroll={handleLeftScroll}
                        linkedScrollRef={rightScrollRef}
                        onClose={() => handleCloseLocation(locations[0].id)}
                    />
                </div>

                <div className='comparison-divider'></div>

                <div className='comparison-panel-wrapper'>
                    <ComparisonPanel
                        location={locations[1]}
                        scrollRef={rightScrollRef}
                        onScroll={handleRightScroll}
                        linkedScrollRef={leftScrollRef}
                        onClose={() => handleCloseLocation(locations[1].id)}
                    />
                </div>
            </div>
        </div>
    );
}
