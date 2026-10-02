import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Clock, Bell, BellOff, MapPin, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Faculty, LiveStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Avatar, StatusBadge } from "./StatusBadge";

export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ facultyId, following }: { facultyId: string; following: boolean }) => {
      if (following) {
        const { error } = await supabase.from("follows").delete().eq("faculty_id", facultyId);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from("follows").insert({ faculty_id: facultyId, student_id: u.user!.id });
        if (error) throw error;
      }
      return !following;
    },
    onSuccess: (now) => {
      toast.success(now ? "Following — you'll get updates" : "Unfollowed");
      qc.invalidateQueries({ queryKey: ["follows"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function LiveLine({ live }: { live: LiveStatus }) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      {live.location && (
        <p className="flex items-center gap-1"><MapPin className="size-3.5" />{live.location}</p>
      )}
      {live.until && (
        <p className="flex items-center gap-1"><Clock className="size-3.5" />
          {live.status === "busy" ? "Busy until" : live.status === "available" ? "Available until" : "Until"} {live.until}
        </p>
      )}
      {live.reason && <p className="italic">{live.reason}</p>}
    </div>
  );
}

export function FacultyCard({ f, live, isStudent, following }: { f: Faculty; live: LiveStatus; isStudent: boolean; following: boolean }) {
  const toggle = useToggleFollow();
  return (
    <div className="flex flex-col rounded-2xl border bg-card p-4 shadow-card">
      <Link to="/faculty/$id" params={{ id: f.id }} className="flex gap-3">
        <Avatar name={f.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold hover:text-primary">{f.full_name}</p>
          <p className="text-xs text-muted-foreground">{f.departments?.code} Department · {f.designation}</p>
          <StatusBadge status={live.status} label={live.label} className="mt-1.5" />
        </div>
      </Link>
      <div className="mt-3 flex-1"><LiveLine live={live} /></div>
      <div className="mt-4 grid gap-2">
        <Button asChild variant="soft" size="sm">
          <Link to="/faculty/$id/timetable" params={{ id: f.id }}><CalendarDays /> View Timetable</Link>
        </Button>
        {isStudent && (
          <>
            <Button
              size="sm"
              variant={following ? "success" : "outline"}
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ facultyId: f.id, following })}
            >
              {following ? <><Bell /> Following</> : <><BellOff /> Follow</>}
            </Button>
            <Button asChild variant="soft" size="sm">
              <Link to="/faculty/$id/request" params={{ id: f.id }}><CalendarPlus /> Request Appointment</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
