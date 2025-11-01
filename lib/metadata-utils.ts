/**
 * Utility functions for reading and processing HTTP metadata
 */

export interface ImageMetadata {
  // Basic HTTP headers
  contentType?: string;
  contentLength?: string;
  lastModified?: string;
  etag?: string;
  cacheControl?: string;
  expires?: string;
  
  // ImageKit specific headers
  imagekitId?: string;
  imagekitSignature?: string;
  imagekitTimestamp?: string;
  
  // Processed metadata
  fileSizeBytes: number;
  fileSizeFormatted: string;
  isImage: boolean;
  isPng: boolean;
  isJpeg: boolean;
  isWebp: boolean;
  hasTransparency: boolean;
  dimensions?: { width: number; height: number };
  compressionRatio?: number;
}

export interface MetadataResponse {
  success: boolean;
  metadata?: ImageMetadata;
  error?: string;
}

/**
 * Extract metadata from HTTP response headers
 */
export function extractMetadataFromHeaders(headers: Headers): ImageMetadata {
  const contentType = headers.get('content-type') || '';
  const contentLength = headers.get('content-length') || '0';
  const fileSizeBytes = parseInt(contentLength);
  
  return {
    // Basic headers
    contentType,
    contentLength,
    lastModified: headers.get('last-modified') || undefined,
    etag: headers.get('etag') || undefined,
    cacheControl: headers.get('cache-control') || undefined,
    expires: headers.get('expires') || undefined,
    
    // ImageKit specific
    imagekitId: headers.get('x-imagekit-id') || undefined,
    imagekitSignature: headers.get('x-imagekit-signature') || undefined,
    imagekitTimestamp: headers.get('x-imagekit-timestamp') || undefined,
    
    // Processed metadata
    fileSizeBytes,
    fileSizeFormatted: formatFileSize(fileSizeBytes),
    isImage: contentType.startsWith('image/'),
    isPng: contentType === 'image/png',
    isJpeg: contentType === 'image/jpeg' || contentType === 'image/jpg',
    isWebp: contentType === 'image/webp',
    hasTransparency: contentType === 'image/png' || contentType === 'image/webp'
  };
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get image dimensions from URL (requires actual image load)
 */
export async function getImageDimensions(imageUrl: string): Promise<{ width: number; height: number } | null> {
  try {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
}

/**
 * Calculate compression ratio
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

/**
 * Check if image has transparency support
 */
export function hasTransparencySupport(contentType: string): boolean {
  return contentType === 'image/png' || 
         contentType === 'image/webp' || 
         contentType === 'image/gif';
}

/**
 * Check if ImageKit is still processing the image
 */
export function isImageKitProcessing(contentType: string, contentLength: number): boolean {
  // ImageKit returns HTML with small content when still processing
  return contentType.includes('text/html') && contentLength < 1000;
}

/**
 * Check if response is a valid processed image
 */
export function isValidProcessedImage(contentType: string, contentLength: number): boolean {
  return contentType.startsWith('image/') && contentLength > 1000;
}

/**
 * Get image format from content type
 */
export function getImageFormat(contentType: string): string {
  if (contentType.includes('png')) return 'PNG';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'JPEG';
  if (contentType.includes('webp')) return 'WebP';
  if (contentType.includes('gif')) return 'GIF';
  if (contentType.includes('svg')) return 'SVG';
  return 'Unknown';
}

/**
 * Validate if response is a valid image
 */
export function isValidImageResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  return response.ok && contentType.startsWith('image/');
}

/**
 * Get processing status from response
 */
export function getProcessingStatus(response: Response): {
  isReady: boolean;
  status: 'completed' | 'processing' | 'error';
  message: string;
} {
  if (response.ok) {
    return {
      isReady: true,
      status: 'completed',
      message: 'Processing completed successfully!'
    };
  } else if (response.status === 404) {
    return {
      isReady: false,
      status: 'processing',
      message: 'Image is still processing. Please wait...'
    };
  } else {
    return {
      isReady: false,
      status: 'error',
      message: `Processing failed: ${response.statusText}`
    };
  }
}

/**
 * Comprehensive metadata reader for images
 */
export async function readImageMetadata(imageUrl: string): Promise<MetadataResponse> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    const metadata = extractMetadataFromHeaders(response.headers);
    
    // If it's an image, try to get dimensions
    if (metadata.isImage) {
      try {
        const dimensions = await getImageDimensions(imageUrl);
        if (dimensions) {
          metadata.dimensions = dimensions;
        }
      } catch (error) {
        console.warn('Could not get image dimensions:', error);
      }
    }
    
    return {
      success: true,
      metadata
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
