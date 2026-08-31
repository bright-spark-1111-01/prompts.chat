import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serverError, unauthorized } from "@/lib/api-response";

// Update tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, color } = body;

    const tag = await db.tag.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(color && { color }),
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return serverError("Failed to update tag");
  }
}

// Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { id } = await params;

    await db.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return serverError("Failed to delete tag");
  }
}
