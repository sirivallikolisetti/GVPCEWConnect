import type { Slot } from "@/lib/data";
import { DAY_END, DAY_START, fmtTime, fromMinutes, istNow, toMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";

type Row = { start: string; end: string; subject: string | null; room: string | null; section: string | null; id?: string };

export function buildRows(slots: Slot[]): Row[] {
  const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const rows: Row[] = [];
  let cursor = DAY_START;
  for (const s of sorted) {
    const st = toMinutes(s.start_time);
    if (st > cursor) rows.push({ start: fromMinutes(cursor), end: fromMinutes(st), subject: null, room: null, section: null });
    rows.push({ start: s.start_time, end: s.end_time, subject: s.subject, room: s.room, section: s.section, id: s.id });
    cursor = Math.max(cursor, toMinutes(s.end_time));
  }
  if (cursor < DAY_END) rows.push({ start: fromMinutes(cursor), end: fromMinutes(DAY_END), subject: null, room: null, section: null });
  return rows;
}

export function DaySchedule({ slots, day, action }: { slots: Slot[]; day: number; action?: (id: string) => React.ReactNode }) {
  const now = istNow();
  const rows = buildRows(slots.filter((s) => s.day_of_week === day));
  if (day === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Sunday — no classes.</p>;
  return (
    <div className="divide-y">
      {rows.map((r, i) => {
        const current = now.day === day && toMinutes(r.start) <= now.minutes && now.minutes < toMinutes(r.end);
        return (
          <div key={i} className={cn("flex items-center gap-3 px-2 py-3 text-sm", current && "rounded-lg bg-primary-soft")}>
            <span className="w-36 shrink-0 text-muted-foreground">{fmtTime(r.start)} – {fmtTime(r.end)}</span>
            {r.subject ? (
              <>
                <span className="flex-1 font-semibold">{r.subject}{r.section && <span className="ml-2 text-xs font-normal text-muted-foreground">{r.section}</span>}</span>
                <span className="text-muted-foreground">{r.room}</span>
                {action && r.id && action(r.id)}
              </>
            ) : (
              <span className="flex-1 font-medium text-success">Free</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DayTabs({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
      {names.map((n, i) => (
        <button
          key={n}
          onClick={() => onChange(i + 1)}
          className={cn("flex-1 rounded-md px-3 py-1.5 text-sm font-semibold", value === i + 1 ? "bg-card text-primary shadow" : "text-muted-foreground")}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
