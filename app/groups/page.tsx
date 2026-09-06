"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Group } from "@/lib/types";

type GroupWithCount = Group & { group_members: { count: number }[] };

const inputClass =
  "rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent";

export default function GroupsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("groups")
      .select("*, group_members(count)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
    } else {
      setGroups((data ?? []) as unknown as GroupWithCount[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function handleCreate() {
    if (!user || !name.trim()) return;

    setCreating(true);
    setError(null);

    const { data: group, error: createError } = await supabase
      .from("groups")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        university_id: profile?.university_id ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError || !group) {
      setCreating(false);
      setError(createError?.message ?? "Fehler beim Erstellen.");
      return;
    }

    await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id });

    setCreating(false);
    setName("");
    setDescription("");
    setShowCreate(false);
    router.push(`/groups/${group.id}`);
  }

  if (authLoading || !user) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gruppen</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Vereine, Hobby-Gruppen & Co. – unabhängig von deinen Kursen.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90"
        >
          {showCreate ? "Abbrechen" : "Neue Gruppe"}
        </button>
      </div>

      {showCreate && (
        <div className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <input
            type="text"
            placeholder="Name der Gruppe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <textarea
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-fit rounded-full bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {creating ? "Wird erstellt..." : "Erstellen"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Noch keine Gruppen. Erstell die erste!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-sm transition-colors hover:bg-black/[.02] dark:border-white/15 dark:hover:bg-white/5"
              >
                <div>
                  <p className="font-medium">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {group.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {group.group_members?.[0]?.count ?? 0} Mitglieder
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
