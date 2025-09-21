import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateImageTags, batchGenerateImageTags, getSuggestedTags } from '@/lib/ai/image-tagging';
import { AIServiceError } from '@/lib/ai-services';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/image-tagging - Generate AI tags for image(s)
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
    const { imageUrl, imageUrls, options = {} } = body;

    // Validate input
    if (!imageUrl && !imageUrls) {
      return NextResponse.json(
        { success: false, error: 'Either imageUrl or imageUrls is required' },
        { status: 400 }
      );
    }

    let result;

    if (imageUrls && Array.isArray(imageUrls)) {
      // Batch processing
      if (imageUrls.length > 5) {
        return NextResponse.json(
          { success: false, error: 'Maximum 5 images allowed for batch processing' },
          { status: 400 }
        );
      }

      result = await batchGenerateImageTags(imageUrls, options);
    } else {
      // Single image processing
      result = await generateImageTags(imageUrl, options);
    }

    logSecurityEvent('AI_IMAGE_TAGGING_SUCCESS', {
      userId: session.user.id,
      imageCount: Array.isArray(result) ? result.length : 1,
      options
    }, request);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Image tagging error:', error);
    
    if (error instanceof AIServiceError) {
      logSecurityEvent('AI_IMAGE_TAGGING_ERROR', {
        error: error.message,
        service: error.service,
        statusCode: error.statusCode
      }, request);

      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          service: error.service,
          statusCode: error.statusCode
        },
        { status: error.statusCode || 500 }
      );
    }

    logSecurityEvent('AI_IMAGE_TAGGING_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);

    return NextResponse.json(
      { success: false, error: 'Image tagging failed' },
      { status: 500 }
    );
  }
}

// GET /api/ai/image-tagging/suggestions - Get suggested tags
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const existingTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const imageUrl = searchParams.get('imageUrl');

    const suggestions = await getSuggestedTags(existingTags, imageUrl || undefined);

    return NextResponse.json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    console.error('Tag suggestions error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get tag suggestions' },
      { status: 500 }
    );
  }
}
