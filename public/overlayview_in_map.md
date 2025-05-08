# Connecting Map Markers to Activity Detail Overlays

## Overview

This guide explains how to connect markers on the map page with the detailed activity overlay system implemented in the monitor page, allowing users to view activity details when clicking on map markers.

## Prerequisites

- Access to the EcoTrack Global codebase
- Understanding of React and TypeScript (v4.5+)
- Familiarity with the existing code structure
- Required dependencies:
  - framer-motion (for overlay animations)
  - react-leaflet (for map interaction)
  - Next.js (for client-side navigation)

## Step-by-Step Implementation

### 1. Understand the Current Implementation

#### Monitor Page Implementation

```typescript
// In app/monitor/page.tsx
const handleViewActivity = (id: string) => {
  // Converts ID to string if needed
  const activityId = String(id)
  // Uses the overlay context to show activity details
  showOverlay("view", activityId)
}
```

#### Overlay Context Structure

The overlay context provides:

```typescript
// From contexts/overlay-context.tsx
export type OverlayType = "submit" | "monitor" | "edit" | "view" | null

interface OverlayContextType {
  overlayType: OverlayType;
  editActivityId?: string;
  showOverlay: (type: OverlayType, activityId?: string) => void;
  hideOverlay: () => void;
  isOverlayVisible: boolean;
}
```

#### Map Component Implementation

```typescript
// In MapClient.tsx
const handleMarkerClick = useCallback(() => {
  console.log("Marker clicked:", activity.title);
  // Currently just logs and shows a simple popup
}, [activity]);
```

### 2. Import the Overlay Context and Types in MapClient.tsx

```typescript
// Add these imports at the top of the file
import { useOverlay, OverlayType } from "@/contexts/overlay-context"
```

### 3. Add Overlay Context to the Custom Marker Component

```typescript
const CustomMarker = forwardRef(function CustomMarker({ activity }: { activity: Activity }, ref) {
  // Add this line to access the overlay context
  const { showOverlay } = useOverlay();
  
  // Rest of the existing component code...
```

### 4. Modify the Marker Click Handler

```typescript
// Update the handleMarkerClick function
const handleMarkerClick = useCallback(() => {
  console.log("Marker clicked:", activity.title);
  
  // Show the activity details overlay
  if (activity.id) {
    showOverlay("view", String(activity.id));
  } else {
    console.error("Activity ID missing - cannot show overlay");
  }
}, [activity, showOverlay]);
```

### 5. Remove or Modify the Existing Popup

You can either:

- Keep the popup as a preview and still show the full overlay on click
- Remove the popup entirely and rely solely on the overlay for details

```typescript
// Option to remove the popup
const renderPopup = () => {
  // Return null to disable the popup completely
  return null;
};

// Or modify to make it a small preview
const renderPopup = () => {
  return (
    <Popup 
      className="custom-popup" 
      maxWidth={300} 
      autoPan={true} 
      closeButton={true} 
      autoClose={true}
    >
      <div className="eco-activity-popup">
        <h3>{activity.title}</h3>
        <button 
          onClick={() => {
            if (activity.id) {
              showOverlay("view", String(activity.id))
            }
          }}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-md text-sm"
        >
          View Details
        </button>
      </div>
    </Popup>
  );
};
```

### 6. Ensure Data Consistency Between Map and Monitor

Verify that the activity data structure is consistent between map and monitor pages:

```typescript
// Make sure the activity interface in MapClient matches what the overlay expects
interface Activity {
  id: string;         // Essential for the overlay to work
  lat: number;
  lng: number;
  // Other fields needed by the overlay
  type: string;
  title: string;
  description?: string;
  photos?: string | null;
  country?: string;
  adress?: string;
  city?: string | null;
  // etc.
}
```

### 7. Update the Parent Map Component

Make sure the MapClientBase component has access to the overlay context:

```typescript
function MapClientBase({ activities, initialSelectedActivity, stadiaApiKey }: MapClientProps) {
  // Add this if not already present
  const { showOverlay } = useOverlay();

  // Rest of the component...
}
```

### 8. Handle Initial Selected Activity (Optional)

If you want to support direct links to activities:

```typescript
// Add this to MapClientBase component
useEffect(() => {
  if (initialSelectedActivity) {
    // Show the overlay for the initially selected activity on mount
    showOverlay("view", initialSelectedActivity);
  }
}, [initialSelectedActivity, showOverlay]);
```

### 9. Wrap the Map Component with OverlayProvider

Ensure the map component is wrapped with the OverlayProvider in its parent page:

```tsx
// In app/map/page.tsx or wherever the map is rendered
import { OverlayProvider } from "@/contexts/overlay-context"

export default function MapPage() {
  return (
    <OverlayProvider>
      <MapClient activities={activities} />
    </OverlayProvider>
  )
}
```

