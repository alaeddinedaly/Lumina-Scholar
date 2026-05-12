"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type EventTopic = "ROUTE_UPDATED" | "DELAY_EVENT" | "ANOMALY";

interface LiveEvent {
  id: string;
  topic: EventTopic;
  timestamp: string;
  data: string;
}

const EVENT_TEMPLATES: Omit<LiveEvent, "id" | "timestamp">[] = [
  { topic: "ROUTE_UPDATED", data: "re-route: NV-89 -> I-15" },
  { topic: "ROUTE_UPDATED", data: "eta_shift: +12m" },
  { topic: "ROUTE_UPDATED", data: "status: IN_TRANSIT" },
  { topic: "ROUTE_UPDATED", data: "checkpoint: DFW_HUB" },
  { topic: "DELAY_EVENT", data: "cause: WEATHER (Ice)" },
  { topic: "DELAY_EVENT", data: "cause: TRAFFIC (Accident)" },
  { topic: "DELAY_EVENT", data: "status: HOLDING" },
  { topic: "DELAY_EVENT", data: "impact: HIGH" },
  { topic: "ANOMALY", data: "temp_spike: 48°F (Reefer)" },
  { topic: "ANOMALY", data: "door_open_alert: 2m" },
  { topic: "ANOMALY", data: "tamper_detected: lock_xyz" },
  { topic: "ANOMALY", data: "geo_fence_breach: T-29" },
];

const TOPIC_COLORS = {
  ROUTE_UPDATED: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
  DELAY_EVENT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  ANOMALY: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    // Generate initial events
    const initialEvents = Array.from({ length: 4 }).map((_, i) => ({
      id: `init-${i}`,
      ...EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)],
      timestamp: new Date(Date.now() - i * 1000).toISOString().split('T')[1].slice(0, 8)
    }));
    setEvents(initialEvents);

    const interval = setInterval(() => {
      const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      const newEvent: LiveEvent = {
        id: `evt-${Date.now()}`,
        topic: template.topic,
        data: template.data,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
      };

      setEvents((prev) => [newEvent, ...prev].slice(0, 8)); // keep max 8 rows
    }, 900);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden text-xs font-mono">
      <div className="mb-3 flex items-center justify-between opacity-50 border-b border-black/10 dark:border-white/10 pb-2 text-slate-800 dark:text-white">
        <span>KAFKA_STREAM_SIM</span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          CONNECTED
        </span>
      </div>
      <div className="flex-1 relative space-y-2">
        <AnimatePresence initial={false}>
          {events.map((evt) => (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center justify-between py-1.5 px-2 bg-black/[0.02] dark:bg-white/[0.02] rounded border border-black/[0.05] dark:border-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.3 }}
                  className={cn("px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold border", TOPIC_COLORS[evt.topic])}
                >
                  {evt.topic}
                </motion.span>
                <span className="text-slate-600 dark:text-white/40">{evt.timestamp}</span>
              </div>
              <span className="text-slate-800 dark:text-white/80">{evt.data}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
