import { useEffect, useState } from "react"
import { useMap } from "react-leaflet"
import { Activity, getActivityColor } from "@/components/map-component"

declare const L: any

interface Connection {
  id: number
  from_activity_id: number
  to_activity_id: number
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

export const ConnectionLines: React.FC<{ activities: Activity[] }> = ({ activities }) => {
  const map = useMap()
  const [connections, setConnections] = useState<Connection[]>([])

  useEffect(() => {
    // Generate random connections
    if (activities.length >= 2) {
      const newConnections: Connection[] = [];
      let connectionId = 1;
      
      // For each activity, create 3 random connections to other activities
      activities.forEach(activity => {
        // Get array of possible target activity IDs (excluding the current activity)
        const possibleTargets = activities
          .filter(a => a.id !== activity.id)
          .map(a => a.id);
        
        // Shuffle and take first 3 (or fewer if there aren't enough activities)
        const targets = shuffleArray(possibleTargets).slice(0, Math.min(3, possibleTargets.length));
        
        // Create connections
        targets.forEach(targetId => {
          newConnections.push({
            id: connectionId++,
            from_activity_id: activity.id,
            to_activity_id: targetId
          });
        });
      });
      
      setConnections(newConnections);
    }
  }, [activities]);

  useEffect(() => {
    if (!L) return

    map.eachLayer((layer: any) => {
      if (layer instanceof L.Polyline) {
        map.removeLayer(layer)
      }
    })

    const lines: any[] = []

    connections.forEach((connection) => {
      const fromActivity = activities.find(a => a.id === connection.from_activity_id)
      const toActivity = activities.find(a => a.id === connection.to_activity_id)
      if (fromActivity && toActivity) {
        const latlngs: any[] = [
          [fromActivity.lat, fromActivity.lng],
          [toActivity.lat, toActivity.lng],
        ]

        // Use the activity's type to determine the line color
        const lineColor = getActivityColor(fromActivity.type)

        const line = L.polyline(latlngs, {
          color: lineColor,
          weight: 3,
          opacity: 0,
        })
      }
    })

    return () => {
      lines.forEach(line => map.removeLayer(line))
    }
  }, [map, activities, connections])

  return null
}