### 10. Update CSS for Better Integration

Ensure map markers and overlays work well together stylistically:

```css
/* Add to your CSS */
.leaflet-popup-close-button {
  color: #0891b2 !important; /* Cyan color to match theme */
}

.leaflet-container {
  z-index: 10; /* Lower than overlay z-index */
}

/* Make sure overlay has higher z-index than map 
   Note: The actual overlay component uses z-50 */
.activity-overlay {
  z-index: 50;
}

/* Ensure map markers remain clickable */
.super-high-z-marker {
  z-index: 40 !important;
}
```

### 11. Understanding the Overlay Component Structure

The overlay system uses a modal-style approach:

```typescript
// In components/overlay.tsx (simplified)
export function Overlay() {
  const { overlayType, editActivityId, hideOverlay, isOverlayVisible } = useOverlay()
  
  // Render different content based on overlay type
  const renderContent = () => {
    if (overlayType === "view" && editActivityId) {
      return <ViewActivity activityId={editActivityId} />;
    }
    // Other overlay types...
    return null;
  };

  return (
    <AnimatePresence mode="wait">
      {isOverlayVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={hideOverlay}
          />
          
          {/* Content container */}
          <motion.div className="relative flex flex-col bg-gradient-to-b from-gray-900/90 to-black/95 border border-cyan-900/40 rounded-lg">
            {/* Close button */}
            <button onClick={hideOverlay}>
              <X className="w-4 h-4 text-cyan-400" />
            </button>
            
            {/* Scrollable content */}
            <div className="h-full w-full overflow-y-auto">
              {renderContent()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

### 12. Testing the Integration

1. Click on a map marker
2. Verify the overlay opens with the correct activity details
3. Test closing the overlay and clicking on different markers
4. Verify that all activity data is displayed correctly
5. Test with various screen sizes to ensure responsive behavior
6. Check for console errors during interaction
7. Verify animations work correctly with and without reduced motion settings

## Implementation Details

### Overlay Type Descriptions

- `view`: Opens a read-only view of activity details
- `edit`: Opens activity data in an editable form
- `submit`: Opens the form for submitting a new activity
- `monitor`: Shows monitoring dashboard panel

### Activity ID Handling

- Always ensure you're passing a string ID to `showOverlay`
- The overlay system expects an activity ID to fetch details from Supabase
- Handle potential missing IDs with appropriate error checks

### Data Consistency

- Both map markers and the overlay should use the same data source
- Activity data structure should be compatible across components
- Ensure all required fields for ViewActivity component are present:
  - id (required)
  - title (required)
  - type (required)
  - description (optional)
  - photos (optional)
  - location data (lat/lng)

### Performance Considerations

- Consider lazy loading the overlay component to improve map performance
- Use debouncing for marker click handlers if many markers are present
- Be cautious with animations on map + overlay together (can affect performance)
- Consider `useCallback` for frequently executed functions

### Animation Handling

- The overlay uses framer-motion for animations
- Animations respect user preferences with `prefersReducedMotion`
- Backdrop uses blur effects which may impact performance on some devices

## Troubleshooting

### Overlay Not Showing

- Check that OverlayProvider is wrapping the map component correctly
- Verify that activity IDs are being passed correctly
- Check console for any errors
- Confirm the overlay component is imported correctly in the layout

### Incorrect Activity Data

- Verify that activity objects in the map have all required fields
- Check Supabase queries to ensure they return consistent data
- Look for type mismatches between expected and actual data
- Use browser devtools to inspect the data being passed

### Z-Index Issues

- Adjust z-index values in CSS if the overlay appears behind map elements
- Remember that the main overlay uses z-index: 50
- Map containers typically use z-index: 10
- Markers may need increased z-index values (z-index: 40 recommended)

### React Context Errors

- If you see "Context not found" errors, check that:
  1. OverlayProvider is correctly imported
  2. OverlayProvider wraps the component using useOverlay
  3. There are no multiple instances of the context

## Common Integration Pitfalls

1. **Missing Activity Fields**: Ensure all required fields are present in activity data
2. **Multiple Context Providers**: Avoid nesting multiple OverlayProviders
3. **Z-Index Conflicts**: Map elements might need CSS adjustments for proper layering
4. **Mobile Responsiveness**: Test the overlay on small screens for proper layout
5. **Performance Impact**: Watch for performance degradation when many markers use the overlay

## Conclusion

By connecting map markers to the existing overlay system, users can now access detailed activity information directly from the map view, creating a more integrated and seamless user experience throughout the application.

The overlay system is a powerful way to display detailed content without navigating away from the map, making the application feel more responsive and interconnected.