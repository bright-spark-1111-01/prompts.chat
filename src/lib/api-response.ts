import { NextResponse } from "next/server";

/** Extra fields merged into the JSON error body (e.g. `message`, `details`). */
type ErrorExtra = Record<string, unknown>;

/**
 * Build a JSON error response with the shape `{ error, ...extra }`.
 *
 * Centralizes the error response format that was duplicated across every
 * API route so status codes and body shape stay consistent.
 */
export function apiError(error: string, status: number, extra?: ErrorExtra) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** 401 Unauthorized. Defaults to the `{ error: "Unauthorized" }` body. */
export function unauthorized(error = "Unauthorized", extra?: ErrorExtra) {
  return apiError(error, 401, extra);
}

/** 403 Forbidden. */
export function forbidden(error = "Forbidden", extra?: ErrorExtra) {
  return apiError(error, 403, extra);
}

/** 404 Not Found. */
export function notFound(error = "Not found", extra?: ErrorExtra) {
  return apiError(error, 404, extra);
}

/** 400 Bad Request. */
export function badRequest(error = "Bad request", extra?: ErrorExtra) {
  return apiError(error, 400, extra);
}

/** 500 Internal Server Error. */
export function serverError(error = "Internal server error", extra?: ErrorExtra) {
  return apiError(error, 500, extra);
}
