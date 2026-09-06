"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import ProfileHighlights from "@/components/ProfileHighlights";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  university: { name: string } | null;
  study_program: { name: string } | null;
};

type PostImage = {
  id: string;
  image_url: string;
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const personId = params.id;
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [person, setPerson] = useState<ProfileRow | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postImages, setPostImages] = useState<PostImage[]>([]);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      { data: personData, error: personError },
      { data: followers },
      { data: following },
      { data: images },
    ] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, display_name, username, avatar_url, university:universities(name), study_program:study_programs(name)"
        )
        .eq("id", personId)
        .single(),
      supabase.from("follows").select("follower_id").eq("followed_id", personId),
      supabase.from("follows").select("followed_id").eq("follower_id", personId),
      supabase
        .from("posts")
        .select("id, image_url")
        .eq("author_id", personId)
        .eq("is_anonymous", false)
        .eq("scope", "profile")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (personError) {
      setError(personError.message);
      setLoading(false);
      return;
    }

    setPerson(personData as unknown as ProfileRow);
    setFollowerCount(followers?.length ?? 0);
    setFollowingCount(following?.length ?? 0);
    setPostImages((images as unknown as PostImage[]) ?? []);

    if (user) {
      setIsFollowing(
        (followers ?? []).some((f: { follower_id: string }) => f.follower_id === user.id)
      );
    }

    setLoading(false);
  }, [personId, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function toggleFollow() {
    if (!user) return;

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", personId);
      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: personId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  async function startConversation() {
    if (!user || startingChat) return;
    setStartingChat(true);
    const { data, error: rpcError } = await supabase.rpc("get_or_create_conversation", {
      other_user_id: personId,
    });
    setStartingChat(false);
    if (rpcError || !data) return;
    router.push(`/messages/${data}`);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (authLoading || !user || loading) {
    return (
      <p className="px-6 py-10 text-sm text-zinc-600 dark:text-zinc-400">
        Lädt...
      </p>
    );
  }

  if (error || !person) {
    return (
      <p className="px-6 py-10 text-sm text-red-600">
        {error ?? "Nutzer nicht gefunden."}
      </p>
    );
  }

  const isOwnProfile = user.id === personId;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-6 py-6 text-center md:py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/10 text-2xl dark:bg-white/10">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt=""
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          (person.display_name || "?").charAt(0).toUpperCase()
        )}
      </div>
      <div>
        <h1 className="text-xl font-semibold">{person.display_name ?? "Unbekannt"}</h1>
        {person.username && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">@{person.username}</p>
        )}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {person.study_program?.name}
          {person.study_program?.name && person.university?.name ? " · " : ""}
          {person.university?.name}
        </p>
      </div>

      <div className="grid w-full grid-cols-3 text-sm md:hidden">
        <div>
          <p className="font-semibold">{postImages.length}</p>
          <p className="text-zinc-600 dark:text-zinc-400">Posts</p>
        </div>
        <Link href={`/u/${personId}/followers`} className="hover:underline">
          <p className="font-semibold">{followerCount}</p>
          <p className="text-zinc-600 dark:text-zinc-400">Follower</p>
        </Link>
        <Link href={`/u/${personId}/following`} className="hover:underline">
          <p className="font-semibold">{followingCount}</p>
          <p className="text-zinc-600 dark:text-zinc-400">Folgt</p>
        </Link>
      </div>

      <div className="hidden gap-6 text-sm md:flex">
        <Link href={`/u/${personId}/followers`} className="hover:underline">
          <p className="font-semibold">{followerCount}</p>
          <p className="text-zinc-600 dark:text-zinc-400">Follower</p>
        </Link>
        <Link href={`/u/${personId}/following`} className="hover:underline">
          <p className="font-semibold">{followingCount}</p>
          <p className="text-zinc-600 dark:text-zinc-400">Folgt</p>
        </Link>
      </div>

      {isOwnProfile ? (
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/settings/profile"
            className="rounded-full border border-black/10 px-5 py-2 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
          >
            Profil bearbeiten
          </Link>
          <div className="flex items-center gap-3 text-xs">
            {profile?.is_admin && (
              <Link href="/admin" className="underline">
                Admin
              </Link>
            )}
            <button onClick={handleLogout} className="underline">
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={toggleFollow}
            className={
              isFollowing
                ? "rounded-full border border-black/10 px-5 py-2 text-sm hover:bg-black/[.04] dark:border-white/15 dark:hover:bg-white/10"
                : "rounded-full bg-accent px-5 py-2 text-sm text-white hover:bg-accent/90"
            }
          >
            {isFollowing ? "Folgst du" : "Folgen"}
          </button>
          <button
            onClick={startConversation}
            disabled={startingChat}
            className="rounded-full border border-black/10 px-5 py-2 text-sm hover:bg-black/[.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
          >
            Nachricht
          </button>
        </div>
      )}

      <div className="md:hidden">
        <ProfileHighlights userId={personId} />
      </div>

      {postImages.length > 0 && (
        <div className="w-full text-left">
          <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Profilbeiträge
          </p>
          <div className="grid grid-cols-3 gap-1">
            {postImages.map((img) => (
              <Link
                key={img.id}
                href={`/community/${img.id}`}
                className="aspect-square overflow-hidden rounded-sm bg-black/5 dark:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt=""
                  className="h-full w-full object-cover transition-opacity hover:opacity-90"
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
