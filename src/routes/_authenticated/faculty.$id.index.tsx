import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, BookOpen, CalendarDays, CalendarPlus, Mail, MapPin, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { liveStatus, useDirectory, useFollows, useMe } from "@/lib/data";
import { istNow, timeAgo } from "@/lib/time";
import { Card, ErrorBox, Loading } from "@/components/States";
import { Avatar, StatusBadge } from "@/components/StatusBadge";
import { LiveLine, useToggleFollow } from "@/components/FacultyCard";
import { DaySchedule } from "@/components/DaySchedule";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/faculty/$id/")({
  head: () => ({
    meta: [
      { title: "Faculty Profile – GVPCEW Connect" },
      { name: "description", content: "Faculty profile, live availability and today's schedule." },
      { property: "og:title", content: "Faculty Profile – GVPCEW Connect" },
      { property: "og:description", content: "See availability and request an appointment." },
    ],
  }),
  component: FacultyProfile,
});

function FacultyProfile() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const isStudent = me?.role === "student";
  const dir = useDirectory();
  const follows = useFollows(isStudent);
  const toggle = useToggleFollow();
  const ann = useQuery({
    queryKey: ["announcements", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").eq("faculty_id", id).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (dir.isLoading) return <Loading />;
  if (dir.error) return <ErrorBox error={dir.error} />;
  const f = dir.data!.faculty.find((x) => x.id === id);
  if (!f) return <ErrorBox error={new Error("Faculty not found")} />;
  const live = liveStatus(f, dir.data!.updates, dir.data!.slots);
  const following = !!follows.data?.has(f.id);

  return (
    <div className="space-y-5">
      <Link to="/search" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" /> Back to search</Link>
      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={f.full_name} className="size-20 text-xl" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{f.full_name}</h1>
            <p className="text-sm text-muted-foreground">{f.designation} · {f.departments?.name}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {f.cabin && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{f.cabin}</span>}
              {f.email && <span className="flex items-center gap-1"><Mail className="size-3.5" />{f.email}</span>}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1 md:w-56">
            <Button asChild variant="soft"><Link to="/faculty/$id/timetable" params={{ id }}><CalendarDays /> View Timetable</Link></Button>
            {isStudent && (
              <>
                <Button variant={following ? "success" : "outline"} disabled={toggle.isPending} onClick={() => toggle.mutate({ facultyId: f.id, following })}>
                  {following ? <><Bell /> Following</> : <><BellOff /> Follow</>}
                </Button>
                <Button asChild><Link to="/faculty/$id/request" params={{ id }}><CalendarPlus /> Request Appointment</Link></Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Card>
            <p className="text-sm font-semibold text-muted-foreground">Current availability</p>
            <StatusBadge status={live.status} label={live.label} className="mt-2 text-sm" />
            <div className="mt-2"><LiveLine live={live} /></div>
            <p className="mt-3 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
              {live.source === "update"
                ? `Temporary update by faculty. It expires at ${live.until}, then the official timetable applies.`
                : "Based on the official timetable. Location is only shown when the faculty shares it."}
            </p>
          </Card>
          {f.subjects.length > 0 && (
            <Card>
              <p className="flex items-center gap-2 font-bold"><BookOpen className="size-4 text-primary" /> Subjects</p>
              <div className="mt-2 flex flex-wrap gap-2">{f.subjects.map((s) => <span key={s} className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">{s}</span>)}</div>
              {f.bio && <p className="mt-3 text-sm text-muted-foreground">{f.bio}</p>}
            </Card>
          )}
        </div>
        <Card className="lg:col-span-2">
          <p className="mb-2 font-bold">Today's schedule</p>
          <DaySchedule slots={dir.data!.slots.filter((s) => s.faculty_id === f.id)} day={istNow().day} />
        </Card>
      </div>

      <Card>
        <p className="flex items-center gap-2 font-bold"><Megaphone className="size-4 text-primary" /> Recent updates</p>
        {ann.isLoading ? <Loading /> : ann.data?.length ? (
          <div className="mt-3 divide-y">
            {ann.data.map((a) => (
              <div key={a.id} className="py-2 text-sm"><p>{a.message}</p><p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p></div>
            ))}
          </div>
        ) : <p className="mt-2 text-sm text-muted-foreground">No updates yet.</p>}
      </Card>
    </div>
  );
}
