import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeImageQuality } from '@/lib/ai/image-enhancement';
import { logSecurityEvent } from '@/lib/security';

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

    logSecurityEvent('AI_IMAGE_ANALYSIS_SUCCESS', {
      userId: session.user.id,
      imageUrl: imageUrl.substring(0, 100) + '...' // Truncate for security
    }, request);

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Image quality analysis error:', error);
    
    logSecurityEvent('AI_IMAGE_ANALYSIS_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);
    
    return NextResponse.json(
      { success: false, error: 'Image quality analysis failed' },
      { status: 500 }
    );
  }
}
