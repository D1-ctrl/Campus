import { supabase } from "@/lib/supabase";
import type { Post, PollOption } from "@/lib/types";

export const POST_FEED_SELECT =
  "*, author:users!posts_author_id_fkey(display_name, avatar_url), subject:subjects(name), group:groups(name), post_comments(count), polls(id, poll_options(*))";

type RawPoll = { id: string; poll_options: PollOption[] };

export type RawFeedPost = Post & {
  author: { display_name: string | null; avatar_url: string | null } | null;
  subject: { name: string } | null;
  group: { name: string } | null;
  post_comments: { count: number }[];
  polls: RawPoll | RawPoll[] | null;
};

export type FeedPoll = RawPoll;

export type PostFeedItem = Post & {
  author: { display_name: string | null; avatar_url: string | null } | null;
  subject: { name: string } | null;
  group: { name: string } | null;
  comment_count: number;
  poll: FeedPoll | null;
  like_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  poll_vote_counts: Record<string, number>;
  my_poll_vote: string | null;
};

export async function enrichPosts(
  raw: RawFeedPost[],
  userId: string | null
): Promise<PostFeedItem[]> {
  if (raw.length === 0) return [];

  const postIds = raw.map((p) => p.id);
  const polls = raw
    .map((p) => (Array.isArray(p.polls) ? p.polls[0] ?? null : p.polls))
    .filter((p): p is RawPoll => !!p);
  const pollIds = polls.map((p) => p.id);

  const [likeCountsRes, likedByMeRes, savedByMeRes, voteCountsRes, myVotesRes] = await Promise.all([
    supabase.rpc("post_like_counts", { p_post_ids: postIds }),
    userId
      ? supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    userId
      ? supabase.from("post_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
    pollIds.length > 0
      ? supabase.rpc("poll_option_counts_bulk", { p_poll_ids: pollIds })
      : Promise.resolve({ data: [] as { poll_id: string; option_id: string; vote_count: number }[] }),
    userId && pollIds.length > 0
      ? supabase
          .from("poll_votes")
          .select("poll_id, option_id")
          .eq("user_id", userId)
          .in("poll_id", pollIds)
      : Promise.resolve({ data: [] as { poll_id: string; option_id: string }[] }),
  ]);

  const likeCountMap = new Map<string, number>(
    ((likeCountsRes.data ?? []) as { post_id: string; like_count: number }[]).map((r) => [
      r.post_id,
      r.like_count,
    ])
  );
  const likedByMeSet = new Set(
    ((likedByMeRes.data ?? []) as { post_id: string }[]).map((r) => r.post_id)
  );
  const savedByMeSet = new Set(
    ((savedByMeRes.data ?? []) as { post_id: string }[]).map((r) => r.post_id)
  );
  const voteCountMap = new Map<string, Record<string, number>>();
  ((voteCountsRes.data ?? []) as { poll_id: string; option_id: string; vote_count: number }[]).forEach(
    (r) => {
      const m = voteCountMap.get(r.poll_id) ?? {};
      m[r.option_id] = r.vote_count;
      voteCountMap.set(r.poll_id, m);
    }
  );
  const myVoteMap = new Map<string, string>(
    ((myVotesRes.data ?? []) as { poll_id: string; option_id: string }[]).map((r) => [
      r.poll_id,
      r.option_id,
    ])
  );

  return raw.map((p) => {
    const poll = Array.isArray(p.polls) ? p.polls[0] ?? null : p.polls;
    return {
      ...p,
      comment_count: p.post_comments?.[0]?.count ?? 0,
      poll,
      like_count: likeCountMap.get(p.id) ?? 0,
      liked_by_me: likedByMeSet.has(p.id),
      saved_by_me: savedByMeSet.has(p.id),
      poll_vote_counts: poll ? voteCountMap.get(poll.id) ?? {} : {},
      my_poll_vote: poll ? myVoteMap.get(poll.id) ?? null : null,
    };
  });
}
