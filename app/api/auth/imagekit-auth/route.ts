import { getUploadAuthParams } from "@imagekit/next/server";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    // Generate a unique token to prevent reuse errors
    const uniqueToken = randomUUID();
    
    const authenticationParameters = getUploadAuthParams({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string,
      token: uniqueToken,
    });

    return Response.json({
      ...authenticationParameters,
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    });
  } catch (error) {
    console.error("ImageKit authentication error:", error);
    return Response.json(
      {
        error: "Authentication for Imagekit failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
