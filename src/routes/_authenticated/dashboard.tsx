import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, CalendarClock, Inbox, Megaphone, Radio, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { liveStatus, useDirectory, useFollows, useMe } from "@/lib/data";
import { fmtDate, fmtTime, istNow, DAYS } from "@/lib/time";
import { Card, Empty, ErrorBox, Loading } from "@/components/States";
import { Avatar, StatusBadge } from "@/components/StatusBadge";
import { LiveLine } from "@/components/FacultyCard";
import { DaySchedule } from "@/components/DaySchedule";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – GVPCEW Connect" },
      { name: "description", content: "Your GVPCEW Connect dashboard." },
      { property: "og:title", content: "Dashboard – GVPCEW Connect" },
      { property: "og:description", content: "Faculty availability and appointments at a glance." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = Math.floor(istNow().minutes / 60);
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

function Dashboard() {
  const { data: me } = useMe();
  if (!me) return <Loading />;
  return me.role === "faculty" ? <FacultyDashboard /> : <StudentDashboard />;
}

function useMyAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, faculty(full_name, departments(code))")
        .order("appt_date")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });
}

function StudentDashboard() {
  const { data: me } = useMe();
  const dir = useDirectory();
  const follows = useFollows(true);
  const appts = useMyAppointments();
  const { data: unread = 0 } = useQuery<number>({ queryKey: ["unread"], enabled: false });
  const today = istNow().dateStr;
  const upcoming = (appts.data ?? []).filter((a) => a.appt_date >= today && (a.status === "pending" || a.status === "accepted")).slice(0, 3);
  const followed = dir.data?.faculty.filter((f) => follows.data?.has(f.id)) ?? [];
  const tiles = [
    { to: "/search" as const, icon: Search, label: "Search Faculty" },
    { to: "/search" as const, icon: Building2, label: "Departments", search: { dept: me?.profile?.departments?.code ?? "" } },
    { to: "/notifications" as const, icon: Bell, label: "Notifications", badge: unread },
    { to: "/appointments" as const, icon: CalendarClock, label: "My Appointments" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hello, {me?.profile?.full_name?.split(" ")[0]} 👋</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} search={t.search ?? {}} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card hover:border-primary/40">
            <t.icon className="size-5 text-primary" />
            <span className="flex-1 text-sm font-semibold">{t.label}</span>
            {!!t.badge && <span className="rounded-full bg-destructive px-2 text-xs font-bold text-destructive-foreground">{t.badge}</span>}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Users className="size-4 text-primary" /> Followed Faculty</h2>
          {dir.isLoading || follows.isLoading ? <Loading /> : dir.error ? <ErrorBox error={dir.error} /> : followed.length === 0 ? (
            <Empty title="You're not following anyone yet">
              <Link to="/search" className="font-semibold text-primary">Search faculty</Link> and follow them to get updates.
            </Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {followed.map((f) => {
                const live = liveStatus(f, dir.data!.updates, dir.data!.slots);
                return (
                  <Link key={f.id} to="/faculty/$id" params={{ id: f.id }} className="flex gap-3 rounded-2xl border bg-card p-4 shadow-card hover:border-primary/40">
                    <Avatar name={f.full_name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{f.full_name}</p>
                      <StatusBadge status={live.status} label={live.label} className="my-1" />
                      <LiveLine live={live} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-bold"><CalendarClock className="size-4 text-primary" /> Upcoming Appointments</h2>
          {appts.isLoading ? <Loading /> : upcoming.length === 0 ? (
            <Empty title="No upcoming appointments" />
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => (
                <Link key={a.id} to="/appointments" className="block rounded-xl border bg-card p-3 text-sm shadow-card">
                  <p className="font-semibold">{a.faculty?.full_name}</p>
                  <p className="text-muted-foreground">{a.reason}</p>
                  <p className="mt-1 text-xs">{fmtDate(a.appt_date)} · {fmtTime(a.start_time)} · <span className="font-semibold capitalize text-primary">{a.status}</span></p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FacultyDashboard() {
  const { data: me } = useMe();
  const fac = me!.faculty;
  const dir = useDirectory();
  const appts = useMyAppointments();
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const now = istNow();
  const announce = useMutation({
    mutationFn: async () => {
      const m = msg.trim();
      if (m.length < 3 || m.length > 500) throw new Error("Message must be 3–500 characters");
      const { error } = await supabase.from("announcements").insert({ faculty_id: fac!.id, message: m });
      if (error) throw error;
    },
    onSuccess: () => {
      setMsg("");
      toast.success("Update sent to your followers");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!fac) return <ErrorBox error={new Error("No faculty profile is linked to this account.")} />;
  const live = dir.data ? liveStatus(fac, dir.data.updates, dir.data.slots) : null;
  const pending = (appts.data ?? []).filter((a) => a.status === "pending" && a.appt_date >= now.dateStr);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-hero p-6 text-primary-foreground shadow-card">
        <p className="text-sm text-primary-foreground/80">{greeting()},</p>
        <h1 className="text-2xl font-bold">{fac.full_name} 👋</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">{DAYS[now.day]} · {fac.departments?.code} Department</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Today's Timetable</h2>
            <Link to="/timetable" className="text-sm font-semibold text-primary">Weekly view</Link>
          </div>
          {dir.isLoading ? <Loading /> : <DaySchedule slots={dir.data?.slots.filter((s) => s.faculty_id === fac.id) ?? []} day={now.day} />}
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-sm font-semibold text-muted-foreground">Current Status</p>
            {live ? (
              <div className="mt-2">
                <StatusBadge status={live.status} label={live.label} className="text-sm" />
                <div className="mt-2"><LiveLine live={live} /></div>
                <p className="mt-2 text-xs text-muted-foreground">{live.source === "update" ? "Your temporary update" : "From official timetable"}</p>
              </div>
            ) : <Loading />}
            <Button asChild className="mt-4 w-full"><Link to="/availability"><Radio /> Update Status</Link></Button>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="font-bold">Pending Requests</p>
              <span className="rounded-full bg-primary-soft px-2 text-sm font-bold text-primary">{pending.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {pending.slice(0, 3).map((a) => (
                <div key={a.id} className="text-sm">
                  <p className="font-semibold">{a.student_name}</p>
                  <p className="text-xs text-muted-foreground">{a.reason} · {fmtDate(a.appt_date)} {fmtTime(a.start_time)}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="soft" className="mt-3 w-full"><Link to="/requests"><Inbox /> View all requests</Link></Button>
          </Card>

          <Card>
            <p className="flex items-center gap-2 font-bold"><Megaphone className="size-4 text-primary" /> Send an update</p>
            <Textarea className="mt-3" rows={3} maxLength={500} placeholder="e.g. Department meeting at 4 PM" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <Button className="mt-2 w-full" disabled={announce.isPending || !msg.trim()} onClick={() => announce.mutate()}>Notify followers</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
