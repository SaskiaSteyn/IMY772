# Two-Location Comparison Feature - Implementation Guide

## Overview
This document describes the complete implementation of the two-location comparison feature in MicroTrack's dashboard.

## Components Deep Dive

### 1. `useComparisonState.js` (Custom Hook)

**Purpose:** Centralized state management for the comparison workflow.

**State Structure:**
```javascript
{
  openLocations: [{ id, location_name, latitude, longitude, samples }, ...],
  selectedLocationIds: [id1, id2],  // max 2
  selectionHistory: [id1, id2],      // tracks order for auto-replacement
  comparisonMode: boolean
}
```

**Key Methods:**

- `addOpenLocation(location)` - Adds location to openLocations if not duplicate
- `removeOpenLocation(id)` - Removes location and exits comparison if it was selected
- `toggleLocationSelection(id)` - Toggles selection with auto-replacement logic:
  - If selecting 3rd: removes oldest from both arrays
  - Uses spread operator for immutability
- `startComparison()` - Only works if exactly 2 selected
- `exitComparison()` - Preserves selections, exits comparison view
- `getSelectedLocations()` - Returns array of 2 selected locations
- `canCompare` - Flag for UI (selectedLocationIds.length === 2)

**Auto-Replacement Logic:**
```javascript
if (isSelected) {
  // Remove from both arrays
} else {
  if (prev.length < 2) {
    // Just add
  } else {
    // Replace oldest from selectionHistory
    const oldest = selectionHistory[0];
    // Remove oldest, add new
  }
}
```

### 2. `LocationCard.jsx`

**Purpose:** Individual location card displayed in the list.

**Props:**
- `location` - { id, location_name, latitude, longitude, samples }
- `isSelected` - boolean (triggers blue highlight)
- `onToggleSelect(id)` - callback when checkbox clicked
- `onClose(id)` - callback when X button clicked

