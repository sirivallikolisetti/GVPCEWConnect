import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDirectory, useMe } from "@/lib/data";
import { DAY_END, DAY_START, fmtTime, fromMinutes, istNow, toMinutes } from "@/lib/time";
import { Card, ErrorBox, Loading } from "@/components/States";
import { Avatar } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/faculty/$id/request")({
  head: () => ({
    meta: [
      { title: "Request Appointment – GVPCEW Connect" },
      { name: "description", content: "Request an appointment with a faculty member." },
      { property: "og:title", content: "Request Appointment – GVPCEW Connect" },
      { property: "og:description", content: "Send an appointment request to faculty." },
    ],
  }),
  component: RequestPage,
});

const REASONS = ["Project Discussion", "Doubt Clarification", "Placement Guidance", "Internship / Letter", "Attendance / Marks", "Other"];
const schema = z.object({
  reason: z.string().trim().min(3, "Enter a reason").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time slot"),
  note: z.string().trim().max(500).optional(),
});
const selectCls = "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function RequestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const dir = useDirectory();
  const now = istNow();
  const [reasonSel, setReasonSel] = useState(REASONS[0]!);
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const slots = useMemo(() => {
    if (!date || !dir.data) return [];
    const dow = new Date(date + "T00:00:00").getDay();
    if (dow === 0) return [];
    const busy = dir.data.slots.filter((s) => s.faculty_id === id && s.day_of_week === dow);
    const out: string[] = [];
    for (let m = DAY_START; m + 15 <= DAY_END; m += 15) {
      if (date === now.dateStr && m <= now.minutes + 30) continue;
      const clash = busy.some((s) => m < toMinutes(s.end_time) && m + 15 > toMinutes(s.start_time));
      if (!clash) out.push(fromMinutes(m));
    }
    return out;
  }, [date, dir.data, id, now.dateStr, now.minutes]);

  if (me?.role !== "student") return <ErrorBox error={new Error("Only students can request appointments.")} />;
  if (dir.isLoading) return <Loading />;
  const f = dir.data?.faculty.find((x) => x.id === id);
  if (!f) return <ErrorBox error={new Error("Faculty not found")} />;
  const isSunday = date && new Date(date + "T00:00:00").getDay() === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ reason: reasonSel === "Other" ? custom : reasonSel, date, time, note });
    if (!parsed.success) return setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
    if (date < now.dateStr) return setErrors({ date: "Date can't be in the past" });
    setErrors({});
    setLoading(true);
    const { error } = await supabase.from("appointments").insert({
      student_id: me!.user.id,
      student_name: me!.profile?.full_name ?? "Student",
      faculty_id: id,
      reason: parsed.data.reason,
      appt_date: date,
      start_time: time,
      end_time: fromMinutes(toMinutes(time) + 15),
      note: parsed.data.note || null,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Request sent! You'll be notified when they respond.");
    qc.invalidateQueries({ queryKey: ["appointments"] });
    navigate({ to: "/appointments" });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link to="/faculty/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Back</Link>
      <h1 className="text-2xl font-bold">Request Appointment</h1>
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={f.full_name} />
          <div><p className="font-semibold">{f.full_name}</p><p className="text-xs text-muted-foreground">{f.departments?.code} Department</p></div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Reason</Label>
            <select className={selectCls} value={reasonSel} onChange={(e) => setReasonSel(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            {reasonSel === "Other" && <Input className="mt-2" placeholder="Describe your reason" value={custom} onChange={(e) => setCustom(e.target.value)} />}
            {errors.reason && <p className="mt-1 text-xs text-destructive">{errors.reason}</p>}
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" className="mt-1" min={now.dateStr} value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} />
            {isSunday && <p className="mt-1 text-xs text-destructive">College is closed on Sundays.</p>}
            {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date}</p>}
          </div>
          <div>
            <Label>Time (15 minutes, outside class hours)</Label>
            <select className={selectCls} value={time} onChange={(e) => setTime(e.target.value)} disabled={!date || !slots.length}>
              <option value="">{!date ? "Pick a date first" : slots.length ? "Select a time" : "No free slots"}</option>
              {slots.map((s) => <option key={s} value={s}>{fmtTime(s)} – {fmtTime(fromMinutes(toMinutes(s) + 15))}</option>)}
            </select>
            {errors.time && <p className="mt-1 text-xs text-destructive">{errors.time}</p>}
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Textarea className="mt-1" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="I need guidance on my project." />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>{loading && <Loader2 className="animate-spin" />} Send Request</Button>
        </form>
      </Card>
    </div>
  );
}
