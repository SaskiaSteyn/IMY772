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
        const newLoc = { ...location, id };

        // Already open — just switch focus
        if (openLocations.some((l) => l.id === id)) {
            setActiveLocationId(id);
            return;
        }

        if (openLocations.length === 0) {
            // First location: open single panel
            setOpenLocations([newLoc]);
            setActiveLocationId(id);
        } else if (openLocations.length === 1) {
            // Second location: auto-enter comparison immediately
            const first = openLocations[0];
            setOpenLocations([first, newLoc]);
            setSelectedLocationIds([first.id, id]);
            setPreComparisonActiveId(first.id);
            setActiveLocationId(id);
            setComparisonMode(true);
        } else {
            // Third+ location: replace the second panel
            setOpenLocations((prev) => [prev[0], newLoc]);
            setSelectedLocationIds((prev) => [prev[0], id]);
            setActiveLocationId(id);
        }
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

    const closeAll = () => {
        setOpenLocations([]);
        setActiveLocationId(null);
        setSelectedLocationIds([]);
        setComparisonMode(false);
        setPreComparisonActiveId(null);
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
        closeAll,
        canCompare,
    };
};
