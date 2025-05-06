# EcoTrack Global: Data Models and Workflows

This document provides detailed technical specifications of the data models, database schema, and user interaction workflows in the EcoTrack Global application.

## Data Models

### Core Entities

#### Activity Model

The primary data entity representing environmental initiatives tracked by the system.

```typescript
interface Activity {
  id: string;
  title: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  country: string;
  adress?: string;
  responsible: string;
  photos?: string[];
}
```

**Implementation Notes**:
- Geographical coordinates stored as separate latitude/longitude fields for direct mapping compatibility
- Photos represented as array of URLs pointing to Supabase Storage objects
- Address field is optional to accommodate activities with undefined precise locations

#### Database Schema (Inferred)

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  country TEXT,
  city TEXT,
  responsible TEXT,
  photos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for geographic queries
CREATE INDEX idx_activities_coords ON activities USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
);
CREATE INDEX idx_activities_country ON activities (country);
```

## Data Flow Architecture

### Client-Side Data Flow

```
╔════════════════════╗     ╔════════════════════╗     ╔════════════════════╗
║                    ║     ║                    ║     ║                    ║
║  UI Components     ║ ◀─▶ ║  React State &     ║ ◀─▶ ║  Data Fetching     ║
║  (TSX Files)       ║     ║  Context           ║     ║  Layer             ║
║                    ║     ║                    ║     ║                    ║
╚════════════════════╝     ╚════════════════════╝     ╚════════════════════╝
                                                              │
                                                              │
                                                              ▼
