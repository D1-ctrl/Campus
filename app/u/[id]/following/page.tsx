"use client";

import { useParams } from "next/navigation";
import FollowList from "@/components/FollowList";

export default function FollowingPage() {
  const params = useParams<{ id: string }>();
  return <FollowList personId={params.id} mode="following" />;
}
