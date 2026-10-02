import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDirectory, useMe } from "@/lib/data";
import { istNow, toMinutes } from "@/lib/time";
import { Card, ErrorBox, Loading, PageHeader } from "@/components/States";
import { DaySchedule, DayTabs } from "@/components/DaySchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/timetable")({
  head: () => ({
    meta: [
      { title: "My Timetable – GVPCEW Connect" },
      { name: "description", content: "View and manage your official weekly timetable." },
      { property: "og:title", content: "My Timetable – GVPCEW Connect" },
      { property: "og:description", content: "Your weekly timetable." },
    ],
  }),
  component: MyTimetable,
});

function MyTimetable() {
  const { data: me } = useMe();
  const fac = me?.faculty;
  const dir = useDirectory();
  const qc = useQueryClient();
  const today = istNow().day;
  const [day, setDay] = useState(today === 0 ? 1 : today);
  const [form, setForm] = useState({ start: "09:00", end: "10:00", subject: "", room: "", section: "" });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.subject.trim()) throw new Error("Subject is required");
      if (toMinutes(form.end) <= toMinutes(form.start)) throw new Error("End time must be after start time");
      const clash = dir.data?.slots.some((s) => s.faculty_id === fac!.id && s.day_of_week === day &&
        toMinutes(form.start) < toMinutes(s.end_time) && toMinutes(form.end) > toMinutes(s.start_time));
      if (clash) throw new Error("This overlaps another class");
      const { error } = await supabase.from("timetable_slots").insert({
        faculty_id: fac!.id, day_of_week: day, start_time: form.start, end_time: form.end,
        subject: form.subject.trim().slice(0, 80), room: form.room.trim() || null, section: form.section.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class added"); setForm((f) => ({ ...f, subject: "", room: "", section: "" })); qc.invalidateQueries({ queryKey: ["directory"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Class removed"); qc.invalidateQueries({ queryKey: ["directory"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me?.role !== "faculty" || !fac) return <ErrorBox error={new Error("Only faculty have a timetable here.")} />;
  if (dir.isLoading) return <Loading />;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="My Timetable" subtitle="Your official timetable is the base students see." />
      <DayTabs value={day} onChange={setDay} />
      <Card>
        <DaySchedule slots={dir.data?.slots.filter((s) => s.faculty_id === fac.id) ?? []} day={day}
          action={(id) => (
            <button aria-label="Remove class" className="text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("Remove this class?")) del.mutate(id); }}>
              <Trash2 className="size-4" />
            </button>
          )} />
      </Card>
      <Card>
        <p className="mb-3 font-bold">Add a class</p>
        <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid gap-2 sm:grid-cols-6">
          <Input type="time" value={form.start} onChange={set("start")} className="sm:col-span-1" />
          <Input type="time" value={form.end} onChange={set("end")} className="sm:col-span-1" />
          <Input placeholder="Subject" value={form.subject} onChange={set("subject")} className="sm:col-span-2" />
          <Input placeholder="Room" value={form.room} onChange={set("room")} className="sm:col-span-1" />
          <Input placeholder="Section" value={form.section} onChange={set("section")} className="sm:col-span-1" />
          <Button className="sm:col-span-6" disabled={add.isPending}><Plus /> Add class</Button>
        </form>
      </Card>
    </div>
  );
}
