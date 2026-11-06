import { NextRequest, NextResponse } from "next/server";
import { semanticSearch, isAISearchEnabled } from "@/lib/ai/embeddings";
import { badRequest, serverError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const enabled = await isAISearchEnabled();
    if (!enabled) {
      return badRequest("AI Search is not enabled");
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.trim().length === 0) {
      return badRequest("Query is required");
    }

    const results = await semanticSearch(query, limit);

    return NextResponse.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    console.error("AI Search error:", error);
    return serverError("Search failed");
  }
}
