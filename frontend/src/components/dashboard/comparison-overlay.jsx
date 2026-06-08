import { useRef, useCallback } from 'react';
import SamplePanel from './sample-panel';

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

export default function ComparisonOverlay({ locations, onClosePanel }) {
    if (locations.length !== 2) return null;

    const leftRef = useRef(null);
    const rightRef = useRef(null);
    const isSyncing = useRef(false);

    const syncScroll = useCallback((source, target) => {
        if (isSyncing.current) return;
        if (!source.current || !target.current) return;
        isSyncing.current = true;
        target.current.scrollTop = source.current.scrollTop;
        isSyncing.current = false;
    }, []);

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
                zIndex: 100,
                pointerEvents: 'none',
            }}
        >
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
                        locationData={locations[1]}
                        onClose={() => onClosePanel(locations[1].id)}
                        style={panelStyle}
                        scrollRef={leftRef}
                        onScroll={() => syncScroll(leftRef, rightRef)}
                    />
                </div>
                <div style={{ flex: '0 0 30rem', height: '100%', pointerEvents: 'all' }}>
                    <SamplePanel
                        locationData={locations[0]}
                        onClose={() => onClosePanel(locations[0].id)}
                        style={panelStyle}
                        scrollRef={rightRef}
                        onScroll={() => syncScroll(rightRef, leftRef)}
                    />
                </div>
            </div>
        </div>
    );
}
