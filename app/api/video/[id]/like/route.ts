import { connectDB } from "@/lib/db";
import Video from "@/models/Video";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  checkRateLimit, 
  requireAuth, 
  validateVideoId,
  logSecurityEvent 
} from "@/lib/security";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimit(request, 'api');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const session = authResult.session;
    const videoId = params.id;

    // Validate video ID
    if (!validateVideoId(videoId)) {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the video
    const video = await Video.findById(videoId);
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const isLiked = video.likedBy?.includes(userId);

    if (isLiked) {
      // Unlike the video
      await Video.findByIdAndUpdate(videoId, {
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      });
      
      logSecurityEvent('VIDEO_UNLIKED', { videoId, userId }, request);
      
      return NextResponse.json({
        message: "Video unliked successfully",
        liked: false,
        likes: video.likes - 1
      });
    } else {
      // Like the video
      await Video.findByIdAndUpdate(videoId, {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 }
      });
      
      logSecurityEvent('VIDEO_LIKED', { videoId, userId }, request);
      
      return NextResponse.json({
        message: "Video liked successfully",
        liked: true,
        likes: video.likes + 1
      });
    }
  } catch (error) {
    console.error("Like video error", error);
    logSecurityEvent('VIDEO_LIKE_ERROR', { error: error.message }, request);
    return NextResponse.json(
      { error: "Failed to like video" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimit(request, 'api');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Authentication
    const authResult = await requireAuth(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const session = authResult.session;
    const videoId = params.id;

    // Validate video ID
    if (!validateVideoId(videoId)) {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the video and check if user has liked it
    const video = await Video.findById(videoId).select('likes likedBy');
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const isLiked = video.likedBy?.includes(userId) || false;

    return NextResponse.json({
      liked: isLiked,
      likes: video.likes
    });
  } catch (error) {
    console.error("Get like status error", error);
    return NextResponse.json(
      { error: "Failed to get like status" },
      { status: 500 }
    );
  }
}
