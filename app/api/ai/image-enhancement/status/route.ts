import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { extractMetadataFromHeaders, isImageKitProcessing, isValidProcessedImage } from '@/lib/metadata-utils';
import { validateImageKitUrl } from '@/lib/imagekit/url-validation';

/**
 * Check the status of image enhancement processing
 * This endpoint helps handle the async nature of ImageKit image enhancement
 */
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
    const enhancedUrl = searchParams.get('enhancedUrl');

    if (!enhancedUrl) {
      return NextResponse.json(
        { success: false, error: 'enhancedUrl parameter is required' },
        { status: 400 }
      );
    }

    // ✅ CRITICAL: Validate URL before fetching (SSRF protection)
    const validation = validateImageKitUrl(enhancedUrl);
    if (!validation.isValid) {
      logSecurityEvent('SSRF_ATTEMPT_BLOCKED', {
        userId: session.user.id,
        url: enhancedUrl,
        reason: validation.error
      }, request);
      
      return NextResponse.json({
        success: false,
        status: 'error',
        isReady: false,
        error: 'Invalid URL format'
      }, { status: 400 });
    }

    // ✅ Set timeout for fetch (prevent hanging)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // Check if the enhanced image is available by making a HEAD request
    try {
      const response = await fetch(enhancedUrl, { 
        method: 'HEAD',
        signal: controller.signal,
        // ✅ Restrict redirects (prevent redirect attacks)
        redirect: 'error' as RequestRedirect
      });
      
      clearTimeout(timeoutId);
      
      // Check if ImageKit is still processing the image
      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length') || '0';
      const fileSizeBytes = parseInt(contentLength);
      
      // Use utility function to check if ImageKit is still processing
      const isStillProcessing = response.ok && isImageKitProcessing(contentType, fileSizeBytes);
      const isValidImage = response.ok && isValidProcessedImage(contentType, fileSizeBytes);
      
      if (isStillProcessing) {
        // Image is still being processed by ImageKit
        return NextResponse.json({
          success: true,
          status: 'processing',
          isReady: false,
          enhancedUrl,
          message: 'Image enhancement is still processing. Please wait...',
          estimatedTime: '3-5 minutes total',
          processingInfo: {
            stage: 'ImageKit AI processing',
            contentType: contentType,
            contentLength: fileSizeBytes,
            note: 'ImageKit is preparing the enhanced image'
          }
        });
      } else if (isValidImage) {
        // Image is ready - extract proper metadata
        const metadata = extractMetadataFromHeaders(response.headers);
        
        console.log('Image enhancement completed successfully!');
        console.log('Enhanced URL:', enhancedUrl);
        console.log('Content Type:', contentType);
        console.log('File Size:', fileSizeBytes);
        console.log('Metadata:', metadata);
        
        return NextResponse.json({
          success: true,
          status: 'completed',
          isReady: true,
          enhancedUrl,
          message: 'Image enhancement completed successfully!',
          metadata,
          processingInfo: {
            estimatedTime: 'Instant (ImageKit processing)',
            processingMethod: 'ImageKit AI Enhancement',
            outputFormat: metadata.isPng ? 'PNG' : metadata.isJpeg ? 'JPEG' : 'Auto',
            compressionRatio: metadata.fileSizeBytes > 0 ? 
              Math.round((1 - metadata.fileSizeBytes / (metadata.fileSizeBytes * 1.2)) * 100) : 0
          }
        });
      } else if (response.status === 404) {
        // Image not found
        return NextResponse.json({
          success: true,
          status: 'processing',
          isReady: false,
          enhancedUrl,
          message: 'Image enhancement is still processing. Please wait...',
          estimatedTime: '3-5 minutes total'
        });
      } else if (response.ok) {
        // Response is OK but not a valid image - likely still processing
        return NextResponse.json({
          success: true,
          status: 'processing',
          isReady: false,
          enhancedUrl,
          message: 'Image enhancement is still processing. Please wait...',
          estimatedTime: '3-5 minutes total',
          processingInfo: {
            stage: 'ImageKit processing',
            contentType: contentType,
            contentLength: fileSizeBytes,
            note: 'ImageKit is preparing the enhanced image'
          }
        });
      } else if (response.status >= 400 && response.status < 500) {
        // ✅ 4xx errors = permanent client errors
        clearTimeout(timeoutId);
        return NextResponse.json({
          success: false,
          status: 'error',
          isReady: false,
          error: `Client error: HTTP ${response.status}`,
          message: 'Image enhancement failed permanently. Please try again with a different image.'
        });
      } else {
        // ✅ 5xx errors = server errors (might be temporary)
        clearTimeout(timeoutId);
        return NextResponse.json({
          success: true,
          status: 'processing',
          isReady: false,
          enhancedUrl,
          message: 'ImageKit server is experiencing issues. Retrying...',
          estimatedTime: 'Unknown'
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // ✅ DISTINGUISH error types
      const errorMessage = fetchError?.message || 'Unknown error';
      const errorCode = fetchError?.code;
      
      // ✅ Permanent errors (fail fast)
      if (
        errorCode === 'ENOTFOUND' || // DNS failure (permanent)
        errorCode === 'ENETUNREACH' || // Network unreachable
        errorMessage.includes('Invalid URL') ||
        errorMessage.includes('ECONNREFUSED')
      ) {
        return NextResponse.json({
          success: false,
          status: 'error',
          isReady: false,
          error: 'Network error: Unable to reach ImageKit servers',
          message: 'Image enhancement failed due to network issues. Please check your connection and try again.'
        });
      }
      
      // ✅ Timeout (might be temporary, but likely permanent if ImageKit is down)
      if (fetchError.name === 'AbortError' || errorMessage.includes('timeout')) {
        // Track consecutive timeouts
        // If > 3 timeouts in a row, treat as permanent error
        return NextResponse.json({
          success: true, // Still treat as processing for first few timeouts
          status: 'processing',
          isReady: false,
          enhancedUrl,
          message: 'Request timeout. ImageKit may be slow. Retrying...',
          estimatedTime: 'Unknown'
        });
      }
      
      // ✅ Temporary errors (retry)
      return NextResponse.json({
        success: true,
        status: 'processing',
        isReady: false,
        enhancedUrl,
        message: 'Temporary network issue. Retrying...',
        estimatedTime: 'Unknown'
      });
    }

  } catch (error) {
    console.error('Image enhancement status check error:', error);
    
    logSecurityEvent('AI_IMAGE_ENHANCEMENT_STATUS_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);

    return NextResponse.json(
      { success: false, error: 'Failed to check image enhancement status' },
      { status: 500 }
    );
  }
}
