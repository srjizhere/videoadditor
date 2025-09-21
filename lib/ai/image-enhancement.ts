// Image Quality Enhancement using AI
import { generateImageKitTransformUrl, AIServiceError, AIRateLimiter, ImageEnhancement } from '../ai-services';
import { ImageTransformation } from '@/types/media';

export interface ImageEnhancementResult {
  originalUrl: string;
  enhancedUrl: string;
  enhancements: ImageEnhancement;
  success: boolean;
  processingTime: number;
  error?: string;
}

export interface ImageEnhancementOptions {
  brightness?: number; // -100 to 100
  contrast?: number;   // -100 to 100
  saturation?: number; // -100 to 100
  sharpness?: number;  // 0 to 100
  noiseReduction?: boolean;
  autoEnhance?: boolean;
  quality?: number;    // 1 to 100
  format?: 'jpg' | 'png' | 'webp' | 'auto';
}

/**
 * Enhance image quality using ImageKit transformations and AI
 */
export async function enhanceImageQuality(
  imageUrl: string,
  options: ImageEnhancementOptions = {}
): Promise<ImageEnhancementResult> {
  const startTime = Date.now();
  
  try {
    // Check rate limit
    const canProceed = await AIRateLimiter.checkLimit('image-enhancement', 50, 60000);
    if (!canProceed) {
      throw new AIServiceError(
        'Rate limit exceeded for image enhancement service',
        'image-enhancement',
        429
      );
    }

    // Validate image URL
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new AIServiceError(
        'Invalid image URL provided',
        'image-enhancement',
        400
      );
    }

    // Prepare enhancements
    const enhancements: ImageEnhancement = {
      brightness: options.brightness || 0,
      contrast: options.contrast || 0,
      saturation: options.saturation || 0,
      sharpness: options.sharpness || 0,
      noiseReduction: options.noiseReduction || false
    };

    // Generate enhanced URL using ImageKit transformations
    const transformations: ImageTransformation & { ai?: string } = {
      quality: options.quality || 90,
      format: options.format || 'auto',
      brightness: enhancements.brightness,
      contrast: enhancements.contrast,
      saturation: enhancements.saturation,
      ...(enhancements.sharpness && enhancements.sharpness > 0 && { blur: Math.max(0, 100 - enhancements.sharpness) }),
      ...(options.autoEnhance && { ai: 'auto-enhance' })
    };

    const enhancedUrl = generateImageKitTransformUrl(imageUrl, transformations);
    
    // Test if the enhanced URL is accessible
    const testResponse = await fetch(enhancedUrl, { method: 'HEAD' });
    if (!testResponse.ok) {
      throw new AIServiceError(
        `Image enhancement failed: ${testResponse.statusText}`,
        'image-enhancement',
        testResponse.status
      );
    }

    const processingTime = Date.now() - startTime;

    return {
      originalUrl: imageUrl,
      enhancedUrl,
      enhancements,
      success: true,
      processingTime,
    };

  } catch (error) {
    // const _processingTime = Date.now() - startTime;
    
    if (error instanceof AIServiceError) {
      throw error;
    }

    throw new AIServiceError(
      `Image enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'image-enhancement',
      500,
      error
    );
  }
}

/**
 * Auto-enhance image using AI to detect optimal settings
 */
export async function autoEnhanceImage(
  imageUrl: string,
  options: { quality?: number; format?: 'jpg' | 'png' | 'webp' } = {}
): Promise<ImageEnhancementResult> {
  // For auto-enhancement, we'll use ImageKit's AI enhancement
  return enhanceImageQuality(imageUrl, {
    autoEnhance: true,
    quality: options.quality || 90,
    format: options.format || 'auto'
  });
}

/**
 * Batch enhance multiple images
 */
export async function batchEnhanceImages(
  imageUrls: string[],
  options: ImageEnhancementOptions = {}
): Promise<ImageEnhancementResult[]> {
  const results: ImageEnhancementResult[] = [];
  
  // Process images in batches of 3 to avoid overwhelming the service
  const batchSize = 3;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => 
      enhanceImageQuality(url, options).catch(error => ({
        originalUrl: url,
        enhancedUrl: '',
        enhancements: {},
        success: false,
        processingTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get enhancement preview with different settings
 */
export function getEnhancementPreview(
  imageUrl: string,
  enhancement: ImageEnhancement,
  width: number = 300
): string {
  const transformations: ImageTransformation = {
    width,
    height: width,
    crop: 'at_max',
    brightness: enhancement.brightness,
    contrast: enhancement.contrast,
    saturation: enhancement.saturation,
    ...(enhancement.sharpness && { blur: Math.max(0, 100 - enhancement.sharpness) })
  };

  return generateImageKitTransformUrl(imageUrl, transformations);
}

/**
 * Create before/after comparison
 */
export function createEnhancementComparison(
  originalUrl: string,
  enhancedUrl: string,
  width: number = 300
): { original: string; enhanced: string } {
  const originalTransform = generateImageKitTransformUrl(originalUrl, {
    width,
    height: width,
    crop: 'at_max'
  });
  
  const enhancedTransform = generateImageKitTransformUrl(enhancedUrl, {
    width,
    height: width,
    crop: 'at_max'
  });
  
  return {
    original: originalTransform,
    enhanced: enhancedTransform
  };
}

/**
 * Analyze image quality using AI and suggest enhancements
 */
export async function analyzeImageQuality(_imageUrl: string): Promise<{
  qualityScore: number;
  suggestions: string[];
  recommendedEnhancements: ImageEnhancementOptions;
}> {
  try {
    // Note: Real implementation would use AI services like:
    // - Google Cloud Vision API
    // - Custom ML models for quality assessment
    // - ImageKit's built-in quality metrics
    
    throw new AIServiceError(
      'Image quality analysis not implemented. Requires AI service integration for automatic quality assessment.',
      'image-enhancement',
      501
    );
    
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }
    
    throw new AIServiceError(
      `Image quality analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'image-enhancement',
      500,
      error
    );
  }
}
