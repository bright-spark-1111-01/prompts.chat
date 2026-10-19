import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, serverError, unauthorized } from "@/lib/api-response";

// Create tag
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const body = await request.json();
    const { name, slug, color } = body;

    if (!name || !slug) {
      return badRequest("Name and slug are required");
    }

    const tag = await db.tag.create({
      data: {
        name,
        slug,
        color: color || "#6366f1",
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error creating tag:", error);
    return serverError("Failed to create tag");
  }
}
