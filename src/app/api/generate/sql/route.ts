import { NextRequest, NextResponse } from "next/server";
import { generateSQL, isAIGenerationEnabled } from "@/lib/ai/generation";
import { auth } from "@/lib/auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // A01: Require authentication before generating SQL
    const session = await auth();
    if (!session?.user) {
      return unauthorized("Authentication required");
    }
    
    const enabled = await isAIGenerationEnabled();
    if (!enabled) {
      return badRequest("AI Generation is not enabled");
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || prompt.trim().length === 0) {
      return badRequest("Prompt is required");
    }

    const sql = await generateSQL(prompt);

    return NextResponse.json({ sql });
  } catch (error) {
    console.error("SQL Generation error:", error);
    return serverError("Failed to generate SQL");
  }
}