╔════════════════════╗     ╔════════════════════╗     ╔════════════════════╗
║                    ║     ║                    ║     ║                    ║
║  Local Storage     ║ ◀─▶ ║  Supabase Client   ║ ◀─▶ ║  Supabase Backend  ║
║  Cache             ║     ║  (Browser)         ║     ║  (PostgreSQL)      ║
║                    ║     ║                    ║     ║                    ║
╚════════════════════╝     ╚════════════════════╝     ╚════════════════════╝
```

### Data Fetching Implementation

```typescript
// Implementation of the Supabase client
export const fetchActivities = async (limit = 50): Promise<Activity[]> => {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .limit(limit);
    
  if (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
  
  return data || [];
};
```

### Data Transformation Layer

Activities are transformed from the database schema to the frontend model:

```typescript
// Transform database data to match activity interface
const activitiesData = data.map((item: any) => {
  // Convert database schema to Activity type
  const activity: ActivityType = {
    id: item.id,
    title: item.title,
    type: item.type,
    description: item.description || '',
    lat: item.latitude || 0,
    lng: item.longitude || 0,
    country: item.country || 'Unknown',
    adress: item.city ? `${item.city}, ${item.country || ''}` : undefined,
    responsible: item.responsible || 'Unknown',
    photos: item.photos === null ? undefined : item.photos
  };
  return activity;
});
```

### Caching Strategy

The application implements a multi-level caching strategy to improve performance and provide offline capabilities:

```typescript
// Save to localStorage as a client-side cache
try {
  localStorage.setItem('mapActivities', JSON.stringify(activitiesData));
  localStorage.setItem('mapActivitiesTimestamp', Date.now().toString());
} catch (e) {
  console.warn('Failed to save activities to localStorage:', e);
}

// Retrieval from cache (when network request fails)
try {
  const cachedData = localStorage.getItem('mapActivities');
  if (cachedData) {
    console.log("Using cached activities from localStorage");
    const parsedData = JSON.parse(cachedData);
    const activitiesData = parsedData.map((item: any) => ({
      // Transform cached data
    }));
    setActivities(activitiesData);
  }
} catch (cacheErr) {
  console.error("Failed to load cached activities:", cacheErr);
}
```

## Key User Workflows

### 1. Activity Submission Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User clicks    │ ──▶ │  Overlay        │ ──▶ │  Form Validation│
│  Submit button  │     │  Context shows  │     │  Client-side    │
│                 │     │  submission form│     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Success/Error  │ ◀── │  Supabase       │ ◀── │  Photo Upload   │
│  Notification   │     │  Database Insert│     │  to Storage     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Implementation Notes**:
- Form submission triggered via the Overlay Context system
- Image uploads handled separately before the main data submission
- Supabase RLS (Row Level Security) policies control data access

### 2. Globe Interaction Workflow

```
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│  User Touches  │  ──▶ │ Event Handlers │  ──▶ │  Calculation   │
│  Globe Surface │      │ onMouseDown/   │      │  of Rotation   │
│                │      │ onTouchStart   │      │  Parameters    │
└────────────────┘      └────────────────┘      └────────────────┘
                                                        │
                                                        │
                                                        ▼
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│  WebGL Render  │  ◀── │  Physics-based │  ◀── │  Momentum      │
│  via COBE      │      │  Animation     │      │  Calculation   │
│                │      │                │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
```

**Technical Implementation**:
- Custom event handlers attached directly to DOM elements
- Rotation state managed via React refs for performance
- WebGL-based rendering through the COBE library
- Frame-by-frame rendering via requestAnimationFrame

### 3. Performance-Aware Rendering Workflow

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│                │     │                │     │                │
│ Page Load      │ ──▶ │ Device         │ ──▶ │ Performance    │
│ Initialization │     │ Capability     │     │ Mode           │
│                │     │ Detection      │     │ Selection      │
└────────────────┘     └────────────────┘     └────────────────┘
                                                      │
                                                      │
                                                      ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│                │     │                │     │                │
│ Conditional    │ ◀── │ Feature Set    │ ◀── │ Component      │
│ Rendering      │     │ Determination  │     │ Configuration  │
│                │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘
```

**Technical Implementation**:
- Device capability detection via memory, cores, and FPS measurement
- Three-tiered performance mode: low, medium, high
- Feature set adjustment based on performance level
- Conditional component rendering based on capabilities

## API Interfaces

### Supabase Client

The application uses a custom Supabase client wrapper to manage connections:

```typescript
// Client initialization (inferred)
export const getSupabaseBrowserClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  // Create client if it doesn't exist yet
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabaseClient;
};
```

### Primary API Methods

```typescript
// Activity fetching function
export const fetchActivities = async (limit = 50): Promise<Activity[]> => {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .limit(limit);
    
  if (error) throw error;
  return data || [];
};

// Activity submission function (inferred)
export const submitActivity = async (activity: Omit<Activity, 'id'>): Promise<Activity> => {
  const supabase = getSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Photo upload function (inferred)
export const uploadPhotos = async (files: File[], activityId: string): Promise<string[]> => {
  const supabase = getSupabaseBrowserClient();
  const urls: string[] = [];
  
  for (const file of files) {
    const filename = `${activityId}/${crypto.randomUUID()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('activity-photos')
      .upload(filename, file);
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('activity-photos')
      .getPublicUrl(data.path);
      
    urls.push(publicUrl);
  }
  
  return urls;
};
```

## Database Security Rules

### Row Level Security (Inferred)

```sql
-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY activities_select_policy ON activities
  FOR SELECT USING (true);

-- Authenticated user insert access
CREATE POLICY activities_insert_policy ON activities
  FOR INSERT TO authenticated USING (true);

-- Owner-only update access
CREATE POLICY activities_update_policy ON activities
  FOR UPDATE TO authenticated USING (
    auth.uid() = responsible_user_id
  );
```

## Data Validation

### Client-Side Validation (Inferred)

```typescript
const validateActivity = (activity: Partial<Activity>): string[] => {
  const errors: string[] = [];
  
  if (!activity.title?.trim()) {
    errors.push('Title is required');
  }
  
  if (!activity.type?.trim()) {
    errors.push('Activity type is required');
  }
  
  if (Number.isNaN(activity.lat) || Number.isNaN(activity.lng)) {
    errors.push('Valid location coordinates are required');
  }
  
  if (!activity.country?.trim()) {
    errors.push('Country is required');
  }
  
  return errors;
};
```

### Server-Side Validation (Inferred)

Database constraints and triggers enforce data integrity at the database level:

```sql
ALTER TABLE activities
  ADD CONSTRAINT valid_coordinates
  CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  );

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();
```

This document provides detailed technical specifications of the data models, database schemas, and interaction workflows in the EcoTrack Global application. For information on system architecture and component implementation, refer to the corresponding documents. 