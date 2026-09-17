import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorized();
    }

    // Only admins can restore deleted prompts
    if (session.user.role !== "ADMIN") {
      return forbidden();
    }

    const { id } = await params;

    // Check if prompt exists and is deleted
    const prompt = await db.prompt.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!prompt) {
      return notFound("Prompt not found");
    }

    if (!prompt.deletedAt) {
      return badRequest("Prompt is not deleted");
    }

    // Restore the prompt by setting deletedAt to null
    await db.prompt.update({
      where: { id },
      data: { deletedAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore prompt error:", error);
    return serverError("Internal server error");
  }
}
