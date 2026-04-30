import { describe, expect, it } from "vitest";
import { queryKeys } from "@pretou/shared";

describe("queryKeys", () => {
  it("produces hierarchical post list keys partitioned by commune", () => {
    const a = queryKeys.posts.list("commune-1");
    const b = queryKeys.posts.list("commune-2");
    expect(a[0]).toBe("posts");
    expect(a[1]).toBe("commune-1");
    expect(b[1]).toBe("commune-2");
  });

  it("distinguishes list vs detail vs pinned for the same commune", () => {
    const list = queryKeys.posts.list("c");
    const pinned = queryKeys.posts.pinned("c");
    const detail = queryKeys.posts.detail("post-1");
    expect(list).not.toEqual(pinned);
    expect(list).not.toEqual(detail);
    expect(pinned).not.toEqual(detail);
  });

  it("includes filter object in the list key so invalidation can be scoped", () => {
    const unfiltered = queryKeys.posts.list("c");
    const filtered = queryKeys.posts.list("c", { types: ["annonce"] });
    expect(unfiltered).not.toEqual(filtered);
  });

  it("partitions profile keys by user id", () => {
    expect(queryKeys.profile("user-1")).not.toEqual(queryKeys.profile("user-2"));
    expect(queryKeys.profile("user-1")[0]).toBe("profile");
  });

  it("returns a tuple-like readonly array", () => {
    const key = queryKeys.commune("c-1");
    expect(Array.isArray(key)).toBe(true);
    expect(key).toEqual(["commune", "c-1"]);
  });
});
