import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays, CheckCircle2, Clock, GraduationCap, MapPin, Search, UserPlus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GVPCEW Connect – Faculty Availability System" },
      { name: "description", content: "Connecting students with faculty seamlessly: live availability, timetables and appointments at GVPCEW." },
      { property: "og:title", content: "GVPCEW Connect – Faculty Availability System" },
      { property: "og:description", content: "Check if your faculty is available, follow them for updates and request appointments." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Search, title: "Search Faculty", text: "By name, department or subject." },
  { icon: CalendarDays, title: "Official Timetable", text: "The base for every availability status." },
  { icon: CheckCircle2, title: "Live Availability", text: "Available, Busy or Class Cancelled." },
  { icon: MapPin, title: "Location & Time", text: "Shown only when faculty share it." },
  { icon: UserPlus, title: "Follow Faculty", text: "Get updates from the people you need." },
  { icon: Bell, title: "Notifications", text: "Availability, cancellations and replies." },
  { icon: Clock, title: "Temporary Updates", text: "Expire automatically, then timetable applies." },
  { icon: GraduationCap, title: "Appointments", text: "Request, accept, reject and track." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center md:py-28">
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary-foreground/15 ring-1 ring-primary-foreground/30">
            <GraduationCap className="size-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">GVPCEW CONNECT</h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">Connecting students with faculty seamlessly.</p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <Button asChild size="lg" variant="onHero"><Link to="/login">Login</Link></Button>
            <Button asChild size="lg" variant="outlineHero"><Link to="/register">Register</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-sm font-bold uppercase tracking-widest text-primary">What you can do</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-card">
              <f.icon className="size-6 text-primary" />
              <p className="mt-3 font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border bg-card p-6 shadow-card md:p-8">
          <h3 className="text-lg font-bold">What if a teacher doesn't update?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We never claim to know where a teacher is. The official timetable is our base. When faculty post a temporary
            update, students see it until it expires — then the timetable applies again.
          </p>
        </div>
      </section>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">GVPCEW Connect · Smart. Simple. Connected.</footer>
    </div>
  );
}
