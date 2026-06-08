import { Button } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import SamplePanel from './sample-panel';

// When inside the comparison container, the panel fills its flex wrapper
// rather than using its own fixed positioning.
const panelStyle = {
    position: 'relative',
    right: 'auto',
    left: 'auto',
    top: 'auto',
    bottom: 'auto',
    width: '100%',
    height: '100%',
    animation: 'none',
    zIndex: 'auto',
};

export default function ComparisonOverlay({ locations, onClosePanel, onExit }) {
    if (locations.length !== 2) return null;

    return (
        <div
            style={{
                position: 'fixed',
                right: '1rem',
                top: '1rem',
                bottom: '1rem',
                width: 'calc(30rem + 2rem + 30rem)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 100,
                pointerEvents: 'none',
            }}
        >
            {/* Toolbar — button left-aligned with the left panel */}
            <div style={{ flexShrink: 0, pointerEvents: 'all' }}>
                <Button
                    leftSection={<ArrowLeft size={16} />}
                    onClick={onExit}
                >
                    Back to Dashboard
                </Button>
            </div>

            {/* Panel row */}
            <div
                style={{
                    display: 'flex',
                    gap: '2rem',
                    flex: 1,
                    minHeight: 0,
                    pointerEvents: 'none',
                }}
            >
                <div style={{ flex: '0 0 30rem', height: '100%', pointerEvents: 'all' }}>
                    <SamplePanel
                        locationData={locations[0]}
                        onClose={() => onClosePanel(locations[0].id)}
                        style={panelStyle}
                    />
                </div>
                <div style={{ flex: '0 0 30rem', height: '100%', pointerEvents: 'all' }}>
                    <SamplePanel
                        locationData={locations[1]}
                        onClose={() => onClosePanel(locations[1].id)}
                        style={panelStyle}
                    />
                </div>
            </div>
        </div>
    );
}
