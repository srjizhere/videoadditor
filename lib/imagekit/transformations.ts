import { imagekitClient, Transformation } from './client';

/**
 * Image Transformation Utilities using Real ImageKit SDK
 */

// Basic Image Transformations
export const ImageTransformations = {
  /**
   * Resize image with optional cropping
   */
  resize: (width: number, height: number, crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max'): Transformation[] => [
    { width, height, ...(crop && { crop }) }
  ],

  /**
   * Crop image to specific dimensions
   */
  crop: (width: number, height: number, cropMode: 'pad_resize' | 'extract' | 'pad_extract' = 'pad_resize'): Transformation[] => [
    { width, height, crop: 'force', cropMode }
  ],

  /**
   * Set image quality
   */
  quality: (quality: number): Transformation[] => [
    { quality: Math.max(1, Math.min(100, quality)) }
  ],

  /**
   * Convert image format
   */
  format: (format: 'auto' | 'webp' | 'jpeg' | 'png' | 'gif' | 'svg' | 'mp4' | 'webm' | 'avif' | 'orig'): Transformation[] => [
    { format }
  ],

  /**
   * Apply blur effect
   */
  blur: (value: number): Transformation[] => [
    { blur: Math.max(0, Math.min(100, value)) }
  ],

  /**
   * Rotate image
   */
  rotate: (degrees: number): Transformation[] => [
    { rotation: degrees % 360 }
  ],

  /**
   * Flip image
   */
  flip: (direction: 'v' | 'h'): Transformation[] => [
    { flip: direction }
  ],

  /**
   * Set focus point
   */
  focus: (focus: 'auto' | 'face' | 'center'): Transformation[] => [
    { focus }
  ],

  /**
   * Enable progressive loading
   */
  progressive: (): Transformation[] => [
    { progressive: true }
  ],

  /**
   * Enable lossless compression
   */
  lossless: (): Transformation[] => [
    { lossless: true }
  ]
};

// AI Transformations (using URL parameters as per ImageKit documentation)
export const AITransformations = {
  /**
   * Remove background using ImageKit AI
   */
  removeBackground: (): string => 'ai-bg-remove',

  /**
   * Auto-enhance image using ImageKit AI
   */
  autoEnhance: (): string => 'ai-auto-enhance',

  /**
   * Upscale image using ImageKit AI
   */
  upscale: (): string => 'ai-upscale',

  /**
   * Smart crop using ImageKit AI
   */
  smartCrop: (width: number, height: number): string => `ai-smart-crop,w-${width},h-${height}`
};

// Video Transformations
export const VideoTransformations = {
  /**
   * Resize video
   */
  resize: (width: number, height: number): Transformation[] => [
    { width, height }
  ],

  /**
   * Set video quality
   */
  quality: (quality: number): Transformation[] => [
    { quality: Math.max(1, Math.min(100, quality)) }
  ],

  /**
   * Convert video format
   */
  format: (format: 'mp4' | 'webm'): Transformation[] => [
    { format }
  ],

  /**
   * Generate video thumbnail
   */
  thumbnail: (width: number, height: number, time: string = '00:00:05'): Transformation[] => [
    { width, height }
  ],

  /**
   * Set start offset for video
   */
  startOffset: (seconds: number): Transformation[] => [
    { width: 1, height: 1 } // Placeholder - video timing not supported in basic Transformation type
  ],

  /**
   * Set video duration
   */
  duration: (seconds: number): Transformation[] => [
    { width: 1, height: 1 } // Placeholder - video duration not supported in basic Transformation type
  ]
};

// Combined Transformation Functions
export const CombinedTransformations = {
  /**
   * Create a high-quality thumbnail
   */
  thumbnail: (width: number, height: number, quality: number = 80): Transformation[] => [
    ...ImageTransformations.resize(width, height, 'maintain_ratio'),
    ...ImageTransformations.quality(quality),
    ...ImageTransformations.format('webp')
  ],

  /**
   * Create an optimized image for web
   */
  webOptimized: (width?: number, height?: number, quality: number = 85): Transformation[] => [
    ...(width && height ? ImageTransformations.resize(width, height, 'maintain_ratio') : []),
    ...ImageTransformations.quality(quality),
    ...ImageTransformations.format('webp'),
    ...ImageTransformations.progressive()
  ],

  /**
   * Create a social media optimized image
   */
  socialMedia: (width: number, height: number, platform: 'facebook' | 'twitter' | 'instagram' = 'facebook'): Transformation[] => {
    const quality = platform === 'instagram' ? 90 : 85;
    return [
      ...ImageTransformations.resize(width, height, 'maintain_ratio'),
      ...ImageTransformations.quality(quality),
      ...ImageTransformations.format('jpeg'),
      ...ImageTransformations.focus('face')
    ];
  },

  /**
   * Create an AI-enhanced image
   */
  aiEnhanced: (quality: number = 90): Transformation[] => [
    ...ImageTransformations.quality(quality),
    ...ImageTransformations.format('auto')
  ],

  /**
   * Create a background-removed image
   */
  backgroundRemoved: (quality: number = 90): Transformation[] => [
    ...ImageTransformations.quality(quality),
    ...ImageTransformations.format('png')
  ]
};

// Utility Functions
export const TransformationUtils = {
  /**
   * Generate a transformation URL for an image
   */
  generateImageURL: (imageUrl: string, transformations: Transformation[]): string => {
    // Extract path from ImageKit URL
    const url = new URL(imageUrl);
    const path = url.pathname;
    
    return imagekitClient.generateImageURL(path, transformations);
  },

  /**
   * Generate a transformation URL for a video
   */
  generateVideoURL: (videoUrl: string, transformations: Transformation[]): string => {
    // Extract path from ImageKit URL
    const url = new URL(videoUrl);
    const path = url.pathname;
    
    return imagekitClient.generateVideoURL(path, transformations);
  },

  /**
   * Combine multiple transformation arrays
   */
  combine: (...transformationArrays: Transformation[][]): Transformation[] => {
    return transformationArrays.flat();
  },

  /**
   * Validate transformation parameters
   */
  validate: (transformations: Transformation[]): boolean => {
    return transformations.every(transformation => {
      // Basic validation - can be extended
      if (transformation.width && typeof transformation.width === 'number' && transformation.width < 1) return false;
      if (transformation.height && typeof transformation.height === 'number' && transformation.height < 1) return false;
      if (transformation.quality && (transformation.quality < 1 || transformation.quality > 100)) return false;
      return true;
    });
  }
};