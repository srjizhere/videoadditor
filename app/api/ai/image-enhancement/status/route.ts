import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { extractMetadataFromHeaders, isImageKitProcessing, isValidProcessedImage } from '@/lib/metadata-utils';

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

    // Check if the enhanced image is available by making a HEAD request
    try {
      const response = await fetch(enhancedUrl, { method: 'HEAD' });
      
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
      } else {
        // Other error
        return NextResponse.json({
          success: false,
          status: 'error',
          isReady: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (fetchError) {
      // Network error or timeout
      return NextResponse.json({
        success: true,
        status: 'processing',
        isReady: false,
        enhancedUrl,
        message: 'Image enhancement is still processing. Please wait...',
        estimatedTime: '3-5 minutes total'
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
