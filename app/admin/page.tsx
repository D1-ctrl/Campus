"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type {
  Ad,
  AdPlacement,
  ContentReport,
  StudyProgram,
  Subject,
  University,
  WaitlistEntry,
} from "@/lib/types";

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

type Tab = "universities" | "study-programs" | "subjects" | "waitlist" | "ads" | "reports";

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("universities");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return null;
  }

  if (profile && !profile.is_admin) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">
        Kein Zugriff. Dieser Bereich ist nur für Admins.
      </p>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="flex gap-2 border-b border-black/10 pb-2 text-sm dark:border-white/15">
        {(
          [
            ["universities", "Universitäten"],
            ["study-programs", "Studiengänge"],
            ["subjects", "Kurse"],
            ["waitlist", "Warteliste"],
            ["ads", "Werbung"],
            ["reports", "Meldungen"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-3 py-1 ${
              tab === value
                ? "bg-accent text-white"
                : "hover:bg-black/[.04] dark:hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "universities" && <UniversitiesTab />}
      {tab === "study-programs" && <StudyProgramsTab />}
      {tab === "subjects" && <SubjectsTab />}
      {tab === "waitlist" && <WaitlistTab />}
      {tab === "ads" && <AdsTab />}
      {tab === "reports" && <ReportsTab />}
    </main>
  );
}

function UniversitiesTab() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("universities").select("*").order("name");
    setUniversities((data as University[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addUniversity() {
    if (!name.trim()) return;
    await supabase.from("universities").insert({ name: name.trim() });
    setName("");
    load();
  }

  async function toggleActive(u: University) {
    await supabase
      .from("universities")
      .update({ is_active: !u.is_active })
      .eq("id", u.id);
    load();
  }

  if (loading) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Name der Uni"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <button
          onClick={addUniversity}
          className="rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
        >
          Anlegen
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {universities.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15"
          >
            <span>{u.name}</span>
            <button
              onClick={() => toggleActive(u)}
              className={`rounded-full px-3 py-1 text-xs ${
                u.is_active
                  ? "bg-green-600/10 text-green-700 dark:text-green-400"
                  : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {u.is_active ? "Live" : "Nicht live"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudyProgramsTab() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string>("");
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    supabase
      .from("universities")
      .select("*")
      .order("name")
      .then(({ data }) => setUniversities((data as University[]) ?? []));
  }, []);

  async function loadPrograms(uniId: string) {
    const { data } = await supabase
      .from("study_programs")
      .select("*")
      .eq("university_id", uniId)
      .order("name");
    setPrograms((data as StudyProgram[]) ?? []);
  }

  useEffect(() => {
    if (universityId) loadPrograms(universityId);
    else setPrograms([]);
  }, [universityId]);

  async function addProgram() {
    if (!name.trim() || !universityId) return;
    await supabase
      .from("study_programs")
      .insert({ university_id: universityId, name: name.trim() });
    setName("");
    loadPrograms(universityId);
  }

  return (
    <div className="flex flex-col gap-4">
      <select
        value={universityId}
        onChange={(e) => setUniversityId(e.target.value)}
        className={inputClass}
      >
        <option value="">Uni wählen...</option>
        {universities.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      {universityId && (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name des Studiengangs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputClass} flex-1`}
            />
            <button
              onClick={addProgram}
              className="rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
            >
              Anlegen
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {programs.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              >
                {p.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SubjectsTab() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [universityId, setUniversityId] = useState<string>("");
  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [subjectName, setSubjectName] = useState("");
  const [linkProgramId, setLinkProgramId] = useState("");
  const [linkSubjectId, setLinkSubjectId] = useState("");
  const [linkSemester, setLinkSemester] = useState(1);

  useEffect(() => {
    supabase
      .from("universities")
      .select("*")
      .order("name")
      .then(({ data }) => setUniversities((data as University[]) ?? []));
  }, []);

  async function loadForUniversity(uniId: string) {
    const [{ data: progs }, { data: subs }] = await Promise.all([
      supabase.from("study_programs").select("*").eq("university_id", uniId).order("name"),
      supabase.from("subjects").select("*").eq("university_id", uniId).order("name"),
    ]);
    setPrograms((progs as StudyProgram[]) ?? []);
    setSubjects((subs as Subject[]) ?? []);
  }

  useEffect(() => {
    if (universityId) loadForUniversity(universityId);
    else {
      setPrograms([]);
      setSubjects([]);
    }
  }, [universityId]);

  async function addSubject() {
    if (!subjectName.trim() || !universityId) return;
    await supabase
      .from("subjects")
      .insert({ university_id: universityId, name: subjectName.trim() });
    setSubjectName("");
    loadForUniversity(universityId);
  }

  async function linkSubjectToProgram() {
    if (!linkProgramId || !linkSubjectId || !linkSemester) return;
    await supabase.from("study_program_subjects").upsert(
      {
        study_program_id: linkProgramId,
        subject_id: linkSubjectId,
        semester: linkSemester,
      },
      { onConflict: "study_program_id,subject_id,semester" }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <select
        value={universityId}
        onChange={(e) => setUniversityId(e.target.value)}
        className={inputClass}
      >
        <option value="">Uni wählen...</option>
        {universities.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      {universityId && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Neuen Kurs anlegen</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name des Fachs"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <button
                onClick={addSubject}
                className="rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
              >
                Anlegen
              </button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs dark:bg-white/10"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/15">
            <p className="text-sm font-medium">
              Kurs einem Studiengang + Semester zuordnen
            </p>
            <select
              value={linkProgramId}
              onChange={(e) => setLinkProgramId(e.target.value)}
              className={inputClass}
            >
              <option value="">Studiengang wählen...</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={linkSubjectId}
              onChange={(e) => setLinkSubjectId(e.target.value)}
              className={inputClass}
            >
              <option value="">Kurs wählen...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder="Fachsemester"
              value={linkSemester}
              onChange={(e) => setLinkSemester(Number(e.target.value))}
              className={inputClass}
            />
            <button
              onClick={linkSubjectToProgram}
              className="w-fit rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
            >
              Verknüpfen
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("university_waitlist")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as WaitlistEntry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function removeEntry(id: string) {
    await supabase.from("university_waitlist").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>;

  if (entries.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Noch keine Warteliste-Einträge.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15"
        >
          <span>
            {entry.name ? `${entry.name} · ` : ""}
            {entry.university_name} · {entry.email}
          </span>
          <button
            onClick={() => removeEntry(entry.id)}
            className="text-xs text-red-600 hover:underline"
          >
            Entfernen
          </button>
        </li>
      ))}
    </ul>
  );
}

function AdsTab() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [placement, setPlacement] = useState<AdPlacement>("banner");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds((data as Ad[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createAd() {
    if (!title.trim() || !imageFile || !user) return;

    setCreating(true);
    setError(null);

    const extension = imageFile.name.split(".").pop() ?? "jpg";
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("ads").upload(filePath, imageFile);

    if (uploadError) {
      setCreating(false);
      setError(uploadError.message);
      return;
    }

    const imageUrl = supabase.storage.from("ads").getPublicUrl(filePath).data.publicUrl;

    const { error: insertError } = await supabase.from("ads").insert({
      title: title.trim(),
      image_url: imageUrl,
      link_url: linkUrl.trim() || null,
      cta_label: ctaLabel.trim() || null,
      placement,
    });

    setCreating(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setLinkUrl("");
    setCtaLabel("");
    setImageFile(null);
    load();
  }

  async function toggleActive(ad: Ad) {
    await supabase.from("ads").update({ is_active: !ad.is_active }).eq("id", ad.id);
    load();
  }

  async function removeAd(ad: Ad) {
    await supabase.from("ads").delete().eq("id", ad.id);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-md border border-black/10 p-3 dark:border-white/15">
        <p className="text-sm font-medium">Neue Anzeige anlegen</p>
        <input
          type="text"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <input
          type="url"
          placeholder="Link (optional)"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Button-Text (optional, z.B. Jetzt entdecken)"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          className={inputClass}
        />
        <select
          value={placement}
          onChange={(e) => setPlacement(e.target.value as AdPlacement)}
          className={inputClass}
        >
          <option value="banner">Banner (Feed, Seiten)</option>
          <option value="gate">Download-Freischaltung</option>
        </select>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={createAd}
          disabled={creating || !title.trim() || !imageFile}
          className="w-fit rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {creating ? "Wird erstellt..." : "Anlegen"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : ads.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Noch keine Anzeigen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ads.map((ad) => (
            <li
              key={ad.id}
              className="flex items-center gap-3 rounded-md border border-black/10 p-3 text-sm dark:border-white/15"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.image_url} alt="" className="h-12 w-12 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{ad.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {ad.placement === "banner" ? "Banner" : "Download-Freischaltung"}
                </p>
              </div>
              <button
                onClick={() => toggleActive(ad)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                  ad.is_active
                    ? "bg-green-600/10 text-green-700 dark:text-green-400"
                    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {ad.is_active ? "Aktiv" : "Inaktiv"}
              </button>
              <button
                onClick={() => removeAd(ad)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("content_reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data as ContentReport[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolveReport(id: string) {
    await supabase.from("content_reports").update({ resolved: true }).eq("id", id);
    load();
  }

  async function deleteReport(id: string) {
    await supabase.from("content_reports").delete().eq("id", id);
    load();
  }

  const visibleReports = reports.filter((r) => showResolved || !r.resolved);

  const targetLink: Record<ContentReport["target_type"], (id: string) => string> = {
    post: (id) => `/community/${id}`,
    comment: () => "",
    document: (id) => `/document/${id}`,
  };

  if (loading) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
        />
        Erledigte auch anzeigen
      </label>

      {visibleReports.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Keine Meldungen.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visibleReports.map((report) => {
            const href = targetLink[report.target_type](report.target_id);
            return (
              <li
                key={report.id}
                className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15"
              >
                <div className="min-w-0">
                  <p className="truncate">
                    <span className="font-medium capitalize">{report.target_type}</span>{" "}
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
                        {report.target_id}
                      </a>
                    ) : (
                      report.target_id
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(report.created_at).toLocaleString("de-DE")}
                    {report.resolved && " · erledigt"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!report.resolved && (
                    <button
                      onClick={() => resolveReport(report.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Erledigt
                    </button>
                  )}
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
