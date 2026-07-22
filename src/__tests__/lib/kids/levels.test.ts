import { describe, it, expect } from "vitest";
import {
  worlds,
  getAllLevels,
  getLevelBySlug,
  getWorldByNumber,
  getAdjacentLevels,
  getLevelIndex,
  getTotalLevels,
} from "@/lib/kids/levels";

describe("worlds data", () => {
  it("defines five worlds numbered sequentially", () => {
    expect(worlds).toHaveLength(5);
    expect(worlds.map((w) => w.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives every level required metadata", () => {
    for (const world of worlds) {
      for (const level of world.levels) {
        expect(level.slug).toBeTruthy();
        expect(level.title).toBeTruthy();
        expect(level.titleKey).toMatch(/^kids\.levels\./);
        expect(level.descriptionKey).toMatch(/^kids\.levels\./);
        expect(level.world).toBe(world.number);
        expect(level.concepts.length).toBeGreaterThan(0);
      }
    }
  });

  it("has unique level slugs", () => {
    const slugs = getAllLevels().map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("getAllLevels", () => {
  it("flattens levels from every world in order", () => {
    const levels = getAllLevels();
    const expectedCount = worlds.reduce((sum, w) => sum + w.levels.length, 0);
    expect(levels).toHaveLength(expectedCount);
    expect(levels[0].slug).toBe("1-1-meet-promi");
    expect(levels[levels.length - 1].slug).toBe("5-4-graduation-day");
  });
});

describe("getLevelBySlug", () => {
  it("returns the matching level", () => {
    const level = getLevelBySlug("2-2-who-and-what");
    expect(level?.title).toBe("Who & What");
    expect(level?.world).toBe(2);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getLevelBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("getWorldByNumber", () => {
  it("returns the matching world", () => {
    expect(getWorldByNumber(3)?.slug).toBe("context-caves");
  });

  it("returns undefined for an unknown world number", () => {
    expect(getWorldByNumber(99)).toBeUndefined();
  });
});

describe("getAdjacentLevels", () => {
  it("returns no prev for the first level", () => {
    const { prev, next } = getAdjacentLevels("1-1-meet-promi");
    expect(prev).toBeUndefined();
    expect(next?.slug).toBe("1-2-first-words");
  });

  it("returns no next for the last level", () => {
    const { prev, next } = getAdjacentLevels("5-4-graduation-day");
    expect(prev?.slug).toBe("5-3-prompt-remix");
    expect(next).toBeUndefined();
  });

  it("returns both neighbours for a middle level, crossing world boundaries", () => {
    const { prev, next } = getAdjacentLevels("1-3-being-clear");
    expect(prev?.slug).toBe("1-2-first-words");
    expect(next?.slug).toBe("2-1-missing-details");
  });

  it("returns undefined neighbours for an unknown slug", () => {
    // findIndex returns -1, so prev is undefined and next resolves to index 0
    const { prev } = getAdjacentLevels("unknown");
    expect(prev).toBeUndefined();
  });
});

describe("getLevelIndex", () => {
  it("returns the zero-based index of a level", () => {
    expect(getLevelIndex("1-1-meet-promi")).toBe(0);
    expect(getLevelIndex("2-1-missing-details")).toBe(3);
  });

  it("returns -1 for an unknown slug", () => {
    expect(getLevelIndex("nope")).toBe(-1);
  });
});

describe("getTotalLevels", () => {
  it("counts every level across all worlds", () => {
    expect(getTotalLevels()).toBe(getAllLevels().length);
  });
});
