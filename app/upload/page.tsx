"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import type { DocumentType } from "@/lib/document-types";
import Combobox from "@/components/Combobox";
import PostComposer from "@/components/PostComposer";
import SegmentedToggle from "@/components/SegmentedToggle";
import { generatePdfThumbnail } from "@/lib/pdf-thumbnail";
import { generateOfficeThumbnail } from "@/lib/office-thumbnail";
import type { Subject } from "@/lib/types";

const OFFICE_EXTENSIONS = [".docx", ".pptx"];

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 dark:border-white/15 dark:bg-transparent";

export default function UploadPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"post" | "document">("post");
  const [universityName, setUniversityName] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [customSubjectName, setCustomSubjectName] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("Skript");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!profile?.university_id) return;

    supabase
      .from("universities")
      .select("name")
      .eq("id", profile.university_id)
      .single()
      .then(({ data }) => setUniversityName(data?.name ?? null));

    supabase
      .from("subjects")
      .select("*")
      .eq("university_id", profile.university_id)
      .order("name")
      .then(({ data }) => setSubjects((data as Subject[]) ?? []));
  }, [profile?.university_id]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ value: s.id, label: s.name })),
    [subjects]
  );

  if (authLoading || !user) {
    return null;
  }

  if (profile && !profile.university_id) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Bitte schließe zuerst dein{" "}
        <Link href="/onboarding" className="underline">
          Onboarding
        </Link>{" "}
        ab, bevor du Dokumente hochlädst.
      </p>
    );
  }

  async function handleAddCustomSubject() {
    if (!customSubjectName.trim() || !profile?.university_id) return;

    const trimmedName = customSubjectName.trim();

    const { data: existing } = await supabase
      .from("subjects")
      .select("*")
      .eq("university_id", profile.university_id)
      .ilike("name", trimmedName)
      .maybeSingle();

    let subject = existing as Subject | null;

    if (!subject) {
      const { data: created, error: createError } = await supabase
        .from("subjects")
        .insert({
          university_id: profile.university_id,
          name: trimmedName,
          created_by: user!.id,
        })
        .select()
        .single();

      if (createError) {
        setError(createError.message);
        return;
      }

      subject = created as Subject;
    }

    setSubjects((prev) =>
      prev.some((s) => s.id === subject!.id) ? prev : [...prev, subject!]
    );
    setSubjectId(subject.id);
    setCustomSubjectName("");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!user || !profile?.university_id) return;
    if (!subjectId) {
      setError("Bitte einen Kurs auswählen.");
      return;
    }
    if (!file) {
      setError("Bitte eine Datei auswählen.");
      return;
    }

    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject || !universityName) {
      setError("Kurs konnte nicht geladen werden.");
      return;
    }

    setUploading(true);

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filePath = `${user.id}/${uniqueSuffix}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      setError(uploadError.message);
      return;
    }

    let thumbnailUrl: string | null = null;

    if (file.type === "application/pdf") {
      const thumbnailBlob = await generatePdfThumbnail(file);
      if (thumbnailBlob) {
        const thumbnailPath = `${user.id}/${uniqueSuffix}-thumb.png`;
        const { error: thumbnailUploadError } = await supabase.storage
          .from("documents")
          .upload(thumbnailPath, thumbnailBlob, { contentType: "image/png" });
        if (!thumbnailUploadError) {
          thumbnailUrl = supabase.storage.from("documents").getPublicUrl(thumbnailPath).data
            .publicUrl;
        }
      }
    } else if (file.type.startsWith("image/")) {
      thumbnailUrl = supabase.storage.from("documents").getPublicUrl(filePath).data.publicUrl;
    } else if (OFFICE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      const thumbnailBlob = await generateOfficeThumbnail(file);
      if (thumbnailBlob) {
        const extension = thumbnailBlob.type === "image/png" ? "png" : "jpg";
        const thumbnailPath = `${user.id}/${uniqueSuffix}-thumb.${extension}`;
        const { error: thumbnailUploadError } = await supabase.storage
          .from("documents")
          .upload(thumbnailPath, thumbnailBlob, { contentType: thumbnailBlob.type });
        if (!thumbnailUploadError) {
          thumbnailUrl = supabase.storage.from("documents").getPublicUrl(thumbnailPath).data
            .publicUrl;
        }
      }
    }

    const { error: insertError } = await supabase.from("documents").insert({
      title,
      description: description || null,
      subject: subject.name,
      university: universityName,
      subject_id: subjectId,
      document_type: documentType,
      file_url: filePath,
      thumbnail_url: thumbnailUrl,
      uploader_id: user.id,
      is_anonymous: isAnonymous,
    });

    if (insertError) {
      setUploading(false);
      setError(insertError.message);
      return;
    }

    await supabase
      .from("user_subjects")
      .upsert({ user_id: user.id, subject_id: subjectId }, { onConflict: "user_id,subject_id" });

    setUploading(false);

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-10 md:justify-center md:py-16">
      <h1 className="mb-4 text-2xl font-semibold">Neu erstellen</h1>

      <SegmentedToggle
        value={mode}
        onChange={setMode}
        fullWidth
        className="mb-6"
        options={[
          { value: "post", label: "Beitrag" },
          { value: "document", label: "Dokument" },
        ]}
      />

      {mode === "post" ? (
        <PostComposer
          placeholder="Was möchtest du teilen?"
          onCreated={() => {
            router.push("/");
            router.refresh();
          }}
        />
      ) : (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Titel
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Beschreibung (optional)
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </label>

        {universityName && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Universität: <span className="font-medium">{universityName}</span>
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Kurs
          <Combobox
            options={subjectOptions}
            value={subjectId}
            onChange={setSubjectId}
            placeholder="Kurs suchen..."
            emptyMessage="Nicht gefunden."
          />
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Fehlt dein Fach? Eigenen Kurs anlegen..."
            value={customSubjectName}
            onChange={(e) => setCustomSubjectName(e.target.value)}
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={handleAddCustomSubject}
            className="rounded-full border border-black/10 px-4 py-1.5 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
          >
            Anlegen
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Dokumententyp
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className={inputClass}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Datei (PDF, Word, PowerPoint, Bild)
          <input
            type="file"
            required
            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          Anonym hochladen (dein Name wird nicht angezeigt)
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={uploading}
          className="mt-2 rounded-full bg-accent px-5 py-2.5 text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {uploading ? "Wird hochgeladen..." : "Hochladen"}
        </button>
      </form>
      )}
    </div>
  );
}
