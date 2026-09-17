import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { badRequest, forbidden, notFound, serverError, unauthorized } from "@/lib/api-response";

const addToCollectionSchema = z.object({
  promptId: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  
  if (!session?.user) {
    return unauthorized();
  }

  const collections = await db.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      prompt: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
              verified: true,
            },
          },
          category: {
            include: {
              parent: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: { votes: true, contributors: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const { promptId } = addToCollectionSchema.parse(body);

    const existingCollection = await db.collection.findUnique({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId,
        },
      },
    });

    if (existingCollection) {
      return badRequest("Already in collection");
    }

    const prompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { id: true, isPrivate: true, authorId: true },
    });

    if (!prompt) {
      return notFound("Prompt not found");
    }

    if (prompt.isPrivate && prompt.authorId !== session.user.id) {
      return forbidden("Cannot add private prompt");
    }

    const collection = await db.collection.create({
      data: {
        userId: session.user.id,
        promptId,
      },
    });

    return NextResponse.json({ collection, added: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid input");
    }
    console.error("Failed to add to collection:", error);
    return serverError("Failed to add to collection");
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(req.url);
    const promptId = searchParams.get("promptId");

    if (!promptId) {
      return badRequest("promptId required");
    }

    await db.collection.delete({
      where: {
        userId_promptId: {
          userId: session.user.id,
          promptId,
        },
      },
    });

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Failed to remove from collection:", error);
    return serverError("Failed to remove from collection");
  }
}
