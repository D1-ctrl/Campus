"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type PersonRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type FollowListProps = {
  personId: string;
  mode: "followers" | "following";
};

export default function FollowList({ personId, mode }: FollowListProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [people, setPeople] = useState<PersonRow[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const followQuery =
        mode === "followers"
          ? supabase.from("follows").select("follower_id").eq("followed_id", personId)
          : supabase.from("follows").select("followed_id").eq("follower_id", personId);

      const { data: followRows } = await followQuery;
      const ids = (
        mode === "followers"
          ? ((followRows ?? []) as { follower_id: string }[]).map((r) => r.follower_id)
          : ((followRows ?? []) as { followed_id: string }[]).map((r) => r.followed_id)
      ) as string[];

      if (ids.length === 0) {
        setPeople([]);
        setLoading(false);
        return;
      }

      const [{ data: peopleData }, { data: myFollowing }] = await Promise.all([
        supabase.from("users").select("id, display_name, username, avatar_url").in("id", ids),
        user
          ? supabase.from("follows").select("followed_id").eq("follower_id", user.id)
          : Promise.resolve({ data: [] as { followed_id: string }[] }),
      ]);

      setPeople((peopleData as PersonRow[]) ?? []);
      setFollowingIds(new Set((myFollowing ?? []).map((f) => f.followed_id)));
      setLoading(false);
    }

    load();
  }, [personId, mode, user]);

  async function toggleFollow(personToToggle: string) {
    if (!user) return;

    if (followingIds.has(personToToggle)) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", personToToggle);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(personToToggle);
        return next;
      });
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: personToToggle });
      setFollowingIds((prev) => new Set(prev).add(personToToggle));
    }
  }

  if (authLoading || !user) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10">
      <Link
        href={`/u/${personId}`}
        className="flex w-fit items-center gap-1 text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Zurück zum Profil
      </Link>
      <h1 className="text-xl font-semibold">{mode === "followers" ? "Follower" : "Folgt"}</h1>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
      ) : people.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "followers" ? "Noch keine Follower." : "Folgt noch niemandem."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-black/[.02] dark:hover:bg-white/5"
            >
              <Link href={`/u/${person.id}`} className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 text-sm font-medium dark:bg-white/10">
                  {person.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={person.avatar_url} alt="" className="h-10 w-10 object-cover" />
                  ) : (
                    (person.display_name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {person.display_name ?? "Unbekannt"}
                  </p>
                  {person.username && (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      @{person.username}
                    </p>
                  )}
                </div>
              </Link>
              {person.id !== user.id && (
                <button
                  onClick={() => toggleFollow(person.id)}
                  className={
                    followingIds.has(person.id)
                      ? "shrink-0 rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
                      : "shrink-0 rounded-full bg-accent px-3 py-1 text-xs text-white hover:bg-accent/90"
                  }
                >
                  {followingIds.has(person.id) ? "Folgst du" : "Folgen"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
