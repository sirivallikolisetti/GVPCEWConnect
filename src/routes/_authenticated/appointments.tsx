import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, fmtTime, istNow } from "@/lib/time";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "My Appointments – GVPCEW Connect" },
      { name: "description", content: "Your upcoming and past faculty appointments." },
      { property: "og:title", content: "My Appointments – GVPCEW Connect" },
      { property: "og:description", content: "Track appointment status." },
    ],
  }),
  component: AppointmentsPage,
});

export const statusCls: Record<string, string> = {
  pending: "bg-warning-soft text-warning",
  accepted: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

function AppointmentsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const today = istNow().dateStr;
  const q = useQuery({
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
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment cancelled");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (q.data ?? []).filter((a) =>
    tab === "upcoming" ? a.appt_date >= today && (a.status === "pending" || a.status === "accepted") : !(a.appt_date >= today && (a.status === "pending" || a.status === "accepted")),
  );
  if (tab === "past") list.reverse();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My Appointments" action={<Button asChild size="sm"><Link to="/search">New request</Link></Button>} />
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["upcoming", "past"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : list.length === 0 ? (
        <Empty icon={<CalendarX />} title={tab === "upcoming" ? "No upcoming appointments" : "No past appointments"} />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link to="/faculty/$id" params={{ id: a.faculty_id }} className="font-semibold hover:text-primary">{a.faculty?.full_name}</Link>
                  <p className="text-sm text-muted-foreground">{a.reason}</p>
                  <p className="mt-1 text-sm">{fmtDate(a.appt_date)} · {fmtTime(a.start_time)} – {fmtTime(a.end_time)}</p>
                  {a.faculty_response && <p className="mt-1 text-xs italic text-muted-foreground">Faculty: "{a.faculty_response}"</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusCls[a.status]}`}>{a.status}</span>
              </div>
              {tab === "upcoming" && (
                <Button variant="danger" size="sm" className="mt-3" disabled={cancel.isPending}
                  onClick={() => { if (confirm("Cancel this appointment?")) cancel.mutate(a.id); }}>Cancel</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
