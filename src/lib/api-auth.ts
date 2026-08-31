import type { Session } from "next-auth";
import type { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/api-response";

type AuthSuccess = { session: Session; response?: undefined };
type AuthFailure = { session?: undefined; response: NextResponse };

/**
 * Resolve the current session, returning a 401 response when the request is
 * not authenticated. Replaces the `const session = await auth(); if (...) return 401`
 * block duplicated across API routes.
 *
 * @example
 * const { session, response } = await requireUser();
 * if (response) return response;
 * // session.user.id is now available
 */
export async function requireUser(
  message = "Unauthorized",
): Promise<AuthSuccess | AuthFailure> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: unauthorized(message) };
  }
  return { session };
}
