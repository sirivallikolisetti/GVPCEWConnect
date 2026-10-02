import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { fmtClock, istNow, istTodayAt, fromMinutes, timeAgo } from "@/lib/time";
import { Card, ErrorBox, Loading, PageHeader } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/availability")({
  head: () => ({
    meta: [
      { title: "Update Availability – GVPCEW Connect" },
      { name: "description", content: "Post a temporary availability update for students." },
      { property: "og:title", content: "Update Availability – GVPCEW Connect" },
      { property: "og:description", content: "Set Available, Busy or Class Cancelled." },
    ],
  }),
  component: AvailabilityPage,
});

const OPTIONS = [
  { v: "available", label: "Available" },
  { v: "busy", label: "Busy" },
  { v: "cancelled", label: "Class Cancelled" },
] as const;

function AvailabilityPage() {
  const { data: me } = useMe();
  const fac = me?.faculty;
  const qc = useQueryClient();
  const now = istNow();
  const [status, setStatus] = useState<"available" | "busy" | "cancelled">("available");
  const [location, setLocation] = useState(fac?.cabin ?? "");
  const [until, setUntil] = useState(fromMinutes(Math.min(now.minutes + 60, 23 * 60 + 59)));
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);

  const hist = useQuery({
    queryKey: ["my-updates", fac?.id],
    enabled: !!fac,
    queryFn: async () => {
      const { data, error } = await supabase.from("availability_updates").select("*").eq("faculty_id", fac!.id).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-updates"] });
    qc.invalidateQueries({ queryKey: ["directory"] });
  };
  const save = useMutation({
    mutationFn: async () => {
      const validUntil = istTodayAt(until);
      if (new Date(validUntil) <= new Date()) throw new Error("'Available until' must be later than now (today)");
      if (location.length > 100 || reason.length > 200) throw new Error("Location or reason is too long");
      // end any currently active update first
      await supabase.from("availability_updates").update({ valid_until: new Date().toISOString() }).eq("faculty_id", fac!.id).gt("valid_until", new Date().toISOString());
      const { error } = await supabase.from("availability_updates").insert({
        faculty_id: fac!.id, status, location: location.trim() || null, reason: reason.trim() || null, valid_until: validUntil, notify,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(notify ? "Status updated — followers notified" : "Status updated"); setReason(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const end = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_updates").update({ valid_until: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Back to official timetable"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me?.role !== "faculty" || !fac) return <ErrorBox error={new Error("Only faculty can update availability.")} />;
  const active = hist.data?.find((u) => new Date(u.valid_until) > new Date());
  const label = (s: string) => OPTIONS.find((o) => o.v === s)!.label;

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <PageHeader title="Update Availability" subtitle="Temporary — expires automatically, then your timetable applies." />
        <Card>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <Label>Status</Label>
              <div className="mt-2 grid gap-2">
                {OPTIONS.map((o) => (
                  <label key={o.v} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${status === o.v ? "border-primary bg-primary-soft" : ""}`}>
                    <input type="radio" name="status" checked={status === o.v} onChange={() => setStatus(o.v)} className="accent-primary" />
                    <StatusBadge status={o.v} label={o.label} />
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="loc">Location (optional)</Label>
              <Input id="loc" list="locs" className="mt-1" maxLength={100} value={location} onChange={(e) => setLocation(e.target.value)} />
              <datalist id="locs">
                {[fac.cabin, "Staff Room", "Library", "Seminar Hall", "Department Office", "Lab"].filter(Boolean).map((l) => <option key={l!} value={l!} />)}
              </datalist>
            </div>
            <div>
              <Label htmlFor="until">Available until (today)</Label>
              <Input id="until" type="time" className="mt-1" value={until} onChange={(e) => setUntil(e.target.value)} />
              <div className="mt-2 flex gap-2">
                {[30, 60, 120].map((m) => (
                  <button type="button" key={m} className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                    onClick={() => setUntil(fromMinutes(Math.min(istNow().minutes + m, 23 * 60 + 59)))}>+{m < 60 ? `${m} min` : `${m / 60} h`}</button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input id="reason" className="mt-1" maxLength={200} placeholder="e.g. Department meeting" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <label className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm font-medium">
              Notify my followers <Switch checked={notify} onCheckedChange={setNotify} />
            </label>
            <Button className="w-full" size="lg" disabled={save.isPending}>{save.isPending && <Loader2 className="animate-spin" />} Update</Button>
          </form>
        </Card>
      </div>
      <div className="space-y-4 lg:col-span-2 lg:pt-16">
        <Card>
          <p className="text-sm font-semibold text-muted-foreground">Active update</p>
          {hist.isLoading ? <Loading /> : active ? (
            <div className="mt-2 space-y-1 text-sm">
              <StatusBadge status={active.status} label={label(active.status)} />
              {active.location && <p>{active.location}</p>}
              <p className="text-muted-foreground">Until {fmtClock(active.valid_until)}</p>
              <Button variant="danger" size="sm" className="mt-2" disabled={end.isPending} onClick={() => end.mutate(active.id)}>End now</Button>
            </div>
          ) : <p className="mt-2 text-sm text-muted-foreground">None — students see your official timetable.</p>}
        </Card>
        <Card>
          <p className="font-bold">Recent updates</p>
          <div className="mt-2 divide-y text-sm">
            {hist.data?.map((u) => (
              <div key={u.id} className="py-2">
                <StatusBadge status={u.status} label={label(u.status)} />
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(u.created_at)} · until {fmtClock(u.valid_until)}{u.reason ? ` · ${u.reason}` : ""}</p>
              </div>
            ))}
            {!hist.data?.length && <p className="py-2 text-muted-foreground">No updates yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
