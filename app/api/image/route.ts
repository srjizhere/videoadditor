import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Image from '@/models/Image';
import { logSecurityEvent } from '@/lib/security';
import { ImageUploadData } from '@/types/media';

// GET /api/image - Fetch images with pagination and filters
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search');

    // Build query
    const query: any = { isPublic: true };
    
    if (category) {
      query.category = category;
    }
    
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [images, total] = await Promise.all([
      Image.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('uploader', 'name email')
        .lean(),
      Image.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: images,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    logSecurityEvent('IMAGE_FETCH_ERROR', { error: error.message }, request);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

// POST /api/image - Create new image
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      title,
      description,
      imageUrl,
      thumbnailUrl,
      tags = [],
      category = 'other',
      isPublic = true,
      dimensions,
      fileSize,
      format
    }: ImageUploadData = body;

    // Validate required fields
    if (!title || !imageUrl || !dimensions || !fileSize || !format) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate image URL format
    const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i;
    if (!imageUrlPattern.test(imageUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image URL format' },
        { status: 400 }
      );
    }

    // Create image document
    const image = new Image({
      title: title.trim(),
      description: description?.trim(),
      imageUrl,
      thumbnailUrl,
      uploader: session.user.id,
      uploaderName: session.user.name || session.user.email.split('@')[0],
      uploaderEmail: session.user.email,
      tags: tags.filter(tag => tag.trim().length > 0),
      category,
      isPublic,
      dimensions,
      fileSize,
      format: format.toLowerCase()
    });

    await image.save();

    logSecurityEvent('IMAGE_CREATE_SUCCESS', {
      imageId: image._id,
      uploader: session.user.id,
      title: image.title
    }, request);

    return NextResponse.json({
      success: true,
      data: image
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating image:', error);
    logSecurityEvent('IMAGE_CREATE_ERROR', { error: error.message }, request);
    return NextResponse.json(
      { success: false, error: 'Failed to create image' },
      { status: 500 }
    );
  }
}
