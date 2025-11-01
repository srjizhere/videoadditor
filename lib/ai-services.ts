// AI Services Configuration and Utilities
import { ImageTransformation } from '@/types/media';

// WARNING: Only include non-sensitive, public configuration here
// This file is imported by frontend components and will be exposed to browsers
export const AI_CONFIG = {
  // Only public keys and endpoints that are safe to expose
  IMAGEKIT_PUBLIC_KEY: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  IMAGEKIT_URL_ENDPOINT: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
  
  // NEVER expose private keys, secrets, or API keys in frontend code!
  // These should only be used in API routes (server-side):
  // - IMAGEKIT_PRIVATE_KEY
  // - OPENAI_API_KEY  
  // - GOOGLE_CLOUD_API_KEY
  // - AWS_SECRET_ACCESS_KEY
  // - AWS_ACCESS_KEY_ID
};

// AI Service Types
export interface AITag {
  tag: string;
  confidence: number;
  category: string;
}


export interface ImageEnhancement {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  noiseReduction?: boolean;
}

export interface VideoThumbnail {
  timestamp: number;
  confidence: number;
  thumbnailUrl: string;
}

export interface VideoHighlight {
  startTime: number;
  endTime: number;
  confidence: number;
  description: string;
  type: 'motion' | 'face' | 'audio' | 'scene_change';
}

export interface SpeechToTextResult {
  text: string;
  confidence: number;
  timestamps: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
}

export interface ContentModerationResult {
  isAppropriate: boolean;
  confidence: number;
  categories: Array<{
    name: string;
    confidence: number;
  }>;
  reasons: string[];
}

// ImageKit AI Transformations
export const IMAGEKIT_AI_TRANSFORMATIONS = {
  BACKGROUND_REMOVAL: 'bg-removal',
  OBJECT_DETECTION: 'object-detection',
  QUALITY_ENHANCEMENT: 'quality-enhancement',
  AUTO_TAG: 'auto-tag',
} as const;

// Utility function to generate ImageKit transformation URL
export function generateImageKitTransformUrl(
  imageUrl: string,
  transformations: ImageTransformation & { ai?: string; x?: number; y?: number }
): string {
  const baseUrl = imageUrl.split('?')[0];
  const trParams: string[] = [];
  
  // Standard transformations using ImageKit's tr= format
  if (transformations.width) trParams.push(`w-${transformations.width}`);
  if (transformations.height) trParams.push(`h-${transformations.height}`);
  if (transformations.crop) trParams.push(`c-${transformations.crop}`);
  if (transformations.quality) trParams.push(`q-${transformations.quality}`);
  if (transformations.format) trParams.push(`f-${transformations.format}`);
  if (transformations.blur) trParams.push(`bl-${transformations.blur}`);
  if (transformations.brightness) trParams.push(`br-${transformations.brightness}`);
  if (transformations.contrast) trParams.push(`ct-${transformations.contrast}`);
  if (transformations.saturation) trParams.push(`sa-${transformations.saturation}`);
  if (transformations.x) trParams.push(`x-${transformations.x}`);
  if (transformations.y) trParams.push(`y-${transformations.y}`);
  
  // AI transformations
  if (transformations.ai) trParams.push(`ai-${transformations.ai}`);
  
  if (trParams.length === 0) return imageUrl;
  
  return `${baseUrl}?tr=${trParams.join(',')}`;
}

// Error handling for AI services
export class AIServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Rate limiting for AI services
export class AIRateLimiter {
  private static limits = new Map<string, { count: number; resetTime: number }>();
  
  static async checkLimit(service: string, maxRequests: number = 100, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now();
    const key = service;
    const limit = this.limits.get(key);
    
    if (!limit || now > limit.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (limit.count >= maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }
}

// Validate AI service configuration (frontend-safe version)
export function validateAIConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!AI_CONFIG.IMAGEKIT_PUBLIC_KEY) missing.push('NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY');
  if (!AI_CONFIG.IMAGEKIT_URL_ENDPOINT) missing.push('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT');
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Server-side validation function for API routes only
export function validateServerAIConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Check server-side environment variables
  if (!process.env.IMAGEKIT_PRIVATE_KEY) missing.push('IMAGEKIT_PRIVATE_KEY');
  
  return {
    isValid: missing.length === 0,
    missing
  };
}
