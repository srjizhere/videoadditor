import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Video from "@/models/Video";
import { 
  checkRateLimit, 
  logSecurityEvent 
} from "@/lib/security";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateVideoThumbnailUrl } from "@/lib/imagekit/video-thumbnail";

// GET /api/video - Get all public videos with pagination
export async function GET(request: NextRequest) {
  try {
    // Rate limiting for video listing
    const rateLimit = await checkRateLimit(request, 'api');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    await connectDB();
    
    // Get total count for pagination
    const totalVideos = await Video.countDocuments({ isPublic: true });
    
    // Get videos with pagination
    const videos = await Video.find({ 
      isPublic: true 
    })
    .select('-__v')
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limit)
    .lean();
    
    logSecurityEvent('VIDEOS_LISTED', { 
      count: videos.length, 
      page, 
      limit 
    }, request);

    return NextResponse.json({ 
      videos,
      pagination: {
        page,
        limit,
        total: totalVideos,
        pages: Math.ceil(totalVideos / limit)
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching videos:", error);
    logSecurityEvent('VIDEOS_FETCH_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// POST /api/video - Create a new video
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting for video creation
    const rateLimit = await checkRateLimit(request, 'upload');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    
    // Basic validation - thumbnailUrl is now optional (will be auto-generated)
    if (!body.title || !body.description || !body.videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Auto-generate thumbnail if not provided
    const thumbnailUrl = body.thumbnailUrl || generateVideoThumbnailUrl(body.videoUrl, 1280, 720);
    
    const video = new Video({
      title: body.title,
      description: body.description,
      videoUrl: body.videoUrl,
      thumbnailUrl: thumbnailUrl,
      uploader: session.user.id,
      uploaderName: session.user.name || session.user.email?.split('@')[0] || 'Unknown',
      uploaderEmail: session.user.email,
      controls: body.controls !== false, // Default to true
      transformation: body.transformation || {
        height: 1920,
        width: 1080
      },
      tags: body.tags || [],
      duration: body.duration || 0,
      isPublic: body.isPublic !== false, // Default to true
    });

    const savedVideo = await video.save();
    
    logSecurityEvent('VIDEO_CREATED', { 
      videoId: savedVideo._id,
      title: savedVideo.title 
    }, request);

    return NextResponse.json({ 
      video: savedVideo,
      message: "Video created successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    logSecurityEvent('VIDEO_CREATE_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}