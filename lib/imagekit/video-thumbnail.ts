/**
 * Video Thumbnail Generation Utilities
 * 
 * Provides functions to generate video thumbnails using ImageKit's recommended methods
 * 
 * ✅ TESTED AND VERIFIED: The /ik-thumbnail.jpg endpoint format works correctly.
 * Format: https://ik.imagekit.io/{id}/video.mp4/ik-thumbnail.jpg?tr=w-1280,h-720
 * 
 * IMPORTANT: ImageKit needs time to process videos after upload (typically 10-30 seconds).
 * During this time, the thumbnail URL may return "Not Found" or 404 errors.
 * Use checkThumbnailAvailability() and retry logic to handle this gracefully.
 */

/**
 * Generate a video thumbnail URL using ImageKit's recommended method
 * 
 * ✅ TESTED: This format returns 200 OK with Content-Type: image/jpeg when video is processed
 * 
 * According to ImageKit documentation:
 * - Use /ik-thumbnail.jpg endpoint appended to video URL
 * - Use so-{seconds} parameter to specify time offset (optional, default is first frame)
 * - Use transformation parameters for resizing the thumbnail
 * - NOTE: fo-auto is NOT valid for videos, only for images
 * - NOTE: Direct transformation with f-jpg (e.g., ?tr=f-jpg) does NOT work - returns 400 Bad Request
 * 
 * @param videoUrl - The ImageKit video URL
 * @param width - Thumbnail width in pixels (default: 1280)
 * @param height - Thumbnail height in pixels (default: 720)
 * @param timeOffset - Optional time offset in seconds (default: 0 = first frame)
 * @returns ImageKit URL with /ik-thumbnail.jpg endpoint
 * 
 * @example
 * generateVideoThumbnailUrl('https://ik.imagekit.io/id/video.mp4')
 * // Returns: 'https://ik.imagekit.io/id/video.mp4/ik-thumbnail.jpg?tr=w-1280,h-720'
 * 
 * @example
 * generateVideoThumbnailUrl('https://ik.imagekit.io/id/video.mp4', 300, 200, 5)
 * // Returns: 'https://ik.imagekit.io/id/video.mp4/ik-thumbnail.jpg?tr=w-300,h-200,so-5'
 */
export function generateVideoThumbnailUrl(
  videoUrl: string,
  width: number = 1280,
  height: number = 720,
  timeOffset?: number
): string {
  // Remove any existing query parameters to get clean base URL
  const baseUrl = videoUrl.split('?')[0];
  
  // ImageKit's recommended method: Use /ik-thumbnail.jpg endpoint
  // Format: https://ik.imagekit.io/id/video.mp4/ik-thumbnail.jpg
  let thumbnailUrl = `${baseUrl}/ik-thumbnail.jpg`;
  
  // Build transformation parameters for resizing
  const transformations: string[] = [];
  
  if (width) {
    transformations.push(`w-${width}`);
  }
  if (height) {
    transformations.push(`h-${height}`);
  }
  
  // Add time offset if specified (so = start offset in seconds)
  // Default is 0 (first frame), but can specify any time
  // Note: so-0 or no so parameter both mean first frame
  if (timeOffset !== undefined && timeOffset > 0) {
    transformations.push(`so-${timeOffset}`);
  }
  
  // Add transformations if any
  if (transformations.length > 0) {
    thumbnailUrl += `?tr=${transformations.join(',')}`;
  }
  
  return thumbnailUrl;
}

/**
 * Check if a thumbnail URL is accessible (for retry logic)
 * This can be used to verify if ImageKit has processed the video
 * 
 * Uses Image element to check if thumbnail loads successfully
 * This is more reliable than fetch for cross-origin ImageKit URLs
 */
export async function checkThumbnailAvailability(thumbnailUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a temporary image element to test if thumbnail loads
    const img = new Image();
    
    // Set a timeout (5 seconds) to avoid waiting too long
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    // Add cache buster to ensure fresh check
    const separator = thumbnailUrl.includes('?') ? '&' : '?';
    img.src = `${thumbnailUrl}${separator}_t=${Date.now()}`;
  });
}

/**
 * Wait for thumbnail to become available with retry logic
 * ImageKit may need time to process videos after upload
 */
export async function waitForThumbnail(
  thumbnailUrl: string,
  maxRetries: number = 5,
  delayMs: number = 2000
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    const isAvailable = await checkThumbnailAvailability(thumbnailUrl);
    if (isAvailable) {
      return thumbnailUrl;
    }
    
    // Wait before next retry (except on last attempt)
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return null; // Thumbnail not available after retries
}

/**
 * Generate thumbnail URL for a specific scene/time in the video
 * 
 * @param videoUrl - The ImageKit video URL
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds (optional, for scene extraction)
 * @param width - Thumbnail width (default: 1280)
 * @param height - Thumbnail height (default: 720)
 * @returns ImageKit URL with /ik-thumbnail.jpg endpoint and time offset
 */
export function generateVideoSceneThumbnailUrl(
  videoUrl: string,
  startTime: number,
  endTime?: number,
  width: number = 1280,
  height: number = 720
): string {
  const baseUrl = videoUrl.split('?')[0];
  const transformations: string[] = [
    `w-${width}`,
    `h-${height}`,
    `so-${startTime}` // Start offset in seconds
  ];
  
  // Note: endTime is not directly supported in ImageKit thumbnail endpoint
  // The thumbnail is a single frame, so we only use startTime
  
  return `${baseUrl}/ik-thumbnail.jpg?tr=${transformations.join(',')}`;
}

