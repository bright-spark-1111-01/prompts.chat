import { describe, it, expect } from "vitest";
import {
  apiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
} from "@/lib/api-response";

describe("apiError", () => {
  it("builds a response with the given error and status", async () => {
    const res = apiError("boom", 418);
    expect(res.status).toBe(418);
    await expect(res.json()).resolves.toEqual({ error: "boom" });
  });

  it("merges extra fields into the body", async () => {
    const res = apiError("nope", 400, { message: "details", code: 7 });
    await expect(res.json()).resolves.toEqual({
      error: "nope",
      message: "details",
      code: 7,
    });
  });
});

describe("status helpers", () => {
  it("unauthorized defaults to 401 / Unauthorized", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("forbidden defaults to 403 / Forbidden", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("notFound defaults to 404", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
  });

  it("badRequest defaults to 400", async () => {
    const res = badRequest();
    expect(res.status).toBe(400);
  });

  it("serverError defaults to 500", async () => {
    const res = serverError();
    expect(res.status).toBe(500);
  });

  it("accepts a custom message", async () => {
    const res = unauthorized("nope");
    await expect(res.json()).resolves.toEqual({ error: "nope" });
  });
});
