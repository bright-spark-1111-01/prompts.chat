import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, serverError, unauthorized } from "@/lib/api-response";

// Create category
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const body = await request.json();
    const { name, slug, description, icon, parentId, pinned } = body;

    if (!name || !slug) {
      return badRequest("Name and slug are required");
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        parentId: parentId || null,
        pinned: pinned || false,
      },
    });

    revalidateTag("categories", "max");

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return serverError("Failed to create category");
  }
}
