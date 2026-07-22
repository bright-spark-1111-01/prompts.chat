import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  getMediaGeneratorPlugin,
  getAvailableModels,
  isMediaGenerationAvailable,
} from "@/lib/plugins/media-generators";
import { badRequest, forbidden, notFound } from "@/lib/api-response";

export async function GET() {
  const { session, response } = await requireUser();
  if (response) return response;

  const available = isMediaGenerationAvailable();
  const imageModels = getAvailableModels("image");
  const videoModels = getAvailableModels("video");
  const audioModels = getAvailableModels("audio");

  // Get user's credit info
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      generationCreditsRemaining: true,
      dailyGenerationLimit: true,
      flagged: true,
    },
  });

  return NextResponse.json({
    available,
    imageModels,
    videoModels,
    audioModels,
    credits: {
      remaining: user?.generationCreditsRemaining ?? 0,
      daily: user?.dailyGenerationLimit ?? 0,
    },
    canGenerate: !user?.flagged && (user?.generationCreditsRemaining ?? 0) > 0,
  });
}

export async function POST(request: NextRequest) {
  const { session, response } = await requireUser();
  if (response) return response;

  try {
    // Check user's credits and flagged status
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        generationCreditsRemaining: true,
        flagged: true,
      },
    });

    if (!user) {
      return notFound("User not found");
    }

    // Block flagged users
    if (user.flagged) {
      return forbidden("Your account has been flagged. Media generation is disabled.");
    }

    // Check credits
    if (user.generationCreditsRemaining <= 0) {
      return forbidden("No generation credits remaining. Credits reset daily.");
    }

    const body = await request.json();
    const { prompt, model, provider, type, inputImageUrl, resolution, aspectRatio } = body;

    if (!prompt || !model || !provider || !type) {
      return badRequest("Missing required fields: prompt, model, provider, type");
    }

    const plugin = getMediaGeneratorPlugin(provider);

    if (!plugin) {
      return NextResponse.json(
        { error: `Provider "${provider}" not found` },
        { status: 404 }
      );
    }

    if (!plugin.isEnabled()) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not enabled` },
        { status: 400 }
      );
    }

    const task = await plugin.startGeneration({
      prompt,
      model,
      type,
      inputImageUrl,
      resolution,
      aspectRatio,
    });

    // Deduct one credit after successful generation start
    await db.user.update({
      where: { id: session.user.id },
      data: {
        generationCreditsRemaining: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      taskId: task.taskId,
      socketAccessToken: task.socketAccessToken,
      webSocketUrl: plugin.getWebSocketUrl(),
      provider,
    });
  } catch (error) {
    console.error("Media generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
