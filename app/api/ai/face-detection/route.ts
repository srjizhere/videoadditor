import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { detectFaces, batchDetectFaces, detectEmotions, detectAgeGender, protectPrivacy } from '@/lib/ai/face-detection';
import { AIServiceError } from '@/lib/ai-services';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/face-detection - Detect faces in image(s)
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
    const { imageUrl, imageUrls, options = {}, action = 'detect' } = body;

    // Validate input
    if (!imageUrl && !imageUrls) {
      return NextResponse.json(
        { success: false, error: 'Either imageUrl or imageUrls is required' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'protect') {
      // Privacy protection
      result = await protectPrivacy(imageUrl, options);
    } else if (imageUrls && Array.isArray(imageUrls)) {
      // Batch processing
      if (imageUrls.length > 5) {
        return NextResponse.json(
          { success: false, error: 'Maximum 5 images allowed for batch processing' },
          { status: 400 }
        );
      }

      result = await batchDetectFaces(imageUrls, options);
    } else {
      // Single image processing
      result = await detectFaces(imageUrl, options);
    }

    logSecurityEvent('AI_FACE_DETECTION_SUCCESS', {
      userId: session.user.id,
      imageCount: Array.isArray(result) ? result.length : 1,
      action,
      options
    }, request);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Face detection error:', error);
    
    if (error instanceof AIServiceError) {
      logSecurityEvent('AI_FACE_DETECTION_ERROR', {
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

    logSecurityEvent('AI_FACE_DETECTION_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);

    return NextResponse.json(
      { success: false, error: 'Face detection failed' },
      { status: 500 }
    );
  }
}

// GET /api/ai/face-detection/emotions - Detect emotions in faces
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
    const action = searchParams.get('action') || 'emotions';

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'imageUrl parameter is required' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'emotions') {
      // First detect faces, then emotions
      const faceDetection = await detectFaces(imageUrl);
      result = await detectEmotions(imageUrl, faceDetection.faces);
    } else if (action === 'age-gender') {
      // First detect faces, then age/gender
      const faceDetection = await detectFaces(imageUrl);
      result = await detectAgeGender(imageUrl, faceDetection.faces);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "emotions" or "age-gender"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Face analysis error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Face analysis failed' },
      { status: 500 }
    );
  }
}
