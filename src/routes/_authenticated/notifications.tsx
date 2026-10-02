import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarCheck, CalendarX, CheckCircle2, Megaphone, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/time";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications – GVPCEW Connect" },
      { name: "description", content: "Availability, cancellations and appointment updates." },
      { property: "og:title", content: "Notifications – GVPCEW Connect" },
      { property: "og:description", content: "Your latest updates." },
    ],
  }),
  component: NotificationsPage,
});

const icons: Record<string, React.ReactNode> = {
  available: <CheckCircle2 className="size-5 text-success" />,
  busy: <XCircle className="size-5 text-destructive" />,
  cancelled: <CalendarX className="size-5 text-warning" />,
  announcement: <Megaphone className="size-5 text-primary" />,
  appointment_accepted: <CalendarCheck className="size-5 text-success" />,
  appointment_rejected: <CalendarX className="size-5 text-destructive" />,
};

function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  };
  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("All marked as read"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  async function open(n: { id: string; link: string | null; is_read: boolean }) {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      refresh();
    }
    if (n.link) navigate({ to: n.link });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notifications" action={<Button variant="soft" size="sm" disabled={markAll.isPending} onClick={() => markAll.mutate()}>Mark all read</Button>} />
      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : !q.data?.length ? (
        <Empty icon={<Bell />} title="No notifications yet">Follow faculty to get availability updates.</Empty>
      ) : (
        <div className="divide-y rounded-2xl border bg-card shadow-card">
          {q.data.map((n) => (
            <div key={n.id} className={`flex gap-3 p-4 ${n.is_read ? "" : "bg-primary-soft/60"}`}>
              <div className="pt-0.5">{icons[n.type] ?? <Bell className="size-5 text-primary" />}</div>
              <button className="flex-1 text-left" onClick={() => open(n)}>
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
              </button>
              <button aria-label="Delete" className="text-muted-foreground hover:text-destructive" onClick={() => remove.mutate(n.id)}><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
