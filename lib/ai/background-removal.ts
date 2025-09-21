// Automatic Background Removal using ImageKit API
import { generateImageKitTransformUrl, AIServiceError, AIRateLimiter } from '../ai-services';
import { ImageTransformation } from '@/types/media';

export interface BackgroundRemovalResult {
  originalUrl: string;
  processedUrl: string;
  success: boolean;
  processingTime: number;
  error?: string;
}

export interface BackgroundRemovalOptions {
  quality?: number;
  format?: 'png' | 'jpg' | 'webp';
  transparent?: boolean;
  edgeDetection?: boolean;
}

/**
 * Remove background from an image using ImageKit's AI background removal
 */
export async function removeBackground(
  imageUrl: string,
  options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult> {
  const startTime = Date.now();
  
  try {
    // Check rate limit
    const canProceed = await AIRateLimiter.checkLimit('background-removal', 50, 60000);
    if (!canProceed) {
      throw new AIServiceError(
        'Rate limit exceeded for background removal service',
        'background-removal',
        429
      );
    }

    // Validate image URL
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new AIServiceError(
        'Invalid image URL provided',
        'background-removal',
        400
      );
    }

    // Prepare transformations
    const transformations: ImageTransformation & { ai?: string } = {
      ai: 'bg-removal',
      quality: options.quality || 90,
      format: options.format || 'png',
      ...(options.transparent && { crop: 'at_max' })
    };

    // Generate processed URL
    const processedUrl = generateImageKitTransformUrl(imageUrl, transformations);
    
    // Test if the processed URL is accessible
    const testResponse = await fetch(processedUrl, { method: 'HEAD' });
    if (!testResponse.ok) {
      throw new AIServiceError(
        `Background removal failed: ${testResponse.statusText}`,
        'background-removal',
        testResponse.status
      );
    }

    const processingTime = Date.now() - startTime;

    return {
      originalUrl: imageUrl,
      processedUrl,
      success: true,
      processingTime,
    };

  } catch (error) {
    // const _processingTime = Date.now() - startTime;
    
    if (error instanceof AIServiceError) {
      throw error;
    }

    throw new AIServiceError(
      `Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'background-removal',
      500,
      error
    );
  }
}

/**
 * Batch remove backgrounds from multiple images
 */
export async function batchRemoveBackground(
  imageUrls: string[],
  options: BackgroundRemovalOptions = {}
): Promise<BackgroundRemovalResult[]> {
  const results: BackgroundRemovalResult[] = [];
  
  // Process images in batches of 5 to avoid overwhelming the service
  const batchSize = 5;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => 
      removeBackground(url, options).catch(error => ({
        originalUrl: url,
        processedUrl: '',
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
 * Get background removal status and preview
 */
export async function getBackgroundRemovalStatus(
  imageUrl: string,
  processedUrl: string
): Promise<{
  isReady: boolean;
  previewUrl?: string;
  error?: string;
}> {
  try {
    const response = await fetch(processedUrl, { method: 'HEAD' });
    
    if (response.ok) {
      return {
        isReady: true,
        previewUrl: processedUrl
      };
    } else {
      return {
        isReady: false,
        error: `Processing failed: ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      isReady: false,
      error: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Create a comparison preview showing original and processed images
 */
export function createComparisonPreview(
  originalUrl: string,
  processedUrl: string,
  width: number = 300
): string {
  const originalTransform = generateImageKitTransformUrl(originalUrl, {
    width,
    height: width,
    crop: 'at_max'
  });
  
  const processedTransform = generateImageKitTransformUrl(processedUrl, {
    width,
    height: width,
    crop: 'at_max'
  });
  
  // Return a simple comparison URL (this would need to be implemented in your frontend)
  return `${processedTransform}&comparison=${encodeURIComponent(originalTransform)}`;
}
