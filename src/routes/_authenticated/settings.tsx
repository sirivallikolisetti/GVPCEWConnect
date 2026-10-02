import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments, useMe } from "@/lib/data";
import { Card, Loading, PageHeader } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Profile & Settings – GVPCEW Connect" },
      { name: "description", content: "Manage your GVPCEW Connect profile and password." },
      { property: "og:title", content: "Profile & Settings – GVPCEW Connect" },
      { property: "og:description", content: "Your profile and account settings." },
    ],
  }),
  component: SettingsPage,
});

const selectCls = "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function SettingsPage() {
  const { data: me } = useMe();
  if (!me) return <Loading />;
  return <SettingsForm key={me.user.id} />;
}

function SettingsForm() {
  const { data: me } = useMe();
  const { data: depts } = useDepartments();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fac = me!.faculty;
  const [p, setP] = useState({
    full_name: me!.profile?.full_name ?? "",
    roll_no: me!.profile?.roll_no ?? "",
    department_id: me!.profile?.department_id ?? "",
  });
  const [f, setF] = useState({
    designation: fac?.designation ?? "",
    subjects: fac?.subjects.join(", ") ?? "",
    cabin: fac?.cabin ?? "",
    phone: fac?.phone ?? "",
    bio: fac?.bio ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "" });

  const save = useMutation({
    mutationFn: async () => {
      if (p.full_name.trim().length < 2) throw new Error("Enter your full name");
      const { error } = await supabase.from("profiles").update({
        full_name: p.full_name.trim().slice(0, 100), roll_no: p.roll_no.trim() || null, department_id: p.department_id || null,
      }).eq("id", me!.user.id);
      if (error) throw error;
      if (fac) {
        const { error: e2 } = await supabase.from("faculty").update({
          full_name: p.full_name.trim().slice(0, 100),
          department_id: p.department_id || null,
          designation: f.designation.trim() || "Assistant Professor",
          subjects: f.subjects.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10),
          cabin: f.cabin.trim() || null, phone: f.phone.trim() || null, bio: f.bio.trim().slice(0, 500) || null,
        }).eq("id", fac.id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const changePw = useMutation({
    mutationFn: async () => {
      if (pw.next.length < 6) throw new Error("New password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: pw.next, current_password: pw.current } as { password: string });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password changed"); setPw({ current: "", next: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Profile & Settings" subtitle={`${me!.user.email} · ${me!.role}`} />
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
          <div><Label>Full name</Label><Input className="mt-1" value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></div>
          <div>
            <Label>Department</Label>
            <select className={selectCls} value={p.department_id} onChange={(e) => setP({ ...p, department_id: e.target.value })}>
              <option value="">—</option>
              {depts?.map((d) => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
            </select>
          </div>
          {me!.role === "student" && (
            <div><Label>Roll number</Label><Input className="mt-1" value={p.roll_no} onChange={(e) => setP({ ...p, roll_no: e.target.value })} /></div>
          )}
          {fac && (
            <>
              <div><Label>Designation</Label><Input className="mt-1" value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} /></div>
              <div><Label>Subjects (comma separated)</Label><Input className="mt-1" value={f.subjects} onChange={(e) => setF({ ...f, subjects: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Cabin</Label><Input className="mt-1" value={f.cabin} onChange={(e) => setF({ ...f, cabin: e.target.value })} /></div>
                <div><Label>Phone</Label><Input className="mt-1" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              </div>
              <div><Label>Bio</Label><Textarea className="mt-1" rows={3} maxLength={500} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
            </>
          )}
          <Button disabled={save.isPending}>Save profile</Button>
        </form>
      </Card>
      <Card>
        <p className="mb-3 font-bold">Change password</p>
        <form onSubmit={(e) => { e.preventDefault(); changePw.mutate(); }} className="grid gap-3 sm:grid-cols-2">
          <Input type="password" placeholder="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <Input type="password" placeholder="New password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <Button variant="soft" className="sm:col-span-2" disabled={changePw.isPending}>Update password</Button>
        </form>
      </Card>
      <Button variant="danger" className="w-full" onClick={signOut}><LogOut /> Sign out</Button>
    </div>
  );
}
