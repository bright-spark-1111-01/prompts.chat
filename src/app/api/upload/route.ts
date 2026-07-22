import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStoragePlugin } from "@/lib/plugins/registry";
import sharp from "sharp";
import { badRequest, unauthorized } from "@/lib/api-response";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB for images
const MAX_VIDEO_SIZE = 4 * 1024 * 1024; // 4MB for videos (Vercel serverless limit)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4"];

async function compressToJpg(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return unauthorized();
  }

  const enabledStorage = process.env.ENABLED_STORAGE || "url";
  
  if (enabledStorage === "url") {
    return badRequest("File upload is not enabled. Using URL storage mode.");
  }

  const storagePlugin = getStoragePlugin(enabledStorage);
  
  if (!storagePlugin) {
    return NextResponse.json(
      { error: `Storage plugin "${enabledStorage}" not found` },
      { status: 500 }
    );
  }

  if (!storagePlugin.isConfigured()) {
    return NextResponse.json(
      { error: `Storage plugin "${enabledStorage}" is not configured` },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return badRequest("No file provided");
    }

    // Determine if file is image or video
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    // Validate file type
    if (!isImage && !isVideo) {
      return badRequest("Invalid file type. Only JPEG, PNG, GIF, WebP images and MP4 videos are allowed.");
    }

    // Validate file size based on type
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 4MB.` },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    
    let uploadBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (isVideo) {
      // For videos, upload as-is without compression
      uploadBuffer = buffer;
      filename = `prompt-media-${timestamp}-${randomId}.mp4`;
      mimeType = "video/mp4";
    } else {
      // For images, compress to JPG
      uploadBuffer = await compressToJpg(buffer);
      filename = `prompt-media-${timestamp}-${randomId}.jpg`;
      mimeType = "image/jpeg";
    }

    // Upload to storage
    const result = await storagePlugin.upload(uploadBuffer, {
      filename,
      mimeType,
      folder: "prompt-media",
    });

    return NextResponse.json({
      url: result.url,
      size: result.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