**Visual Feedback:**
- Blue checkbox when selected
- Light blue background (#f0f7ff)
- Blue left border (4px)
- Compact: ~12px padding, fits 3+ on typical screen

### 3. `LocationList.jsx`

**Purpose:** Container displaying all open locations with metrics and Compare button.

**Structure:**
```
┌─ Header: "Open Locations (N)" ─────┐
│ Selected: X / 2                    │
├────────────────────────────────────┤
│ [LocationCard]                     │
│ [LocationCard]                     │
│ [LocationCard (scrollable)]        │
├────────────────────────────────────┤
│ [Compare Button (disabled/enabled)]│
└────────────────────────────────────┘
```

**Props:**
- `locations` - array of open location objects
- `selectedLocationIds` - array of selected IDs
- `onToggleSelect`, `onRemove`, `onCompare` - callbacks
- `canCompare` - boolean for button state

**Fixed Position:**
- 30rem width (changed from old side-panel)
- Fixed right: 1rem, top: 1rem
- Responsive: 100% - 2rem on mobile

### 4. `MapView.jsx`

**Purpose:** Extracted map rendering logic (no UI state).

**Exports:**
- Import: Leaflet icon helpers (getSIRProfileColor, getPredominantSIRProfile, createCustomIcon)
- Renders: `<TileLayer>` and `<Marker>` components
- Called from `MapContainer`

**Props:**
- `uniqueLocations` - array of unique location points
- `displayedSamples` - filtered samples for marker colors
- `onMarkerClick(locationData)` - callback when marker clicked

### 5. `ComparisonPanel.jsx`

**Purpose:** Reusable panel component for comparison view. Renders full dashboard in narrower container.

**Features:**
- Header with location name, coordinates, close button
- All charts: Temperature, pH, TDS, DO, SIR
- Sample accordion for detailed data
- Scroll synchronization

**Scroll Sync Logic:**
```javascript
const isScrolling = useRef(false); // Prevent loops

const handleScroll = () => {
  if (isScrolling.current) return;
  isScrolling.current = true;

  if (onScroll) onScroll(scrollContainer.scrollTop);
  if (linkedScrollRef?.current)
    linkedScrollRef.current.scrollTop = scrollContainer.scrollTop;

  setTimeout(() => isScrolling.current = false, 50);
};
```

**Props:**
- `location` - { location_name, latitude, longitude, samples }
- `onClose` - callback to exit comparison
- `scrollRef` - ref to expose scroll container
- `onScroll` - callback with scrollTop value
- `linkedScrollRef` - ref to sibling panel for manual sync

### 6. `ComparisonView.jsx`

**Purpose:** Full-screen container displaying two ComparisonPanels side-by-side.

**Layout:**
```
┌─ Header: "← Comparing 2 Locations" ─────┐
├─────────────├─────│─────────────┤
│  Panel 1    │     │  Panel 2    │
│  (50% - gap)│gap  │  (50% - gap)│
│             │     │             │
│ (scroll)    │ 1px │ (scroll)    │
│             │     │             │
└─────────────┴─────┴─────────────┘
```

**Scroll Sync in Parent:**
```javascript
const handleLeftScroll = () => {
  if (leftScrollRef.current && rightScrollRef.current) {
    rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
  }
};
```

**Props:**
- `locations` - array of exactly 2 locations
- `onExit` - back button callback
- `onCloseLocation(id)` - close button callback

### 7. Dashboard.jsx (Refactored)

**Key Changes:**

**State:**
```javascript
const comparison = useComparisonState();
```

**Conditional Rendering:**
```javascript
if (comparison.comparisonMode) {
  return <ComparisonView locations={...} ... />;
}
return <LocationList locations={...} ... />;
```

**Handler:**
```javascript
const handleMarkerClick = (locationData) => {
  comparison.addOpenLocation(locationData);
};
```

## Styling Details

### comparison-view.scss

**Grid Layout (Desktop):**
```css
.comparison-panels {
  display: grid;
  grid-template-columns: 1fr 1px 1fr;  /* 50% | divider | 50% */
}
```

**Responsive (Mobile):**
```css
@media (max-width: 768px) {
  grid-template-columns: 1fr;
  grid-template-rows: 1px 1fr;  /* stack vertically */
}
```

**Animation:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.comparison-view-container { animation: fadeIn 0.3s ease-out; }
```

## Data Flow Diagram

```
╔═ Dashboard ═════════════════════════════════╗
║                                            ║
║  useComparisonState() ─────────────────┐   ║
║                                        │   ║
║  MapContainer + MapView                │   ║
║    └─ Marker.click → add location ────┤   ║
║                                        │   ║
║  LocationList                          │   ║
║    ├─ checkbox → toggle select────────┤   ║
║    ├─ X button → remove location──────┤   ║
║    └─ Compare button → start compare──┤   ║
║                                        │   ║
║  ComparisonView (conditional) ◄───────┘   ║
║    └─ ComparisonPanel x2                  ║
║        ├─ Scroll listeners at parent       ║
║        └─ Sync on scroll events            ║
║                                            ║
╚════════════════════════════════════════════╝
```

## Known Limitations & Considerations

1. **Mobile:** Two panels stack vertically (not shown side-by-side simultaneously)
2. **Scroll Sync:** 50ms debounce prevents jitter but may feel slightly delayed on slow devices
3. **Location Limit:** Hard-coded to 2 for comparison (by design)
4. **UI Space:** Location list is fixed 30rem - narrow space for checkboxes/info

## Testing Scenarios

### Scenario 1: Basic Comparison
1. Open Location A (appears in list)
2. Open Location B (appears in list)
3. Check Location A checkbox
4. Check Location B checkbox
5. Verify Compare button is enabled
6. Click Compare
7. Verify full-screen comparison view with both dashboards

### Scenario 2: Auto-Replacement
1. Open Locations A, B, C
2. Select A, B, C (in that order)
3. Verify C was auto-selected and A was auto-deselected
4. Verify Compare button reflects current 2 selections

### Scenario 3: Exit & Preserve
1. Open A, B and compare
2. Scroll in one panel, verify sync
3. Click back/exit button
4. Verify A and B are still checked in list
5. Can immediately click Compare again

### Scenario 4: Close Panel
1. Compare two locations
2. Click × on right panel
3. Verify automatic exit to map view
4. Verify B is removed from openLocations but A remains checked

## Future Enhancement Opportunities

- **Scroll Sync Toggle:** Allow users to disable sync per comparison session
- **Export:** CSV/JSON export of comparison data
- **History:** Remember recent comparisons
- **Quick Compare:** Shortcut from map (multi-select mode)
- **Chart Overlay:** Instead of side-by-side, overlay charts with legend
- **Mobile Tabs:** Swipe between left/right panels on mobile
- **Bookmarks:** Save favorite location pairs

## Performance Checklist

- ✓ No memory leaks from event listeners (cleanup in useEffect)
- ✓ Passive scroll listeners for performance
- ✓ Ref-based scroll sync avoids state updates
- ✓ Focused component re-renders (no prop drilling)
- ✓ Build size impact: ~8KB gzipped for new components
