import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkPromptAccess } from "@/lib/prompt-access";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api-response";

const addExampleSchema = z.object({
  mediaUrl: z.string().url(),
  comment: z.string().max(500).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;

  const prompt = await db.prompt.findUnique({
    where: { id: promptId },
    select: { id: true, type: true, isPrivate: true, authorId: true },
  });

  const denied = await checkPromptAccess(prompt);
  if (denied || !prompt) return denied!;

  // Only allow examples for IMAGE and VIDEO prompts
  if (prompt.type !== "IMAGE" && prompt.type !== "VIDEO") {
    return badRequest("Examples not supported for this prompt type");
  }

  const examples = await db.userPromptExample.findMany({
    where: { promptId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatar: true,
        },
      },
    },
  });

  return NextResponse.json({ examples });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return unauthorized();
  }

  const { id: promptId } = await params;

  try {
    const body = await req.json();
    const { mediaUrl, comment } = addExampleSchema.parse(body);

    const prompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { id: true, type: true, isPrivate: true, authorId: true },
    });

    if (!prompt) {
      return notFound("Prompt not found");
    }

    // Only allow examples for IMAGE and VIDEO prompts
    if (prompt.type !== "IMAGE" && prompt.type !== "VIDEO") {
      return badRequest("Examples not supported for this prompt type");
    }

    // Don't allow adding examples to private prompts (unless owner)
    if (prompt.isPrivate && prompt.authorId !== session.user.id) {
      return forbidden("Cannot add example to private prompt");
    }

    const example = await db.userPromptExample.create({
      data: {
        mediaUrl,
        comment: comment || null,
        promptId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ example });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("Failed to add example:", error);
    return serverError("Failed to add example");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return unauthorized();
  }

  const { id: promptId } = await params;

  try {
    const { searchParams } = new URL(req.url);
    const exampleId = searchParams.get("exampleId");

    if (!exampleId) {
      return badRequest("exampleId required");
    }

    const example = await db.userPromptExample.findUnique({
      where: { id: exampleId },
      select: { id: true, userId: true, promptId: true },
    });

    if (!example) {
      return notFound("Example not found");
    }

    if (example.promptId !== promptId) {
      return badRequest("Example does not belong to this prompt");
    }

    // Only allow owner or admin to delete
    const isAdmin = session.user.role === "ADMIN";
    if (example.userId !== session.user.id && !isAdmin) {
      return forbidden("Unauthorized");
    }

    await db.userPromptExample.delete({
      where: { id: exampleId },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete example:", error);
    return serverError("Failed to delete example");
  }
}
