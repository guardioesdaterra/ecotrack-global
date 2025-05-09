import { useEffect, useState, useRef } from "react"
import { Activity, getActivityColor } from "@/components/map-component"

// Import types directly
import type * as LeafletNamespace from 'leaflet';
type LeafletMap = LeafletNamespace.Map;

interface Connection {
  id: string
  from_activity_id: string
  to_activity_id: string
  type: string
  description?: string
}

interface ConnectionLinesProps {
  connections: Connection[]
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export const computeConnectionLines = (activities: Activity[]): Connection[] => {
  const connections: Connection[] = [];
  
  // Generate unique IDs for connections
  let connectionIdCounter = 1;

  // Find connections based on activities with similar regions
  activities.forEach(activity => {
    const sameRegionActivities = activities.filter(a => 
      a.id !== activity.id && 
      a.country === activity.country
    );
    
    sameRegionActivities.forEach(targetActivity => {
      // Skip if connection already exists in the reverse direction
      const existingConnection = connections.find(
        c => (c.from_activity_id === targetActivity.id && c.to_activity_id === activity.id)
      );
      
      if (!existingConnection) {
        connections.push({
          id: connectionIdCounter.toString(), // Convert to string
          from_activity_id: activity.id,
          to_activity_id: targetActivity.id,
          type: activity.type,
          description: activity.description
        });
        connectionIdCounter++;
      }
    });
  });
  
  return connections;
};

export const ConnectionLines: React.FC<{ activities: Activity[], map: LeafletNamespace.Map }> = ({ activities, map }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const animationTimers = useRef<number[]>([]);
  const mapRef = useRef<LeafletNamespace.Map | null>(null);
  const lines = useRef<LeafletNamespace.Polyline[]>([]);

  // Update map ref when map changes
  useEffect(() => {
    mapRef.current = map;
    return () => {
      mapRef.current = null;
    };
  }, [map]);

  // Generate connections when activities change
  useEffect(() => {
    // Generate random connections
    if (activities.length >= 2) {
      const newConnections: Connection[] = [];
      let connectionId = 1;
      
      // For each activity, create 1-3 random connections to other activities
      activities.forEach(activity => {
        // Get array of possible target activity IDs (excluding the current activity)
        const possibleTargets = activities
          .filter(a => a.id !== activity.id)
          .map(a => a.id);
        
        // Limit connections per activity to prevent overcrowding
        const maxConnections = Math.min(3, Math.floor(possibleTargets.length / 2));
        const connectionsCount = Math.max(1, Math.floor(Math.random() * maxConnections));
        
        // Shuffle and take specified number
        const targets = shuffleArray(possibleTargets).slice(0, connectionsCount);
        
        // Create connections
        targets.forEach(targetId => {
          // Avoid duplicates (in either direction)
          const existingConnection = newConnections.find(
            c => (c.from_activity_id === targetId && c.to_activity_id === activity.id) ||
                 (c.from_activity_id === activity.id && c.to_activity_id === targetId)
          );
          
          if (!existingConnection) {
            newConnections.push({
              id: connectionId.toString(),
              from_activity_id: activity.id,
              to_activity_id: targetId,
              type: activity.type,
              description: activity.description
            });
            connectionId++;
          }
        });
      });
      
      // Only update if connections actually changed
      setConnections(newConnections);
    }
  }, [activities]);

  // Cleanup function to clear all animation timers
  const clearAllAnimationTimers = () => {
    animationTimers.current.forEach(timerId => {
      clearTimeout(timerId);
    });
    animationTimers.current = [];
  };

  // Draw connections on the map
  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;
    
    const currentMap = mapRef.current;
    const L = window.L;
    if (!L) return;

    // Clear existing lines
    lines.current.forEach(line => {
      if (currentMap.hasLayer(line)) {
        currentMap.removeLayer(line);
      }
    });
    lines.current = [];
    
    // Clear any existing animation timers
    clearAllAnimationTimers();

    // Create new lines
    connections.forEach((connection) => {
      const fromActivity = activities.find(a => a.id === connection.from_activity_id);
      const toActivity = activities.find(a => a.id === connection.to_activity_id);
      
      if (fromActivity && toActivity) {
        const latlngs: [number, number][] = [
          [fromActivity.lat, fromActivity.lng],
          [toActivity.lat, toActivity.lng],
        ];

        // Use the activity's type to determine the line color
        const lineColor = getActivityColor(fromActivity.type);

        // Create a polyline with a dash array for a dotted effect
        const line = L.polyline(latlngs, {
          color: lineColor,
          weight: 2,
          opacity: 0.5,
          dashArray: '5, 10',
          className: 'activity-connection-line',
        });
        
        // Add custom property to identify this as a connection line
        (line as any)._connection = connection.id;
        
        // Add the line to the map
        line.addTo(currentMap);
        
        // Store in ref array for cleanup
        lines.current.push(line);
        
        // Add animated opacity effect
        let fadeDirection = 1;
        let opacity = 0.5;
        
        const animateLine = () => {
          if (!line || !currentMap.hasLayer(line)) return;
          
          opacity += 0.01 * fadeDirection;
          
          // Reverse direction at thresholds
          if (opacity >= 0.7) fadeDirection = -1;
          if (opacity <= 0.3) fadeDirection = 1;
          
          // Update opacity
          line.setStyle({ opacity });
          
          // Continue animation with requestAnimationFrame
          const timerId = window.setTimeout(animateLine, 50);
          animationTimers.current.push(timerId);
        };
        
        // Start the animation
        animateLine();
      }
    });

    // Cleanup function
    return () => {
      // Clear all animation timers
      clearAllAnimationTimers();
      
      // Remove all lines from the map
      lines.current.forEach(line => {
        if (currentMap && currentMap.hasLayer(line)) {
          currentMap.removeLayer(line);
        }
      });
      lines.current = [];
    };
  }, [map, activities, connections]);

  return null;
}
