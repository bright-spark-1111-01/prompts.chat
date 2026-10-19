import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, notFound, serverError } from "@/lib/api-response";

const reportSchema = z.object({
  promptId: z.string().min(1),
  reason: z.enum(["SPAM", "INAPPROPRIATE", "COPYRIGHT", "MISLEADING", "RELIST_REQUEST", "OTHER"]),
  details: z.string().optional(),
});

export async function POST(request: Request) {
  try {
  const { session, response } = await requireUser();
  if (response) return response;

    const body = await request.json();
    const { promptId, reason, details } = reportSchema.parse(body);

    // Check if prompt exists
    const prompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { id: true, authorId: true },
    });

    if (!prompt) {
      return notFound("Prompt not found");
    }

    // Prevent self-reporting (except for relist requests)
    if (prompt.authorId === session.user.id && reason !== "RELIST_REQUEST") {
      return badRequest("You cannot report your own prompt");
    }

    // Check if user already reported this prompt
    const existingReport = await db.promptReport.findFirst({
      where: {
        promptId,
        reporterId: session.user.id,
        status: "PENDING",
      },
    });

    if (existingReport) {
      return badRequest("You have already reported this prompt");
    }

    // Create the report
    await db.promptReport.create({
      data: {
        promptId,
        reporterId: session.user.id,
        reason,
        details: details || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid request data");
    }
    console.error("Report creation error:", error);
    return serverError("Internal server error");
  }
}
