import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { Search as SearchIcon, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { liveStatus, useDepartments, useDirectory, useFollows, useMe } from "@/lib/data";
import { FacultyCard } from "@/components/FacultyCard";
import { Empty, ErrorBox, Loading, PageHeader } from "@/components/States";

const searchSchema = z.object({
  q: z.string().optional(),
  dept: z.string().optional(),
  status: z.enum(["available", "busy", "cancelled", "off"]).optional(),
});

export const Route = createFileRoute("/_authenticated/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search Faculty – GVPCEW Connect" },
      { name: "description", content: "Search GVPCEW faculty by name, department or subject." },
      { property: "og:title", content: "Search Faculty – GVPCEW Connect" },
      { property: "og:description", content: "Find faculty and check their availability." },
    ],
  }),
  component: SearchPage,
});

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`;

function SearchPage() {
  const { q = "", dept, status } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const { data: me } = useMe();
  const isStudent = me?.role === "student";
  const { data, isLoading, error } = useDirectory();
  const { data: depts } = useDepartments();
  const { data: follows } = useFollows(isStudent);

  const results = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.faculty
      .map((f) => ({ f, live: liveStatus(f, data.updates, data.slots) }))
      .filter(({ f, live }) => {
        if (dept && f.departments?.code !== dept) return false;
        if (status && live.status !== status) return false;
        if (!term) return true;
        return [f.full_name, f.departments?.code, f.departments?.name, ...f.subjects]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(term));
      });
  }, [data, q, dept, status]);

  return (
    <div>
      <PageHeader title="Search Faculty" subtitle="By name, department or subject" />
      <div className="relative">
        <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          className="bg-card pl-9"
          placeholder="e.g. Lakshmi, CSE, Machine Learning"
          value={q}
          onChange={(e) => navigate({ search: (p) => ({ ...p, q: e.target.value || undefined }), replace: true })}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={chip(!dept)} onClick={() => navigate({ search: (p) => ({ ...p, dept: undefined }) })}>All departments</button>
        {depts?.map((d) => (
          <button key={d.id} className={chip(dept === d.code)} onClick={() => navigate({ search: (p) => ({ ...p, dept: d.code }) })}>{d.code}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {([undefined, "available", "busy", "cancelled"] as const).map((s) => (
          <button key={s ?? "any"} className={chip(status === s)} onClick={() => navigate({ search: (p) => ({ ...p, status: s }) })}>
            {s ? (s === "cancelled" ? "Class cancelled" : s[0]!.toUpperCase() + s.slice(1)) : "Any status"}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : results.length === 0 ? (
          <Empty icon={<UserX />} title="No faculty found">Try a different name, subject or filter.</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(({ f, live }) => (
              <FacultyCard key={f.id} f={f} live={live} isStudent={isStudent} following={!!follows?.has(f.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
