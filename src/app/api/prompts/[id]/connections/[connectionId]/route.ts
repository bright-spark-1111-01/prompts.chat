import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api-response";

const updateConnectionSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
});

interface RouteParams {
  params: Promise<{ id: string; connectionId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { id, connectionId } = await params;

  try {
    const connection = await db.promptConnection.findUnique({
      where: { id: connectionId },
      include: {
        source: {
          select: { authorId: true },
        },
      },
    });

    if (!connection) {
      return notFound("Connection not found");
    }

    if (connection.sourceId !== id) {
      return badRequest("Connection does not belong to this prompt");
    }

    if (
      connection.source.authorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbidden("You can only delete connections from your own prompts");
    }

    await db.promptConnection.delete({
      where: { id: connectionId },
    });

    // Revalidate the prompt page and flow cache
    revalidatePath(`/prompts/${id}`);
    revalidateTag("prompt-flow", "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete connection:", error);
    return serverError("Failed to delete connection");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { id, connectionId } = await params;

  try {
    const body = await request.json();
    const data = updateConnectionSchema.parse(body);

    const connection = await db.promptConnection.findUnique({
      where: { id: connectionId },
      include: {
        source: {
          select: { authorId: true },
        },
      },
    });

    if (!connection) {
      return notFound("Connection not found");
    }

    if (connection.sourceId !== id) {
      return badRequest("Connection does not belong to this prompt");
    }

    if (
      connection.source.authorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbidden("You can only update connections on your own prompts");
    }

    const updated = await db.promptConnection.update({
      where: { id: connectionId },
      data,
      include: {
        target: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    // Revalidate prompt flow cache
    revalidateTag("prompt-flow", "max");

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Failed to update connection:", error);
    return serverError("Failed to update connection");
  }
}
