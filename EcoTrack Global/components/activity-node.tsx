import { useState } from "react"
import { Marker, Popup } from "react-leaflet"
import { Badge } from "@/components/ui/badge"

declare const L: any

interface Activity {
  id: number
  lat: number
  lng: number
  type: string
  title: string
  intensity: number
  created_at: string
}

export function ActivityNode({ activity }: { activity: Activity }) {
  const [showPopup, setShowPopup] = useState(false)

  if (!L) return null

  const icon = L.divIcon({
    html: `
      <div class="activity-marker">
        <span>${activity.title}</span>
      </div>
    `,
    className: "custom-activity-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  })

  return (
    <Marker
      position={[activity.lat, activity.lng]}
      icon={icon}
      eventHandlers={{
        click: () => setShowPopup(true),
      }}
    >
      {showPopup && (
        <Popup>
          <div>
            <h3>{activity.title}</h3>
            <Badge>{activity.type}</Badge>
            <div>Intensity: {activity.intensity}</div>
            <div>Created: {activity.created_at}</div>
          </div>
        </Popup>
      )}
    </Marker>
  )
}
