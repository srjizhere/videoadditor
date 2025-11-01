/**
 * Examples of how to properly read and use HTTP metadata
 */

import { readImageMetadata, ImageMetadata } from './metadata-utils';

// Example 1: Basic metadata reading
export async function basicMetadataExample(imageUrl: string) {
  const result = await readImageMetadata(imageUrl);
  
  if (result.success && result.metadata) {
    const metadata = result.metadata;
    
    console.log('📊 Image Metadata:');
    console.log(`  File Size: ${metadata.fileSizeFormatted} (${metadata.fileSizeBytes} bytes)`);
    console.log(`  Content Type: ${metadata.contentType}`);
    console.log(`  Format: ${metadata.isPng ? 'PNG' : metadata.isJpeg ? 'JPEG' : 'Other'}`);
    console.log(`  Has Transparency: ${metadata.hasTransparency ? 'Yes' : 'No'}`);
    console.log(`  Dimensions: ${metadata.dimensions?.width}x${metadata.dimensions?.height}`);
    
    return metadata;
  } else {
    console.error('❌ Failed to read metadata:', result.error);
    return null;
  }
}

// Example 2: Advanced metadata processing
export async function advancedMetadataExample(imageUrl: string) {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Read all available headers
    const headers = response.headers;
    const metadata: Record<string, string> = {};
    
    // Extract all headers
    headers.forEach((value, key) => {
      metadata[key] = value;
    });
    
    console.log('🔍 All Headers:');
    Object.entries(metadata).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Specific metadata extraction
    const imageMetadata = {
      // Basic info
      contentType: headers.get('content-type'),
      contentLength: headers.get('content-length'),
      lastModified: headers.get('last-modified'),
      
      // Caching info
      etag: headers.get('etag'),
      cacheControl: headers.get('cache-control'),
      expires: headers.get('expires'),
      
      // Security headers
      contentSecurityPolicy: headers.get('content-security-policy'),
      xFrameOptions: headers.get('x-frame-options'),
      
      // ImageKit specific
      imagekitId: headers.get('x-imagekit-id'),
      imagekitSignature: headers.get('x-imagekit-signature'),
      imagekitTimestamp: headers.get('x-imagekit-timestamp'),
      
      // CDN headers
      cdnCache: headers.get('x-cache'),
      cdnServer: headers.get('x-served-by'),
      
      // Processing info
      processingTime: headers.get('x-processing-time'),
      server: headers.get('server'),
      poweredBy: headers.get('x-powered-by')
    };
    
    return imageMetadata;
    
  } catch (error) {
    console.error('❌ Error reading metadata:', error);
    return null;
  }
}

// Example 3: Metadata validation
export function validateImageMetadata(metadata: ImageMetadata): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check file size
  if (metadata.fileSizeBytes === 0) {
    issues.push('File size is 0 bytes - image may be corrupted');
  } else if (metadata.fileSizeBytes > 10 * 1024 * 1024) { // 10MB
    issues.push('File size is very large (>10MB) - consider compression');
    recommendations.push('Use image compression to reduce file size');
  }
  
  // Check content type
  if (!metadata.isImage) {
    issues.push('File is not a valid image format');
  }
  
  // Check transparency support
  if (metadata.isPng && !metadata.hasTransparency) {
    recommendations.push('PNG file may not have transparency - consider using WebP for better compression');
  }
  
  // Check dimensions
  if (metadata.dimensions) {
    const { width, height } = metadata.dimensions;
    if (width > 4000 || height > 4000) {
      recommendations.push('Image is very large - consider resizing for web use');
    }
    if (width < 100 || height < 100) {
      issues.push('Image is very small - may not be suitable for display');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

// Example 4: Performance monitoring
export async function monitorImagePerformance(imageUrl: string) {
  const startTime = performance.now();
  
  try {
    // Make HEAD request to get metadata
    const response = await fetch(imageUrl, { method: 'HEAD' });
    const headTime = performance.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get metadata
    const metadata = await readImageMetadata(imageUrl);
    const totalTime = performance.now() - startTime;
    
    console.log('⚡ Performance Metrics:');
    console.log(`  HEAD Request Time: ${headTime.toFixed(2)}ms`);
    console.log(`  Total Metadata Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  File Size: ${metadata.metadata?.fileSizeFormatted || 'Unknown'}`);
    console.log(`  Content Type: ${metadata.metadata?.contentType || 'Unknown'}`);
    
    return {
      headRequestTime: headTime,
      totalTime,
      metadata: metadata.metadata,
      performance: {
        isFast: headTime < 100, // Less than 100ms is fast
        isEfficient: totalTime < 500, // Less than 500ms is efficient
        fileSizeOptimal: (metadata.metadata?.fileSizeBytes || 0) < 2 * 1024 * 1024 // Less than 2MB
      }
    };
    
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error);
    return null;
  }
}

// Example 5: Batch metadata processing
export async function batchMetadataProcessing(imageUrls: string[]) {
  const results = await Promise.allSettled(
    imageUrls.map(async (url) => {
      const metadata = await readImageMetadata(url);
      return { url, metadata };
    })
  );
  
  const successful = results
    .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
    .map(result => result.value);
    
  const failed = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => result.reason);
  
  console.log(`✅ Successfully processed ${successful.length} images`);
  console.log(`❌ Failed to process ${failed.length} images`);
  
  // Calculate totals
  const totalSize = successful.reduce((sum, { metadata }) => 
    sum + (metadata.metadata?.fileSizeBytes || 0), 0
  );
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  console.log(`📊 Total Size: ${formatFileSize(totalSize)}`);
  
  return {
    successful,
    failed,
    totalSize,
    averageSize: totalSize / successful.length
  };
}
