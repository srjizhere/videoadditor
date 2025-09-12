import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Image from '@/models/Image';
import { logSecurityEvent } from '@/lib/security';

// POST /api/images/[id]/like - Like/unlike an image
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const image = await Image.findById(params.id);
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const isLiked = image.likedBy.some(id => id.toString() === userId);

    if (isLiked) {
      // Unlike the image
      await Image.findByIdAndUpdate(params.id, {
        $pull: { likedBy: userId },
        $inc: { likes: -1 }
      });
    } else {
      // Like the image
      await Image.findByIdAndUpdate(params.id, {
        $addToSet: { likedBy: userId },
        $inc: { likes: 1 }
      });
    }

    // Fetch updated image
    const updatedImage = await Image.findById(params.id)
      .populate('uploader', 'name email')
      .lean();

    logSecurityEvent('IMAGE_LIKE_SUCCESS', {
      imageId: params.id,
      userId,
      action: isLiked ? 'unlike' : 'like'
    }, request);

    return NextResponse.json({
      success: true,
      data: updatedImage,
      isLiked: !isLiked
    });

  } catch (error) {
    console.error('Error liking image:', error);
    logSecurityEvent('IMAGE_LIKE_ERROR', { error: error.message }, request);
    return NextResponse.json(
      { success: false, error: 'Failed to like image' },
      { status: 500 }
    );
  }
}
