import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Video from "@/models/Video";
import { ObjectId } from "mongodb";
import { 
  checkRateLimit, 
  validateVideoId, 
  logSecurityEvent 
} from "@/lib/security";

// GET /api/videos/[id] - Get a single video by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Rate limiting for video views
    const rateLimit = await checkRateLimit(request, 'video-view');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Validate video ID
    if (!id || !validateVideoId(id)) {
      logSecurityEvent('INVALID_VIDEO_ID', { videoId: id }, request);
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    await connectDB();
    
    const video = await Video.findOne({ 
      _id: id, 
      isPublic: true 
    }).select('-__v').lean();
    
    if (!video) {
      logSecurityEvent('VIDEO_NOT_FOUND', { videoId: id }, request);
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Increment view count asynchronously (don't wait for it)
    Video.findByIdAndUpdate(id, { $inc: { views: 1 } }).catch(console.error);

    logSecurityEvent('VIDEO_VIEWED', { videoId: id }, request);

    return NextResponse.json({ video }, { status: 200 });
  } catch (error) {
    console.error("Error fetching video:", error);
    logSecurityEvent('VIDEO_FETCH_ERROR', { error: error instanceof Error ? error.message : 'Unknown error', videoId: id }, request);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Delete a video (only by owner)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate video ID
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid video ID" },
        { status: 400 }
      );
    }

    await connectDB();
    
    const video = await Video.findById(id);
    
    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // TODO: Add authentication check here
    // For now, allow deletion (in production, check if user owns the video)
    
    await Video.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Video deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
