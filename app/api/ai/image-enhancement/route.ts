import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enhanceImageQuality, autoEnhanceImage, batchEnhanceImages, analyzeImageQuality } from '@/lib/ai/image-enhancement';
import { AIServiceError } from '@/lib/ai-services';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/image-enhancement - Enhance image quality
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
    const { imageUrl, imageUrls, options = {}, autoEnhance = false } = body;

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

      result = await batchEnhanceImages(imageUrls, options);
    } else if (autoEnhance) {
      // Auto enhancement
      result = await autoEnhanceImage(imageUrl, options);
    } else {
      // Manual enhancement
      result = await enhanceImageQuality(imageUrl, options);
    }

    logSecurityEvent('AI_IMAGE_ENHANCEMENT_SUCCESS', {
      userId: session.user.id,
      imageCount: Array.isArray(result) ? result.length : 1,
      options,
      autoEnhance
    }, request);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Image enhancement error:', error);
    
    if (error instanceof AIServiceError) {
      logSecurityEvent('AI_IMAGE_ENHANCEMENT_ERROR', {
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

    logSecurityEvent('AI_IMAGE_ENHANCEMENT_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);

    return NextResponse.json(
      { success: false, error: 'Image enhancement failed' },
      { status: 500 }
    );
  }
}

// GET /api/ai/image-enhancement/analyze - Analyze image quality
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
    const imageUrl = searchParams.get('imageUrl');

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'imageUrl parameter is required' },
        { status: 400 }
      );
    }

    const analysis = await analyzeImageQuality(imageUrl);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Image quality analysis error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Image quality analysis failed' },
      { status: 500 }
    );
  }
}
