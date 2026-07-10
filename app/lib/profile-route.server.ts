import { data } from "react-router";

import { getProfile } from "~/lib/profile.server";

export async function loadProfileCounts(username: string) {
  const profile = await getProfile(username);
  if (profile === null) {
    throw data("Not found", { status: 404 });
  }
  return {
    user: {
      id: profile.user.id,
      username: profile.user.username ?? username,
      name: profile.user.name,
    },
    bio: profile.bio,
    counts: {
      films: profile.counts.films,
      diary: profile.counts.diary,
      reviews: profile.counts.reviews,
      lists: profile.counts.lists,
      watchlist: profile.counts.watchlist,
      likes: profile.counts.liked,
      followers: profile.counts.followers,
      following: profile.counts.following,
      watched: profile.counts.watched,
    },
    favorites: profile.favorites,
  };
}

export function viewerFromSession(
  session: { user: { username?: string | null } } | null,
): { username: string } | null {
  const username = session?.user.username;
  if (username === null || username === undefined) {
    return null;
  }
  return { username };
}
