import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { forbidden, notFound, serverError, unauthorized } from "@/lib/api-response";

// POST /api/prompts/[id]/feature - Toggle featured status (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return unauthorized();
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return forbidden();
    }

    const { id } = await params;

    // Get current prompt
    const prompt = await db.prompt.findUnique({
      where: { id },
      select: { isFeatured: true },
    });

    if (!prompt) {
      return notFound("Prompt not found");
    }

    // Toggle featured status
    const updatedPrompt = await db.prompt.update({
      where: { id },
      data: {
        isFeatured: !prompt.isFeatured,
        featuredAt: !prompt.isFeatured ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      isFeatured: updatedPrompt.isFeatured,
    });
  } catch (error) {
    console.error("Error toggling featured status:", error);
    return serverError("Internal server error");
  }
}
