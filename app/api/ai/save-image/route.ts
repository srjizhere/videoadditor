import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/save-image - Save processed image with transformations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrl, transformations, metadata } = body;

    // Validate input
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Log the save operation
    await logSecurityEvent({
      type: 'image_save',
      userId: session.user.id,
      details: {
        imageUrl,
        transformationCount: transformations?.length || 0,
        metadata
      }
    });

    // Generate unique filename for saved image
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const filename = `processed_${timestamp}_${randomId}`;

    // Create saved image record
    const savedImage = {
      id: `saved_${timestamp}_${randomId}`,
      originalUrl: imageUrl,
      savedUrl: imageUrl, // In production, this would be the actual saved URL
      filename,
      transformations: transformations || [],
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        savedBy: session.user.id,
        processingTime: metadata?.processingTime || 0
      },
      status: 'saved'
    };

    // In a real implementation, you would:
    // 1. Download the processed image from ImageKit
    // 2. Upload it to your storage (S3, etc.)
    // 3. Save metadata to database
    // 4. Return the saved URL

    return NextResponse.json({
      success: true,
      data: {
        savedImage,
        message: 'Image saved successfully',
        downloadUrl: imageUrl, // In production, this would be the actual download URL
        metadata: {
          savedAt: new Date().toISOString(),
          fileSize: 'Unknown', // Would be calculated from actual file
          format: 'auto',
          quality: 90
        }
      }
    });

  } catch (error) {
    console.error('Save image error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save image' },
      { status: 500 }
    );
  }
}

// GET /api/ai/save-image - Get saved images for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // In a real implementation, you would fetch from database
    const savedImages = [
      {
        id: 'saved_1234567890_abc123',
        filename: 'processed_1234567890_abc123.jpg',
        originalUrl: 'https://ik.imagekit.io/demo/image.jpg',
        savedUrl: 'https://ik.imagekit.io/demo/saved/image.jpg',
        transformations: ['e-auto-enhance', 'q-90'],
        metadata: {
          savedAt: new Date().toISOString(),
          savedBy: session.user.id,
          processingTime: 2500
        },
        status: 'saved'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        savedImages,
        total: savedImages.length
      }
    });

  } catch (error) {
    console.error('Get saved images error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved images' },
      { status: 500 }
    );
  }
}
