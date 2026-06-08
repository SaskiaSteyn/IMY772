import { useState } from 'react';

export const useComparisonState = () => {
    const [openLocations, setOpenLocations] = useState([]);
    const [activeLocationId, setActiveLocationId] = useState(null);
    const [selectedLocationIds, setSelectedLocationIds] = useState([]);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [preComparisonActiveId, setPreComparisonActiveId] = useState(null);
    const [selectionLimitReached, setSelectionLimitReached] = useState(false);

    const addOpenLocation = (location) => {
        const id = `${location.location_name}-${location.latitude}-${location.longitude}`;
        setOpenLocations((prev) => {
            if (prev.some((l) => l.id === id)) return prev;
            return [...prev, { ...location, id }];
        });
        setActiveLocationId(id);
    };

    const removeOpenLocation = (id) => {
        const remaining = openLocations.filter((l) => l.id !== id);
        setOpenLocations(remaining);
        setSelectedLocationIds((prev) => prev.filter((locId) => locId !== id));
        setComparisonMode(false);
        setPreComparisonActiveId(null);
        setActiveLocationId((prev) =>
            prev === id
                ? remaining.length > 0
                    ? remaining[remaining.length - 1].id
                    : null
                : prev,
        );
    };

    const setActiveLocation = (id) => {
        setActiveLocationId(id);
    };

    const getActiveLocation = () => {
        return openLocations.find((l) => l.id === activeLocationId) || null;
    };

    const toggleLocationSelection = (id) => {
        setSelectedLocationIds((prev) => {
            const isSelected = prev.includes(id);
            if (isSelected) {
                return prev.filter((locId) => locId !== id);
            }
            if (prev.length >= 2) {
                // Hard limit — do not replace, just signal the user
                setSelectionLimitReached(true);
                setTimeout(() => setSelectionLimitReached(false), 3000);
                return prev;
            }
            return [...prev, id];
        });
    };

    const startComparison = () => {
        if (selectedLocationIds.length === 2) {
            setPreComparisonActiveId(activeLocationId);
            setComparisonMode(true);
        }
    };

    const exitComparison = () => {
        setComparisonMode(false);
        setSelectedLocationIds([]);
        // Restore the location that was active before comparison started
        if (preComparisonActiveId) {
            const stillOpen = openLocations.some((l) => l.id === preComparisonActiveId);
            setActiveLocationId(
                stillOpen
                    ? preComparisonActiveId
                    : openLocations.length > 0
                    ? openLocations[openLocations.length - 1].id
                    : null,
            );
        }
        setPreComparisonActiveId(null);
    };

    const getSelectedLocations = () => {
        return openLocations.filter((loc) => selectedLocationIds.includes(loc.id));
    };

    const canCompare = selectedLocationIds.length === 2;

    return {
        openLocations,
        activeLocationId,
        comparisonMode,
        selectedLocationIds,
        selectionLimitReached,
        addOpenLocation,
        removeOpenLocation,
        setActiveLocation,
        getActiveLocation,
        toggleLocationSelection,
        startComparison,
        exitComparison,
        getSelectedLocations,
        canCompare,
    };
};
