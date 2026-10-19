import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("check", () => {
    it("allows requests up to the configured max", () => {
      const limiter = new RateLimiter({ max: 3, windowSeconds: 60 });

      const first = limiter.check("user-1");
      const second = limiter.check("user-1");
      const third = limiter.check("user-1");

      expect(first).toEqual({ allowed: true, remaining: 2 });
      expect(second).toEqual({ allowed: true, remaining: 1 });
      expect(third).toEqual({ allowed: true, remaining: 0 });
    });

    it("rejects requests once the max is exceeded within the window", () => {
      const limiter = new RateLimiter({ max: 2, windowSeconds: 60 });

      limiter.check("user-1");
      limiter.check("user-1");
      const result = limiter.check("user-1");

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.retryAfterSeconds).toBe(60);
      }
    });

    it("computes retryAfterSeconds from the oldest timestamp in the window", () => {
      const limiter = new RateLimiter({ max: 1, windowSeconds: 60 });

      limiter.check("user-1");
      // 20s later, the window still contains the first request
      vi.advanceTimersByTime(20_000);
      const result = limiter.check("user-1");

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        // 60s window - 20s elapsed = 40s until the oldest timestamp leaves
        expect(result.retryAfterSeconds).toBe(40);
      }
    });

    it("allows a new request after the window slides past old timestamps", () => {
      const limiter = new RateLimiter({ max: 1, windowSeconds: 60 });

      expect(limiter.check("user-1").allowed).toBe(true);
      expect(limiter.check("user-1").allowed).toBe(false);

      // Advance beyond the window
      vi.advanceTimersByTime(61_000);

      expect(limiter.check("user-1")).toEqual({ allowed: true, remaining: 0 });
    });

    it("tracks identifiers independently", () => {
      const limiter = new RateLimiter({ max: 1, windowSeconds: 60 });

      expect(limiter.check("user-1").allowed).toBe(true);
      expect(limiter.check("user-2").allowed).toBe(true);
      expect(limiter.check("user-1").allowed).toBe(false);
      expect(limiter.check("user-2").allowed).toBe(false);
    });

    it("rounds retryAfterSeconds up to the next whole second", () => {
      const limiter = new RateLimiter({ max: 1, windowSeconds: 1 });

      limiter.check("user-1");
      vi.advanceTimersByTime(500);
      const result = limiter.check("user-1");

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        // 500ms remaining -> ceil to 1s
        expect(result.retryAfterSeconds).toBe(1);
      }
    });
  });

  describe("cleanup", () => {
    it("removes stale entries on the scheduled interval", () => {
      const limiter = new RateLimiter({ max: 5, windowSeconds: 60 });

      limiter.check("user-1");
      // @ts-expect-error accessing private store for assertion
      expect(limiter.store.has("user-1")).toBe(true);

      // Move past the window and trigger the 60s cleanup interval
      vi.advanceTimersByTime(120_000);

      // @ts-expect-error accessing private store for assertion
      expect(limiter.store.has("user-1")).toBe(false);
    });
  });
});
