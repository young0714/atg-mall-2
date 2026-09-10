import { formatDateTime } from "@/lib/utils";

export interface TimelineEvent {
  status: string;
  location?: string | null;
  description: string;
  occurredAt: Date | string;
}

export function StatusTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-navy-400">No status updates yet.</p>;
  }

  return (
    <ol className="relative border-l-2 border-navy-100 pl-6">
      {events.map((event, i) => (
        <li key={i} className="mb-7 last:mb-0">
          <span
            className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white ${
              i === 0 ? "bg-atgblue-500" : "bg-navy-200"
            }`}
          />
          <p className="text-sm font-semibold text-navy-900">{event.status.replaceAll("_", " ")}</p>
          <p className="text-sm text-navy-500">{event.description}</p>
          <p className="mt-0.5 text-xs text-navy-400">
            {event.location && `${event.location} · `}
            {formatDateTime(event.occurredAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
