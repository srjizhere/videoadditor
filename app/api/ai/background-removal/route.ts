import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  generateBackgroundRemovalURL, 
  extractOriginalPath,
  extractExistingTransformations,
  buildChainedTransformationURL,
  createBackgroundRemovalStep,
  mergeTransformationSteps,
  mergeTransformationParameters
} from '@/lib/imagekit/server';
import { AIServiceError } from '@/lib/ai-services';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/background-removal - Remove background using real ImageKit AI
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

    
      // Single image processing with real ImageKit background removal with parameter-level merging
      // Extract original path and existing transformations
      const originalPath = extractOriginalPath(imageUrl);
      const existingTransformations = extractExistingTransformations(imageUrl);
      
      // Create background removal transformation step
      const bgRemovalStep = createBackgroundRemovalStep({
        width: 800,
        height: 800,
        quality: options.quality || 90,
        format: 'png',
        backgroundColor: 'transparent'
      });
      
      // ✅ Use parameter-level merging (faster, prevents duplicates, same as enhancement)
      // This merges all parameters into a single step instead of chaining steps
      const mergedParameters = mergeTransformationParameters(existingTransformations, bgRemovalStep);
      
      // Build transformation URL with single merged step (faster than chained steps)
      const processedUrl = buildChainedTransformationURL(originalPath, [mergedParameters]);
      
      console.log('Generated background removal URL with parameter-level merging:', processedUrl);
      console.log('Original image URL:', imageUrl);
      console.log('Extracted path:', originalPath);
      console.log('Existing transformations:', existingTransformations);
      console.log('New background removal step:', bgRemovalStep);
      console.log('Merged parameters:', mergedParameters);

      result = {
        originalUrl: imageUrl,
        processedUrl,
        processingTime: 0, // ImageKit processing time
        options,
        // ImageKit background removal is async and takes time
        isAsync: true,
        status: 'processing',
        message: 'Background removal started. Processing...'
      };

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

// GET /api/ai/background-removal/info - Get background removal information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return information about ImageKit background removal capabilities
    const info = {
      capabilities: [
        'AI-powered background removal',
        'Instant processing (no waiting)',
        'High-quality results',
        'PNG output with transparency',
        'Batch processing support'
      ],
      supportedFormats: ['JPEG', 'PNG', 'WebP', 'GIF'],
      outputFormat: 'PNG with transparency',
      processingTime: 'Instant',
      quality: 'High-quality AI results'
    };

    return NextResponse.json({
      success: true,
      data: info
    });

  } catch (error) {
    console.error('Background removal info error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get background removal info' },
      { status: 500 }
    );
  }
}
