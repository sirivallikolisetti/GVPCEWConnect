import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, CalendarDays, Home, Inbox, LogOut, Radio, Search, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { Loading, ErrorBox } from "@/components/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AppLayout,
});

const studentNav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/appointments", label: "Appointments", icon: CalendarClock },
  { to: "/settings", label: "Profile", icon: User },
] as const;
const facultyNav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/requests", label: "Requests", icon: Inbox },
  { to: "/availability", label: "Status", icon: Radio },
  { to: "/settings", label: "Profile", icon: User },
] as const;

function AppLayout() {
  const { data: me, isLoading, error } = useMe();
  if (isLoading) return <Loading />;
  if (error) return <div className="p-6"><ErrorBox error={error} /></div>;
  if (!me) return null;
  if (!me.role) return <CompleteRegistration />;
  return <Shell role={me.role} />;
}

function Shell({ role }: { role: "student" | "faculty" }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const nav = role === "student" ? studentNav : facultyNav;
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
      return count ?? 0;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (p) => {
        qc.invalidateQueries({ queryKey: ["unread"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
        if (p.eventType === "INSERT") toast((p.new as { title: string }).title);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/dashboard" className="font-extrabold tracking-tight">GVPCEW Connect</Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/10"
                activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link to="/notifications" className="relative rounded-md p-2 hover:bg-primary-foreground/10" aria-label="Notifications">
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <button onClick={signOut} className="rounded-md p-2 hover:bg-primary-foreground/10" aria-label="Sign out">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="size-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function CompleteRegistration() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [err, setErr] = useState<string | null>(null);
  const tried = useRef(false);
  const meta = (me?.user.user_metadata ?? {}) as Record<string, string | null>;

  async function run(role: "student" | "faculty") {
    setErr(null);
    const { error } = await supabase.rpc("complete_registration", {
      p_role: role,
      p_full_name: meta["full_name"] || me?.user.email?.split("@")[0] || "User",
      p_department_id: (meta["department_id"] || null) as unknown as string,
      ...(meta["roll_no"] ? { p_roll_no: meta["roll_no"] } : {}),
      ...(meta["claim_faculty_id"] ? { p_claim_faculty_id: meta["claim_faculty_id"] } : {}),
      ...(meta["designation"] ? { p_designation: meta["designation"] } : {}),
    });
    if (error) return setErr(error.message);
    qc.invalidateQueries();
  }

  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    if (meta["role"] === "student" || meta["role"] === "faculty") run(meta["role"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!err && (meta["role"] === "student" || meta["role"] === "faculty")) return <Loading label="Setting up your account…" />;
  return (
    <div className="mx-auto max-w-sm p-8 text-center">
      <h1 className="text-xl font-bold">Finish setting up</h1>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      <p className="mt-2 text-sm text-muted-foreground">Are you a student or a faculty member?</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button onClick={() => run("student")}>Student</Button>
        <Button variant="soft" onClick={() => run("faculty")}>Faculty</Button>
      </div>
    </div>
  );
}
