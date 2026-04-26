import { describe, expect, it } from "vitest";
import { queryKeys } from "@rural-community-platform/shared";

describe("queryKeys.me", () => {
  it("partitions per-user content keys", () => {
    expect(queryKeys.me.posts("u-1")).not.toEqual(queryKeys.me.posts("u-2"));
    expect(queryKeys.me.posts("u-1")).not.toEqual(queryKeys.me.rsvps("u-1"));
  });

  it("starts each me-key with 'me' + userId for hierarchical invalidation", () => {
    const posts = queryKeys.me.posts("u-1") as readonly unknown[];
    const rsvps = queryKeys.me.rsvps("u-1") as readonly unknown[];
    expect(posts[0]).toBe("me");
    expect(posts[1]).toBe("u-1");
    expect(rsvps[0]).toBe("me");
    expect(rsvps[1]).toBe("u-1");
  });
});
