import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { fmtDate, fmtTime, istNow } from "@/lib/time";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/States";
import { Avatar } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statusCls } from "./appointments";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "Appointment Requests – GVPCEW Connect" },
      { name: "description", content: "Accept or reject student appointment requests." },
      { property: "og:title", content: "Appointment Requests – GVPCEW Connect" },
      { property: "og:description", content: "Manage appointment requests." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "upcoming" | "history">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const today = istNow().dateStr;
  const q = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*").order("appt_date").order("start_time");
      if (error) throw error;
      return data;
    },
  });
  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "rejected" }) => {
      const msg = (notes[id] ?? "").trim().slice(0, 300);
      const { error } = await supabase.from("appointments").update({ status, faculty_response: msg || null }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (s) => {
      toast.success(s === "accepted" ? "Request accepted — student notified" : "Request rejected — student notified");
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me?.role !== "faculty") return <ErrorBox error={new Error("Only faculty can view requests.")} />;
  const all = q.data ?? [];
  const list =
    tab === "pending" ? all.filter((a) => a.status === "pending" && a.appt_date >= today)
    : tab === "upcoming" ? all.filter((a) => a.status === "accepted" && a.appt_date >= today)
    : all.filter((a) => a.appt_date < today || a.status === "rejected" || a.status === "cancelled").reverse();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Appointment Requests" />
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {(["pending", "upcoming", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md py-1.5 text-sm font-semibold capitalize ${tab === t ? "bg-card text-primary shadow" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : list.length === 0 ? (
        <Empty icon={<Inbox />} title="Nothing here" />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="flex gap-3">
                <Avatar name={a.student_name} className="size-10" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{a.student_name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusCls[a.status]}`}>{a.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{a.reason}</p>
                  <p className="mt-1 text-sm">{fmtDate(a.appt_date)} · {fmtTime(a.start_time)} – {fmtTime(a.end_time)}</p>
                  {a.note && <p className="mt-1 text-xs italic text-muted-foreground">"{a.note}"</p>}
                  {a.faculty_response && <p className="mt-1 text-xs text-muted-foreground">Your reply: {a.faculty_response}</p>}
                </div>
              </div>
              {(tab === "pending" || tab === "upcoming") && (
                <div className="mt-3 space-y-2">
                  <Input placeholder="Optional message to student" maxLength={300} value={notes[a.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    {tab === "pending" && <Button variant="success" disabled={respond.isPending} onClick={() => respond.mutate({ id: a.id, status: "accepted" })}><Check /> Accept</Button>}
                    <Button variant="danger" className={tab === "upcoming" ? "col-span-2" : ""} disabled={respond.isPending} onClick={() => respond.mutate({ id: a.id, status: "rejected" })}><X /> Reject</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
