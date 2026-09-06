"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import type { Document, Profile } from "@/lib/types";
import { POST_FEED_SELECT, enrichPosts } from "@/lib/post-feed";
import type { PostFeedItem, RawFeedPost } from "@/lib/post-feed";
import DocumentCard from "@/components/DocumentCard";
import PostCard from "@/components/PostCard";
import StoriesBar from "@/components/StoriesBar";
import SegmentedToggle from "@/components/SegmentedToggle";
import AdBanner from "@/components/AdBanner";
import SearchFilter from "@/components/SearchFilter";
import type { Filters } from "@/components/SearchFilter";
import LandingPage from "@/components/LandingPage";

type DocumentWithUploader = Document & {
  uploader: { display_name: string | null; avatar_url: string | null } | null;
};

type FeedItem =
  | { type: "document"; created_at: string; data: DocumentWithUploader }
  | { type: "post"; created_at: string; data: PostFeedItem };

const EMPTY_FILTERS: Filters = {
  search: "",
  subject: "",
  university: "",
  documentType: "",
};

export default function Home() {
  const { user, profile } = useAuth();

  if (!user) {
    return <LandingPage />;
  }

  return <HomeFeed user={user} profile={profile} />;
}

function HomeFeed({ user, profile }: { user: User; profile: Profile | null }) {

  const [tab, setTab] = useState<"uni" | "neu">("uni");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [hasSubjects, setHasSubjects] = useState(false);

  const [friendsFeed, setFriendsFeed] = useState<PostFeedItem[]>([]);
  const [friendsFeedLoading, setFriendsFeedLoading] = useState(true);
  const [friendsFeedLoaded, setFriendsFeedLoaded] = useState(false);
  const [hasFollows, setHasFollows] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);

    const [{ data: subjectRows }, { data: groupRows }] = await Promise.all([
      supabase.from("user_subjects").select("subject_id").eq("user_id", user.id),
      supabase.from("group_members").select("group_id").eq("user_id", user.id),
    ]);

    const subjectIds = (subjectRows ?? []).map((r) => r.subject_id);
    const groupIds = (groupRows ?? []).map((r) => r.group_id);
    setHasSubjects(subjectIds.length > 0);

    const [{ data: docs }, { data: subjectPosts }, { data: groupPosts }, { data: generalPosts }] =
      await Promise.all([
        subjectIds.length > 0
          ? supabase
              .from("documents")
              .select("*, uploader:users!documents_uploader_id_fkey(display_name, avatar_url)")
              .in("subject_id", subjectIds)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as DocumentWithUploader[] }),
        subjectIds.length > 0
          ? supabase
              .from("posts")
              .select(POST_FEED_SELECT)
              .in("subject_id", subjectIds)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as RawFeedPost[] }),
        groupIds.length > 0
          ? supabase
              .from("posts")
              .select(POST_FEED_SELECT)
              .in("group_id", groupIds)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as RawFeedPost[] }),
        profile?.university_id
          ? supabase
              .from("posts")
              .select(POST_FEED_SELECT)
              .eq("university_id", profile.university_id)
              .eq("scope", "uni")
              .is("subject_id", null)
              .is("group_id", null)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] as RawFeedPost[] }),
      ]);

    const rawPosts = [
      ...((subjectPosts ?? []) as unknown as RawFeedPost[]),
      ...((groupPosts ?? []) as unknown as RawFeedPost[]),
      ...((generalPosts ?? []) as unknown as RawFeedPost[]),
    ];
    const enrichedPosts = await enrichPosts(rawPosts, user.id);

    const items: FeedItem[] = [
      ...((docs ?? []) as unknown as DocumentWithUploader[]).map(
        (d): FeedItem => ({ type: "document", created_at: d.created_at, data: d })
      ),
      ...enrichedPosts.map((p): FeedItem => ({ type: "post", created_at: p.created_at, data: p })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFeed(items);
    setFeedLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (tab !== "neu" || friendsFeedLoaded) return;

    async function loadFriendsFeed() {
      setFriendsFeedLoading(true);

      const { data: followRows } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id);

      const followedIds = (followRows ?? []).map((f) => f.followed_id);
      setHasFollows(followedIds.length > 0);

      const authorIds = [...followedIds, user.id];

      const { data: posts } = await supabase
        .from("posts")
        .select(POST_FEED_SELECT)
        .in("author_id", authorIds)
        .eq("scope", "profile")
        .order("created_at", { ascending: false })
        .limit(30);

      const enriched = await enrichPosts((posts ?? []) as unknown as RawFeedPost[], user.id);
      setFriendsFeed(enriched);
      setFriendsFeedLoading(false);
      setFriendsFeedLoaded(true);
    }

    loadFriendsFeed();
  }, [user, tab, friendsFeedLoaded]);

  useEffect(() => {
    if (!showSearch) return;

    let cancelled = false;

    async function fetchDocuments() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("documents")
        .select("*, uploader:users!documents_uploader_id_fkey(display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(60);

      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.subject) query = query.ilike("subject", `%${filters.subject}%`);
      if (filters.university)
        query = query.ilike("university", `%${filters.university}%`);
      if (filters.documentType)
        query = query.eq("document_type", filters.documentType);

      const { data, error } = await query;

      if (cancelled) return;

      if (error) {
        setError(error.message);
      } else {
        setDocuments((data ?? []) as unknown as DocumentWithUploader[]);
      }
      setLoading(false);
    }

    fetchDocuments();

    return () => {
      cancelled = true;
    };
  }, [filters, showSearch]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-6">
      <div className="flex flex-col gap-4">
        <StoriesBar />

          <SegmentedToggle
            value={tab}
            onChange={setTab}
            fullWidth
            options={[
              { value: "neu", label: "Neu" },
              { value: "uni", label: "Uni" },
            ]}
          />

          {tab === "neu" ? (
            friendsFeedLoading ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
            ) : friendsFeed.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {!hasFollows
                  ? "Du folgst noch niemandem. Nutze die Suche oben, um Leute zu finden und hier ihre Profil-Beiträge zu sehen."
                  : "Noch keine Profil-Beiträge von dir oder den Leuten, denen du folgst."}
              </p>
            ) : (
              <div className="flex flex-col gap-6">
                {friendsFeed.map((post, index) => (
                  <div key={post.id} className="flex flex-col gap-3">
                    <PostCard post={post} />
                    {index > 0 && (index + 1) % 4 === 0 && <AdBanner />}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col gap-4">
              {feedLoading ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
              ) : feed.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Noch nichts Neues an deiner Uni.{" "}
                  {!hasSubjects && (
                    <>
                      <Link href="/subjects" className="underline">
                        Tritt Kursen bei
                      </Link>
                      , um auch Kurs-Beiträge zu sehen.
                    </>
                  )}
                </p>
              ) : (
                <div className="flex flex-col gap-6">
                  {feed.map((item, index) => (
                    <div key={`item-${item.data.id}`} className="flex flex-col gap-3">
                      {item.type === "document" ? (
                        <DocumentCard document={item.data} />
                      ) : (
                        <PostCard post={item.data} />
                      )}
                      {index > 0 && (index + 1) % 4 === 0 && <AdBanner />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => setShowSearch((v) => !v)}
          className="w-fit text-sm font-medium underline"
        >
          {showSearch ? "Suche ausblenden" : "Alle Lernmaterialien durchsuchen"}
        </button>

        {showSearch && (
          <>
            <SearchFilter filters={filters} onChange={setFilters} />

            {loading ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Lädt...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Keine Dokumente gefunden.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
