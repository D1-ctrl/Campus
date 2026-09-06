"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import DocumentCard from "@/components/DocumentCard";
import PostCard from "@/components/PostCard";
import { POST_FEED_SELECT, enrichPosts } from "@/lib/post-feed";
import type { PostFeedItem, RawFeedPost } from "@/lib/post-feed";
import type { Document } from "@/lib/types";

type DocumentWithUploader = Document & {
  uploader: { display_name: string | null; avatar_url: string | null } | null;
};

type FavoriteRow = {
  document: DocumentWithUploader | null;
};

type BookmarkRow = {
  post: RawFeedPost | null;
};

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [posts, setPosts] = useState<PostFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    async function loadAll() {
      setLoading(true);
      setError(null);

      const [{ data: favData, error: favError }, { data: bookmarkData, error: bookmarkError }] =
        await Promise.all([
          supabase
            .from("favorites")
            .select(
              "document:documents(*, uploader:users!documents_uploader_id_fkey(display_name, avatar_url))"
            )
            .eq("user_id", user!.id),
          supabase
            .from("post_bookmarks")
            .select(`post:posts(${POST_FEED_SELECT})`)
            .eq("user_id", user!.id),
        ]);

      if (favError) {
        setError(favError.message);
      } else {
        const rows = (favData ?? []) as unknown as FavoriteRow[];
        setDocuments(rows.map((row) => row.document).filter(Boolean) as DocumentWithUploader[]);
      }

      if (bookmarkError) {
        setError(bookmarkError.message);
      } else {
        const rows = (bookmarkData ?? []) as unknown as BookmarkRow[];
        const rawPosts = rows.map((row) => row.post).filter(Boolean) as RawFeedPost[];
        const enriched = await enrichPosts(rawPosts, user!.id);
        setPosts(enriched);
      }

      setLoading(false);
    }

    loadAll();
  }, [user]);

  if (authLoading || !user) {
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Meine Favoriten</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Deine gespeicherten Lernmaterialien.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Du hast noch keine Favoriten gespeichert.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold">Gespeicherte Beiträge</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Community-Posts, die du dir gemerkt hast.
          </p>
        </div>

        {loading ? null : posts.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Noch keine gespeicherten Beiträge.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
