import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getMediaGeneratorPlugin } from "@/lib/plugins/media-generators";
import { badRequest } from "@/lib/api-response";

/**
 * Polling endpoint for media generation status
 * Used by providers that don't support WebSocket (e.g., Fal.ai)
 */
export async function GET(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  const searchParams = request.nextUrl.searchParams;
  const provider = searchParams.get("provider");
  const socketAccessToken = searchParams.get("token");

  if (!provider || !socketAccessToken) {
    return badRequest("Missing provider or token");
  }

  const plugin = getMediaGeneratorPlugin(provider);

  if (!plugin) {
    return NextResponse.json(
      { error: `Provider "${provider}" not found` },
      { status: 404 }
    );
  }

  if (!plugin.checkStatus) {
    return badRequest("Provider does not support polling");
  }

  try {
    const result = await plugin.checkStatus(socketAccessToken);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
