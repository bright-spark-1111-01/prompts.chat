import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";
import { requireUser } from "@/lib/api-auth";
import { badRequest, notFound } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  const { session, response } = await requireUser();
  if (response) return response;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      apiKey: true,
      mcpPromptsPublicByDefault: true,
    },
  });

  if (!user) {
    return notFound("User not found");
  }

  return NextResponse.json({
    hasApiKey: !!user.apiKey,
    apiKey: user.apiKey,
    mcpPromptsPublicByDefault: user.mcpPromptsPublicByDefault,
  });
}

export async function POST() {
  const { session, response } = await requireUser();
  if (response) return response;

  const apiKey = generateApiKey();

  await db.user.update({
    where: { id: session.user.id },
    data: { apiKey },
  });

  return NextResponse.json({ apiKey });
}

export async function DELETE() {
  const { session, response } = await requireUser();
  if (response) return response;

  await db.user.update({
    where: { id: session.user.id },
    data: { apiKey: null },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  const { session, response } = await requireUser();
  if (response) return response;

  const body = await request.json();
  const { mcpPromptsPublicByDefault } = body;

  if (typeof mcpPromptsPublicByDefault !== "boolean") {
    return badRequest("Invalid request");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { mcpPromptsPublicByDefault },
  });

  return NextResponse.json({ success: true });
}
