import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDepartments } from "@/lib/data";
import { AuthFrame } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register – GVPCEW Connect" },
      { name: "description", content: "Create a student or faculty account on GVPCEW Connect." },
      { property: "og:title", content: "Register – GVPCEW Connect" },
      { property: "og:description", content: "Join GVPCEW Connect as a student or faculty member." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
  department_id: z.string().uuid("Choose your department"),
  roll_no: z.string().trim().max(30).optional(),
});

const selectCls = "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

function RegisterPage() {
  const navigate = useNavigate();
  const { data: depts } = useDepartments();
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", department_id: "", roll_no: "", designation: "", claim: "" });
  const [unclaimed, setUnclaimed] = useState<{ id: string; full_name: string; department_code: string | null }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.rpc("unclaimed_faculty").then(({ data }) => setUnclaimed(data ?? []));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    if (role === "student" && !form.roll_no.trim()) { setErrors({ roll_no: "Roll number is required" }); return; }
    setErrors({});
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          role,
          full_name: parsed.data.full_name,
          department_id: parsed.data.department_id,
          roll_no: role === "student" ? form.roll_no.trim() : null,
          claim_faculty_id: role === "faculty" && form.claim ? form.claim : null,
          designation: role === "faculty" ? form.designation.trim() : null,
        },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate({ to: "/dashboard" });
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthFrame title="Check your email" subtitle="One last step">
        <div className="text-center">
          <MailCheck className="mx-auto size-10 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to <b>{form.email}</b>. Click it, then log in.
          </p>
          <Button asChild className="mt-5 w-full"><Link to="/login">Go to login</Link></Button>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create account" subtitle="Register as a student or faculty member">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        {(["student", "faculty"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-md py-2 text-sm font-semibold capitalize transition ${role === r ? "bg-card text-primary shadow" : "text-muted-foreground"}`}
          >
            {r}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3.5">
        {role === "faculty" && unclaimed.length > 0 && (
          <div>
            <Label htmlFor="claim">Your faculty profile</Label>
            <select id="claim" className={selectCls} value={form.claim} onChange={(e) => {
              const u = unclaimed.find((x) => x.id === e.target.value);
              setForm((f) => ({ ...f, claim: e.target.value, full_name: u ? u.full_name : f.full_name }));
            }}>
              <option value="">Create a new profile</option>
              {unclaimed.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.department_code})</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">If your profile and timetable are already listed, pick it.</p>
          </div>
        )}
        <Field label="Full name" error={errors["full_name"]}>
          <Input value={form.full_name} onChange={set("full_name")} />
        </Field>
        <Field label="Email" error={errors["email"]}>
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password" error={errors["password"]}>
          <Input type="password" value={form.password} onChange={set("password")} />
        </Field>
        <Field label="Department" error={errors["department_id"]}>
          <select className={selectCls} value={form.department_id} onChange={set("department_id")}>
            <option value="">Select department</option>
            {depts?.map((d) => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
          </select>
        </Field>
        {role === "student" ? (
          <Field label="Roll number" error={errors["roll_no"]}>
            <Input value={form.roll_no} onChange={set("roll_no")} placeholder="e.g. 22JG1A0501" />
          </Field>
        ) : (
          !form.claim && (
            <Field label="Designation">
              <Input value={form.designation} onChange={set("designation")} placeholder="Assistant Professor" />
            </Field>
          )
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Register
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already registered? <Link to="/login" className="font-semibold text-primary">Login</Link>
      </p>
    </AuthFrame>
  );
}

function Field({ label, error, children }: { label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
