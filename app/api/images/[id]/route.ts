import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Image, { IImage } from '@/models/Image';
import { logSecurityEvent } from '@/lib/security';

// GET /api/images/[id] - Get single image by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const image = await Image.findById(id)
      .populate('uploader', 'name email')
      .lean();

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if image is public or user owns it
    const session = await getServerSession(authOptions);
    if (!(image as unknown as IImage).isPublic && (!session?.user || (image as unknown as IImage).uploader.toString() !== session.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Increment view count
    await Image.findByIdAndUpdate(id, { $inc: { views: 1 } });

    logSecurityEvent('IMAGE_VIEW_SUCCESS', {
      imageId: id,
      viewer: session?.user?.id || 'anonymous'
    }, request);

    return NextResponse.json({
      success: true,
      data: image
    });

  } catch (error) {
    console.error('Error fetching image:', error);
    logSecurityEvent('IMAGE_FETCH_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

// PUT /api/images/[id] - Update image
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;

    const image = await Image.findById(id);
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if user owns the image
    if (image.uploader.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      tags,
      category,
      isPublic
    } = body;

    // Update allowed fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (tags !== undefined) updateData.tags = tags.filter((tag: string) => tag.trim().length > 0);
    if (category !== undefined) updateData.category = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updatedImage = await Image.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('uploader', 'name email');

    logSecurityEvent('IMAGE_UPDATE_SUCCESS', {
      imageId: id,
      uploader: session.user.id,
      updatedFields: Object.keys(updateData)
    }, request);

    return NextResponse.json({
      success: true,
      data: updatedImage
    });

  } catch (error) {
    console.error('Error updating image:', error);
    logSecurityEvent('IMAGE_UPDATE_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

// DELETE /api/images/[id] - Delete image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id } = await params;

    const image = await Image.findById(id);
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Check if user owns the image
    if (image.uploader.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    await Image.findByIdAndDelete(id);

    logSecurityEvent('IMAGE_DELETE_SUCCESS', {
      imageId: id,
      uploader: session.user.id,
      title: image.title
    }, request);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting image:', error);
    logSecurityEvent('IMAGE_DELETE_ERROR', { error: error instanceof Error ? error.message : 'Unknown error' }, request);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
