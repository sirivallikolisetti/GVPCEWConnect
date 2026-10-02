import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useDirectory } from "@/lib/data";
import { istNow } from "@/lib/time";
import { Card, ErrorBox, Loading } from "@/components/States";
import { DaySchedule, DayTabs } from "@/components/DaySchedule";

export const Route = createFileRoute("/_authenticated/faculty/$id/timetable")({
  head: () => ({
    meta: [
      { title: "Faculty Timetable – GVPCEW Connect" },
      { name: "description", content: "Official weekly timetable of a GVPCEW faculty member." },
      { property: "og:title", content: "Faculty Timetable – GVPCEW Connect" },
      { property: "og:description", content: "Official weekly timetable." },
    ],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  const { id } = Route.useParams();
  const dir = useDirectory();
  const today = istNow().day;
  const [day, setDay] = useState(today === 0 ? 1 : today);
  if (dir.isLoading) return <Loading />;
  if (dir.error) return <ErrorBox error={dir.error} />;
  const f = dir.data!.faculty.find((x) => x.id === id);
  if (!f) return <ErrorBox error={new Error("Faculty not found")} />;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/faculty/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> {f.full_name}</Link>
      <h1 className="text-2xl font-bold">{f.full_name} – Timetable</h1>
      <DayTabs value={day} onChange={setDay} />
      <Card><DaySchedule slots={dir.data!.slots.filter((s) => s.faculty_id === id)} day={day} /></Card>
    </div>
  );
}
