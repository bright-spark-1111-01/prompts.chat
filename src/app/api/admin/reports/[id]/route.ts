import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { badRequest, serverError, unauthorized } from "@/lib/api-response";

const updateSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "DISMISSED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return unauthorized();
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = updateSchema.parse(body);

    const report = await db.promptReport.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid data");
    }
    console.error("Report update error:", error);
    return serverError("Internal server error");
  }
}
