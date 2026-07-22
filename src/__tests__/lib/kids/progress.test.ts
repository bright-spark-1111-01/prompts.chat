import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProgress,
  saveProgress,
  completeLevel,
  isLevelUnlocked,
  getLevelProgress,
  resetProgress,
  getCompletedLevelsCount,
  getTotalStars,
  getComponentState,
  saveComponentState,
  clearComponentState,
  clearAllProgress,
  isSectionCompleted,
  markSectionCompleted,
  clearSectionCompletion,
  hasCompletedInteraction,
} from "@/lib/kids/progress";
import { getAllLevels } from "@/lib/kids/levels";

const firstSlug = getAllLevels()[0].slug;
const secondSlug = getAllLevels()[1].slug;

describe("kids/progress", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getProgress / saveProgress", () => {
    it("returns default progress when nothing is stored", () => {
      expect(getProgress()).toEqual({ levels: {}, totalStars: 0 });
    });

    it("round-trips saved progress", () => {
      saveProgress({ levels: { a: { completed: true, stars: 2 } }, totalStars: 2 });
      expect(getProgress()).toEqual({
        levels: { a: { completed: true, stars: 2 } },
        totalStars: 2,
      });
    });

    it("returns default progress when stored JSON is corrupt", () => {
      localStorage.setItem("kids-progress", "{not-json");
      expect(getProgress()).toEqual({ levels: {}, totalStars: 0 });
    });

    it("swallows errors when localStorage.setItem throws", () => {
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota exceeded");
      });
      expect(() => saveProgress({ levels: {}, totalStars: 0 })).not.toThrow();
      spy.mockRestore();
    });
  });

  describe("completeLevel", () => {
    it("marks a level completed, awards stars, and advances currentLevel", () => {
      const progress = completeLevel(firstSlug, 3);

      expect(progress.levels[firstSlug]).toMatchObject({ completed: true, stars: 3 });
      expect(progress.levels[firstSlug].completedAt).toBeTruthy();
      expect(progress.totalStars).toBe(3);
      expect(progress.currentLevel).toBe(secondSlug);
    });

    it("clamps stars into the 0-3 range", () => {
      expect(completeLevel(firstSlug, 99).levels[firstSlug].stars).toBe(3);
      localStorage.clear();
      expect(completeLevel(firstSlug, -5).levels[firstSlug].stars).toBe(0);
    });

    it("only increases stars, never decreases them", () => {
      completeLevel(firstSlug, 3);
      const progress = completeLevel(firstSlug, 1);
      expect(progress.levels[firstSlug].stars).toBe(3);
      expect(progress.totalStars).toBe(3);
    });

    it("does not set currentLevel past the last level", () => {
      const lastSlug = getAllLevels()[getAllLevels().length - 1].slug;
      const progress = completeLevel(lastSlug, 3);
      expect(progress.currentLevel).toBeUndefined();
    });
  });

  describe("isLevelUnlocked", () => {
    it("always unlocks the first level", () => {
      expect(isLevelUnlocked(firstSlug)).toBe(true);
    });

    it("locks a level until the previous one is completed", () => {
      expect(isLevelUnlocked(secondSlug)).toBe(false);
      completeLevel(firstSlug, 1);
      expect(isLevelUnlocked(secondSlug)).toBe(true);
    });
  });

  describe("getLevelProgress", () => {
    it("returns undefined for an untouched level", () => {
      expect(getLevelProgress(firstSlug)).toBeUndefined();
    });

    it("returns stored progress for a completed level", () => {
      completeLevel(firstSlug, 2);
      expect(getLevelProgress(firstSlug)).toMatchObject({ completed: true, stars: 2 });
    });
  });

  describe("counters", () => {
    it("counts completed levels and total stars", () => {
      completeLevel(firstSlug, 2);
      completeLevel(secondSlug, 3);
      expect(getCompletedLevelsCount()).toBe(2);
      expect(getTotalStars()).toBe(5);
    });
  });

  describe("resetProgress", () => {
    it("removes stored progress", () => {
      completeLevel(firstSlug, 3);
      resetProgress();
      expect(getProgress()).toEqual({ levels: {}, totalStars: 0 });
    });
  });

  describe("component state", () => {
    it("returns null when no state exists", () => {
      expect(getComponentState("level-a", "widget-1")).toBeNull();
    });

    it("saves and retrieves typed component state", () => {
      saveComponentState("level-a", "widget-1", { value: 42 });
      expect(getComponentState<{ value: number }>("level-a", "widget-1")).toEqual({ value: 42 });
    });

    it("clears state for a single level only", () => {
      saveComponentState("level-a", "widget-1", { value: 1 });
      saveComponentState("level-b", "widget-1", { value: 2 });
      clearComponentState("level-a");
      expect(getComponentState("level-a", "widget-1")).toBeNull();
      expect(getComponentState("level-b", "widget-1")).toEqual({ value: 2 });
    });

    it("returns null on corrupt state", () => {
      localStorage.setItem("kids-component-state", "not-json");
      expect(getComponentState("level-a", "widget-1")).toBeNull();
    });

    it("swallows errors when saving over corrupt state", () => {
      localStorage.setItem("kids-component-state", "not-json");
      expect(() => saveComponentState("level-a", "widget-1", { value: 1 })).not.toThrow();
    });

    it("swallows errors when clearing corrupt state", () => {
      localStorage.setItem("kids-component-state", "not-json");
      expect(() => clearComponentState("level-a")).not.toThrow();
    });

    it("does nothing when clearing a level with no stored state", () => {
      expect(() => clearComponentState("level-a")).not.toThrow();
    });
  });

  describe("clearAllProgress", () => {
    it("removes both progress and component state", () => {
      completeLevel(firstSlug, 3);
      saveComponentState("level-a", "widget-1", { value: 1 });
      clearAllProgress();
      expect(getProgress()).toEqual({ levels: {}, totalStars: 0 });
      expect(getComponentState("level-a", "widget-1")).toBeNull();
    });

    it("swallows errors when localStorage.removeItem throws", () => {
      const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("boom");
      });
      expect(() => clearAllProgress()).not.toThrow();
      spy.mockRestore();
    });
  });

  describe("section completion", () => {
    it("defaults to not completed", () => {
      expect(isSectionCompleted("level-a", 0)).toBe(false);
    });

    it("marks and reads section completion", () => {
      markSectionCompleted("level-a", 2);
      expect(isSectionCompleted("level-a", 2)).toBe(true);
      expect(isSectionCompleted("level-a", 1)).toBe(false);
    });

    it("clears section completion for a level", () => {
      markSectionCompleted("level-a", 0);
      clearSectionCompletion("level-a");
      expect(isSectionCompleted("level-a", 0)).toBe(false);
    });

    it("returns false when reading corrupt section state", () => {
      localStorage.setItem("kids-section-completion", "not-json");
      expect(isSectionCompleted("level-a", 0)).toBe(false);
    });

    it("swallows errors when marking over corrupt section state", () => {
      localStorage.setItem("kids-section-completion", "not-json");
      expect(() => markSectionCompleted("level-a", 0)).not.toThrow();
    });

    it("swallows errors when clearing corrupt section state", () => {
      localStorage.setItem("kids-section-completion", "not-json");
      expect(() => clearSectionCompletion("level-a")).not.toThrow();
    });

    it("does nothing when clearing sections with no stored state", () => {
      expect(() => clearSectionCompletion("level-a")).not.toThrow();
    });
  });

  describe("hasCompletedInteraction", () => {
    it("returns false when no components are stored", () => {
      expect(hasCompletedInteraction("level-a")).toBe(false);
    });

    it("detects a completed interactive component", () => {
      saveComponentState("level-a", "quiz-1", { completed: true });
      expect(hasCompletedInteraction("level-a")).toBe(true);
    });

    it("filters by component id prefix", () => {
      saveComponentState("level-a", "quiz-1", { completed: true });
      expect(hasCompletedInteraction("level-a", "puzzle")).toBe(false);
      expect(hasCompletedInteraction("level-a", "quiz")).toBe(true);
    });

    it("returns false when component state exists but nothing is completed", () => {
      saveComponentState("level-a", "quiz-1", { completed: false });
      expect(hasCompletedInteraction("level-a")).toBe(false);
    });

    it("returns false for a level with no stored component state", () => {
      saveComponentState("level-b", "quiz-1", { completed: true });
      expect(hasCompletedInteraction("level-a")).toBe(false);
    });

    it("returns false on corrupt component state", () => {
      localStorage.setItem("kids-component-state", "not-json");
      expect(hasCompletedInteraction("level-a")).toBe(false);
    });
  });
});