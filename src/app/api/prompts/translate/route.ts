import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { translateContent } from "@/lib/ai/generation";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api-response";

const translateSchema = z.object({
  content: z.string().min(1),
  targetLanguage: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { response } = await requireUser();
  if (response) return response;

  try {
    const body = await request.json();
    const { content, targetLanguage } = translateSchema.parse(body);

    const translatedContent = await translateContent(content, targetLanguage);

    return NextResponse.json({ translatedContent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid request body");
    }

    console.error("Translation error:", error);
    return serverError("Failed to translate content");
  }
}
