export type HomepagePostSelection<T> =
  | { kind: "empty"; posts: [] }
  | { kind: "posts"; posts: T[] };

export function selectHomepagePosts<T>(posts: readonly T[]): HomepagePostSelection<T> {
  const selectedPosts = posts.slice(0, 2);
  return selectedPosts.length === 0
    ? { kind: "empty", posts: [] }
    : { kind: "posts", posts: selectedPosts };
}
