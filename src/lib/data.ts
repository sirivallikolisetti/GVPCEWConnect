import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DAY_END, DAY_START, fmtClock, fmtTime, istNow, toMinutes } from "./time";

export type Faculty = Database["public"]["Tables"]["faculty"]["Row"] & {
  departments: { code: string; name: string } | null;
};
export type Slot = Database["public"]["Tables"]["timetable_slots"]["Row"];
export type AvailUpdate = Database["public"]["Tables"]["availability_updates"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const [roles, profile, fac] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*, departments(code,name)").eq("id", user.id).maybeSingle(),
        supabase.from("faculty").select("*, departments(code,name)").eq("user_id", user.id).maybeSingle(),
      ]);
      if (roles.error) throw roles.error;
      return {
        user,
        role: (roles.data?.[0]?.role ?? null) as "student" | "faculty" | null,
        profile: profile.data,
        faculty: fac.data as Faculty | null,
      };
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("code");
      if (error) throw error;
      return data;
    },
  });
}

export function useDirectory() {
  return useQuery({
    queryKey: ["directory"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [f, u, s] = await Promise.all([
        supabase.from("faculty").select("*, departments(code,name)").order("full_name"),
        supabase
          .from("availability_updates")
          .select("*")
          .gt("valid_until", nowIso)
          .order("created_at", { ascending: false }),
        supabase.from("timetable_slots").select("*").order("start_time"),
      ]);
      if (f.error) throw f.error;
      if (u.error) throw u.error;
      if (s.error) throw s.error;
      return { faculty: f.data as Faculty[], updates: u.data, slots: s.data };
    },
  });
}

export function useFollows(enabled: boolean) {
  return useQuery({
    queryKey: ["follows"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("faculty_id");
      if (error) throw error;
      return new Set(data.map((d) => d.faculty_id));
    },
  });
}

export type LiveStatus = {
  status: "available" | "busy" | "cancelled" | "off";
  label: string;
  location: string | null;
  until: string | null;
  reason: string | null;
  source: "update" | "timetable";
};

/** Temporary faculty update wins while unexpired; otherwise fall back to official timetable. */
export function liveStatus(
  fac: Faculty,
  updates: AvailUpdate[],
  slots: Slot[],
  now = new Date(),
): LiveStatus {
  const active = updates
    .filter((u) => u.faculty_id === fac.id && new Date(u.valid_until) > now)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (active) {
    return {
      status: active.status,
      label:
        active.status === "available" ? "Available" : active.status === "busy" ? "Busy" : "Class Cancelled",
      location: active.location,
      until: fmtClock(active.valid_until),
      reason: active.reason,
      source: "update",
    };
  }
  const { day, minutes } = istNow(now);
  const today = slots
    .filter((s) => s.faculty_id === fac.id && s.day_of_week === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  if (day === 0 || minutes < DAY_START || minutes >= DAY_END) {
    return { status: "off", label: "Outside college hours", location: null, until: null, reason: null, source: "timetable" };
  }
  const current = today.find((s) => toMinutes(s.start_time) <= minutes && minutes < toMinutes(s.end_time));
  if (current) {
    return {
      status: "busy",
      label: "Busy",
      location: current.room,
      until: fmtTime(current.end_time),
      reason: `In class: ${current.subject}`,
      source: "timetable",
    };
  }
  const next = today.find((s) => toMinutes(s.start_time) > minutes);
  return {
    status: "available",
    label: "Available",
    location: fac.cabin,
    until: next ? fmtTime(next.start_time) : "4:30 PM",
    reason: "Free period as per timetable",
    source: "timetable",
  };
}
