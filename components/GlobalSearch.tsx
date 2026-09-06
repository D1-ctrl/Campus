"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/recent-searches";
import type { RecentSearchItem } from "@/lib/recent-searches";

type DocResult = { id: string; title: string; subject: string };
type SubjectResult = { id: string; name: string; university: { name: string } | null };
type PersonResult = {
  id: string;
  display_name: string | null;
  username: string | null;
  university: { name: string } | null;
};

type GlobalSearchProps = {
  alwaysOpen?: boolean;
  autoFocus?: boolean;
};

export default function GlobalSearch({ alwaysOpen = false, autoFocus = false }: GlobalSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocResult[]>([]);
  const [subjects, setSubjects] = useState<SubjectResult[]>([]);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [recent, setRecent] = useState<RecentSearchItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  function recordVisit(item: RecentSearchItem) {
    addRecentSearch(item);
    setRecent(getRecentSearches());
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecent([]);
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !user) {
      setDocs([]);
      setSubjects([]);
      setPeople([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const [{ data: docData }, { data: subjectData }, { data: peopleData }] =
        await Promise.all([
          supabase
            .from("documents")
            .select("id, title, subject")
            .ilike("title", `%${trimmed}%`)
            .limit(5),
          supabase
            .from("subjects")
            .select("id, name, university:universities(name)")
            .ilike("name", `%${trimmed}%`)
            .limit(5),
          supabase
            .from("users")
            .select("id, display_name, username, university:universities(name)")
            .or(`display_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`)
            .neq("id", user.id)
            .limit(5),
        ]);

      setDocs((docData as DocResult[]) ?? []);
      setSubjects((subjectData as unknown as SubjectResult[]) ?? []);
      setPeople((peopleData as unknown as PersonResult[]) ?? []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = docs.length > 0 || subjects.length > 0 || people.length > 0;
  const showDropdown = (alwaysOpen || open) && query.trim().length >= 2;
  const showRecent = (alwaysOpen || open) && query.trim().length < 2 && recent.length > 0;

  function closeAndClear() {
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        autoFocus={autoFocus}
        placeholder="Suche Dokumente, Kurse & Freunde"
        className="w-full rounded-full border border-black/10 bg-black/[.02] px-4 py-2 text-sm dark:border-white/15 dark:bg-white/5"
      />

      {showRecent && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-96 overflow-auto rounded-md border border-black/10 bg-[var(--background)] py-2 text-sm shadow-lg dark:border-white/15">
          <div className="flex items-center justify-between px-4 py-1">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              Kürzlich besucht
            </p>
            <button
              onClick={handleClearRecent}
              aria-label="Verlauf löschen"
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
          {recent.map((item) => {
            const href =
              item.type === "document"
                ? `/document/${item.id}`
                : item.type === "subject"
                  ? `/subjects/${item.id}`
                  : `/u/${item.id}`;
            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={href}
                onClick={closeAndClear}
                className="flex items-center gap-2 px-4 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/10"
              >
                <Clock size={13} strokeWidth={1.75} className="flex-shrink-0 text-zinc-400" />
                <span className="font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.sublabel}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-96 overflow-auto rounded-md border border-black/10 bg-[var(--background)] py-2 text-sm shadow-lg dark:border-white/15">
          {loading ? (
            <p className="px-4 py-2 text-zinc-500 dark:text-zinc-400">Suche...</p>
          ) : !hasResults ? (
            <p className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
              Keine Treffer.
            </p>
          ) : (
            <>
              {docs.length > 0 && (
                <div className="mb-1">
                  <p className="px-4 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Dokumente
                  </p>
                  {docs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/document/${doc.id}`}
                      onClick={() => {
                        recordVisit({ type: "document", id: doc.id, label: doc.title, sublabel: doc.subject });
                        closeAndClear();
                      }}
                      className="block px-4 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/10"
                    >
                      <span className="font-medium">{doc.title}</span>
                      <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {doc.subject}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {subjects.length > 0 && (
                <div className="mb-1">
                  <p className="px-4 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Kurse
                  </p>
                  {subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/subjects/${subject.id}`}
                      onClick={() => {
                        recordVisit({
                          type: "subject",
                          id: subject.id,
                          label: subject.name,
                          sublabel: subject.university?.name,
                        });
                        closeAndClear();
                      }}
                      className="block px-4 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/10"
                    >
                      <span className="font-medium">{subject.name}</span>
                      {subject.university?.name && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {subject.university.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {people.length > 0 && (
                <div>
                  <p className="px-4 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Freunde
                  </p>
                  {people.map((person) => (
                    <Link
                      key={person.id}
                      href={`/u/${person.id}`}
                      onClick={() => {
                        recordVisit({
                          type: "person",
                          id: person.id,
                          label: person.display_name ?? "Unbekannt",
                          sublabel: person.username ? `@${person.username}` : undefined,
                        });
                        closeAndClear();
                      }}
                      className="block px-4 py-1.5 hover:bg-black/[.04] dark:hover:bg-white/10"
                    >
                      <span className="font-medium">
                        {person.display_name ?? "Unbekannt"}
                      </span>
                      {person.username && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          @{person.username}
                        </span>
                      )}
                      {person.university?.name && (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {person.university.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
