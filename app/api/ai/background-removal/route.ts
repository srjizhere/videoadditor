import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { removeBackground, batchRemoveBackground } from '@/lib/ai/background-removal';
import { AIServiceError } from '@/lib/ai-services';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/background-removal - Remove background from image(s)
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
      if (imageUrls.length > 10) {
        return NextResponse.json(
          { success: false, error: 'Maximum 10 images allowed for batch processing' },
          { status: 400 }
        );
      }

      result = await batchRemoveBackground(imageUrls, options);
    } else {
      // Single image processing
      result = await removeBackground(imageUrl, options);
    }

    logSecurityEvent('AI_BACKGROUND_REMOVAL_SUCCESS', {
      userId: session.user.id,
      imageCount: Array.isArray(result) ? result.length : 1,
      options
    }, request);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Background removal error:', error);
    
    if (error instanceof AIServiceError) {
      logSecurityEvent('AI_BACKGROUND_REMOVAL_ERROR', {
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

    logSecurityEvent('AI_BACKGROUND_REMOVAL_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);

    return NextResponse.json(
      { success: false, error: 'Background removal failed' },
      { status: 500 }
    );
  }
}

// GET /api/ai/background-removal/status - Check processing status
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
    const processedUrl = searchParams.get('processedUrl');

    if (!imageUrl || !processedUrl) {
      return NextResponse.json(
        { success: false, error: 'Both imageUrl and processedUrl are required' },
        { status: 400 }
      );
    }

    const { getBackgroundRemovalStatus } = await import('@/lib/ai/background-removal');
    const status = await getBackgroundRemovalStatus(imageUrl, processedUrl);

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Background removal status check error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Status check failed' },
      { status: 500 }
    );
  }
}
