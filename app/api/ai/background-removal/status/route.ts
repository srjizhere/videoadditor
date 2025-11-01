import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logSecurityEvent } from '@/lib/security';
import { extractMetadataFromHeaders, getProcessingStatus, isImageKitProcessing, isValidProcessedImage } from '@/lib/metadata-utils';

/**
 * Check the status of background removal processing
 * This endpoint helps handle the async nature of ImageKit background removal
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
    const processedUrl = searchParams.get('processedUrl');

    if (!processedUrl) {
      return NextResponse.json(
        { success: false, error: 'processedUrl parameter is required' },
        { status: 400 }
      );
    }

    // Check if the processed image is available by making a HEAD request
    try {
      const response = await fetch(processedUrl, { method: 'HEAD' });
      
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
          processedUrl,
          message: 'Background removal is still processing. Please wait...',
          estimatedTime: '3-5 minutes total',
          processingInfo: {
            stage: 'ImageKit AI processing',
            contentType: contentType,
            contentLength: fileSizeBytes,
            note: 'ImageKit is preparing the transformed image'
          }
        });
      } else if (isValidImage) {
        // Image is ready - extract proper metadata
        const metadata = extractMetadataFromHeaders(response.headers);
        
        console.log('Background removal completed successfully!');
        console.log('Processed URL:', processedUrl);
        console.log('Content Type:', contentType);
        console.log('File Size:', fileSizeBytes);
        console.log('Metadata:', metadata);
        
        return NextResponse.json({
          success: true,
          status: 'completed',
          isReady: true,
          processedUrl,
          message: 'Background removal completed successfully!',
          metadata,
          processingInfo: {
            estimatedTime: 'Instant (ImageKit processing)',
            processingMethod: 'ImageKit AI Background Removal',
            outputFormat: metadata.isPng ? 'PNG with transparency' : 'JPEG',
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
          processedUrl,
          message: 'Background removal is still processing. Please wait...',
          estimatedTime: '3-5 minutes total'
        });
      } else if (response.ok) {
        // Response is OK but not a valid image - likely still processing
        return NextResponse.json({
          success: true,
          status: 'processing',
          isReady: false,
          processedUrl,
          message: 'Background removal is still processing. Please wait...',
          estimatedTime: '3-5 minutes total',
          processingInfo: {
            stage: 'ImageKit processing',
            contentType: contentType,
            contentLength: fileSizeBytes,
            note: 'ImageKit is preparing the transformed image'
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
        processedUrl,
        message: 'Background removal is still processing. Please wait...',
        estimatedTime: '3-5 minutes total'
      });
    }

  } catch (error) {
    console.error('Background removal status check error:', error);
    
    logSecurityEvent('AI_BACKGROUND_REMOVAL_STATUS_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, request);

    return NextResponse.json(
      { success: false, error: 'Failed to check background removal status' },
      { status: 500 }
    );
  }
}
