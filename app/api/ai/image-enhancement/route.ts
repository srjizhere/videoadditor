import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  generateAutoEnhancementURL, 
  generateManualTransformationURL, 
  extractOriginalPath,
  extractExistingTransformations,
  buildChainedTransformationURL,
  createEnhancementStep,
  mergeTransformationSteps,
  mergeTransformationParameters
} from '@/lib/imagekit/server';
import { AIServiceError } from '@/lib/ai-services';
import { logSecurityEvent } from '@/lib/security';

// POST /api/ai/image-enhancement - Enhance image quality using real ImageKit
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

      // Process multiple images with real ImageKit transformations
      const enhancedUrls = imageUrls.map(url => {
        // Extract original path (handles both original and transformed URLs)
        const originalPath = extractOriginalPath(url);
        
        if (autoEnhance) {
          // Use official ImageKit Node.js SDK for auto-enhancement
          return generateAutoEnhancementURL(originalPath, options.quality || 90);
        } else {
            // Use official ImageKit Node.js SDK for manual transformations
            return generateManualTransformationURL(originalPath, {
              blur: options.blur,
              quality: options.quality || 85,
              format: options.format || 'auto',
              brightness: options.brightness,
              contrast: options.contrast,
              saturation: options.saturation,
              sharpen: options.sharpen
            });
        }
      });

      result = enhancedUrls.map((url, index) => ({
        originalUrl: imageUrls[index],
        enhancedUrl: url,
        processingTime: 0, // ImageKit is instant
        enhancements: options,
        // Add async processing info
        isAsync: true,
        estimatedTime: '3-5 minutes',
        status: 'processing',
        message: 'Image enhancement is processing. This may take 3-5 minutes for complex images.'
      }));
    } else if (autoEnhance) {
      // Auto enhancement using real ImageKit AI
      // Extract original path (handles both original and transformed URLs)
      const originalPath = extractOriginalPath(imageUrl);
      
      // Use official ImageKit Node.js SDK for auto-enhancement
      const enhancedUrl = generateAutoEnhancementURL(originalPath, options.quality || 90);
      
      console.log('Auto enhancement URL generated:');
      console.log('Original URL:', imageUrl);
      console.log('Extracted path:', originalPath);
      console.log('Enhanced URL:', enhancedUrl);

      result = {
        originalUrl: imageUrl,
        enhancedUrl,
        processingTime: 0, // ImageKit is instant
        enhancements: { autoEnhance: true, quality: options.quality || 90 },
        // Auto-enhancement is synchronous (real-time transformation)
        isAsync: false,
        status: 'completed',
        message: 'Auto enhancement completed successfully!'
      };
    } else {
      // Manual enhancement using real ImageKit transformations with parameter merging
      // Extract original path and existing transformations
      const originalPath = extractOriginalPath(imageUrl);
      const existingTransformations = extractExistingTransformations(imageUrl);
      
      // ✅ Check if background removal is present (improved detection to prevent false positives)
      const hasBackgroundRemoval = existingTransformations.some(t => {
        // Check for explicit ImageKit background removal
        if (t.includes('e-bgremove')) {
          return true;
        }
        
        // Check for ImageKit bg- parameters (with validation)
        // Pattern: bg-transparent, bg-white, bg-black, bg-removed
        const bgPattern = /(^|,|\s)bg-(transparent|white|black|removed)(,|$|\s)/;
        if (bgPattern.test(t)) {
          return true;
        }
        
        // Check for bg- at start or after comma (ImageKit format)
        if (t.match(/^(bg-|.*,bg-)/)) {
          // Additional validation: should be followed by valid ImageKit bg value
          const validBgValues = ['transparent', 'white', 'black', 'removed'];
          const bgMatch = t.match(/bg-([^,]+)/);
          if (bgMatch && validBgValues.includes(bgMatch[1])) {
            return true;
          }
        }
        
        return false;
      });
      
      // Validate enhancement values (allow full range)
      const safeOptions = {
        blur: options.blur !== undefined ? Math.max(0, Math.min(options.blur, 100)) : undefined,
        quality: options.quality ? Math.max(1, Math.min(options.quality, 100)) : 90,
        format: options.format || 'auto',
        brightness: options.brightness !== undefined ? Math.max(-100, Math.min(options.brightness, 100)) : undefined,
        contrast: options.contrast !== undefined ? Math.max(-100, Math.min(options.contrast, 100)) : undefined,
        saturation: options.saturation !== undefined ? Math.max(-100, Math.min(options.saturation, 100)) : undefined,
        sharpen: options.sharpen !== undefined ? Math.max(0, Math.min(options.sharpen, 100)) : undefined,
      };
      
      // Create new enhancement transformation step
      const enhancementStep = createEnhancementStep(safeOptions);
      
      // Merge transformations at parameter level (prevents sequential chaining, processes in parallel)
      const mergedParameters = mergeTransformationParameters(existingTransformations, enhancementStep);
      
      // Build transformation URL with single merged step (faster than chained steps)
      const enhancedUrl = buildChainedTransformationURL(originalPath, [mergedParameters]);
      
      console.log('Manual enhancement URL generated with parameter merging:');
      console.log('Original URL:', imageUrl);
      console.log('Extracted path:', originalPath);
      console.log('Existing transformations:', existingTransformations);
      console.log('Has background removal:', hasBackgroundRemoval);
      console.log('Safe options:', safeOptions);
      console.log('New enhancement step:', enhancementStep);
      console.log('Merged parameters (single step):', mergedParameters);
      console.log('Enhanced URL:', enhancedUrl);

      result = {
        originalUrl: imageUrl,
        enhancedUrl,
        processingTime: 0, // ImageKit processing time
        enhancements: safeOptions,
        // Make async when background removal is present (takes time to process)
        isAsync: hasBackgroundRemoval,
        status: hasBackgroundRemoval ? 'processing' : 'completed',
        message: hasBackgroundRemoval 
          ? 'Image enhancement is processing. This may take 30-60 seconds due to background removal...'
          : 'Image enhancement completed successfully!',
        estimatedTime: hasBackgroundRemoval ? '30-60 seconds' : undefined
      };
    }

    logSecurityEvent('AI_IMAGE_ENHANCEMENT_SUCCESS', {
      userId: session.user.id,
      imageCount: Array.isArray(result) ? result.length : 1,
      options,
      autoEnhance
    }, request);

    return NextResponse.json({
      success: true,
      data: {
        data: result
      }
    });

  } catch (error) {
    console.error('Image enhancement error:', error);
    
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

// GET /api/ai/image-enhancement/analyze - Get enhancement suggestions
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

    // Return enhancement suggestions based on ImageKit capabilities
    const suggestions = {
      qualityScore: 85, // Default quality score
      suggestions: [
        'Use auto-enhancement for optimal results',
        'Consider WebP format for better compression',
        'Adjust quality settings for your needs',
        'Try AI-powered background removal if needed'
      ],
      recommendedEnhancements: {
        autoEnhance: true,
        quality: 90,
        format: 'auto'
      },
      availableTransformations: [
        'Auto Enhancement (AI)',
        'Background Removal (AI)',
        'Quality Optimization',
        'Format Conversion',
        'Brightness/Contrast/Saturation',
        'Blur/Sharpen Effects'
      ]
    };

    return NextResponse.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('Enhancement suggestions error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get enhancement suggestions' },
      { status: 500 }
    );
  }
}


