"use client"

import MonitorDashboard from "@/components/monitor-dashboard"

export default function MonitorPage() {
  return (
    <div className="flex justify-center items-center min-h-screen w-full py-8">
      <div className="w-full max-w-5xl">
        <MonitorDashboard />
      </div>
    </div>
  )
}
