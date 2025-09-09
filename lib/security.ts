import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 requests per window (increased for video app)
  maxUploads: 20, // 20 uploads per window (increased)
  maxVideoViews: 1000, // 1000 video views per window
};

export async function checkRateLimit(
  request: NextRequest,
  type: 'api' | 'upload' | 'video-view' = 'api'
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const windowMs = RATE_LIMIT.windowMs;
  
  let maxRequests: number;
  switch (type) {
    case 'upload':
      maxRequests = RATE_LIMIT.maxUploads;
      break;
    case 'video-view':
      maxRequests = RATE_LIMIT.maxVideoViews;
      break;
    default:
      maxRequests = RATE_LIMIT.maxRequests;
  }
  
  const key = `${ip}-${type}`;
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

export async function requireAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }
  return { session, error: null };
}

export function validateVideoId(id: string): boolean {
  // Check if it's a valid MongoDB ObjectId
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export function validateVideoData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required');
  } else if (data.description.length > 2000) {
    errors.push('Description must be less than 2000 characters');
  }
  
  if (!data.videoUrl || typeof data.videoUrl !== 'string') {
    errors.push('Valid video URL is required');
  } else if (!isValidUrl(data.videoUrl)) {
    errors.push('Invalid video URL format');
  }
  
  if (!data.thumbnailUrl || typeof data.thumbnailUrl !== 'string') {
    errors.push('Valid thumbnail URL is required');
  } else if (!isValidUrl(data.thumbnailUrl)) {
    errors.push('Invalid thumbnail URL format');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function logSecurityEvent(
  event: string,
  details: any,
  request: NextRequest
) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  console.log(`[SECURITY] ${event}`, {
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
    ...details
  });
}
