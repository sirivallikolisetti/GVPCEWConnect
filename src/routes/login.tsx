import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login – GVPCEW Connect" },
      { name: "description", content: "Log in to GVPCEW Connect as a student or faculty member." },
      { property: "og:title", content: "Login – GVPCEW Connect" },
      { property: "og:description", content: "Log in to check faculty availability and appointments." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 block text-center text-lg font-extrabold tracking-tight text-primary">GVPCEW CONNECT</Link>
        <div className="rounded-2xl border bg-card p-7 shadow-card">
          <h1 className="text-center text-xl font-bold">{title}</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("confirm") ? "Please confirm your email first." : "Invalid email or password.");
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function forgot() {
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) { toast.error("Enter your email above first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  }

  return (
    <AuthFrame title="Welcome Back!" subtitle="Login to your account">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input id="email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gvpcew.ac.in" />
          </div>
          {errors["email"] && <p className="mt-1 text-xs text-destructive">{errors["email"]}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-2.5 z-10 size-4 text-muted-foreground" />
            <PasswordInput id="password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {errors["password"] && <p className="mt-1 text-xs text-destructive">{errors["password"]}</p>}
          <button type="button" onClick={forgot} className="mt-1 block w-full text-right text-xs font-medium text-primary">Forgot password?</button>
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Login
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here? <Link to="/register" className="font-semibold text-primary">Create an account</Link>
      </p>
    </AuthFrame>
  );
}
