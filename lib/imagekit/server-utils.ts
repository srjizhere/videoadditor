import { upload, Transformation } from '@imagekit/next';

/**
 * Server-side only ImageKit utilities that require private key
 * These functions should NEVER be used on the client side
 */

// Ensure we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error('Server utilities can only be used on the server side');
}

/**
 * Upload a file to ImageKit (server-side only)
 */
export async function uploadFileToImageKit(
  file: File | Blob | string,
  fileName: string,
  options: any = {}
) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY!;
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
    
    if (!privateKey) {
      throw new Error('IMAGEKIT_PRIVATE_KEY is required for uploads');
    }
    
    return await upload({
      file,
      fileName,
      publicKey,
      privateKey,
      urlEndpoint,
      ...options
    });
  } catch (error) {
    console.error('Error uploading to ImageKit:', error);
    throw new Error('Failed to upload file to ImageKit');
  }
}

/**
 * Generate server-side transformation URL with private key operations
 * This is for advanced server-side operations that might require authentication
 */
export function generateServerImageURL(
  path: string,
  transformations: Transformation[] = []
): string {
  try {
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
    
    // Build transformation string manually for server-side usage
    const transformationString = transformations.length > 0 
      ? transformations.map(t => {
          const parts = [];
          if (t.width) parts.push(`w-${t.width}`);
          if (t.height) parts.push(`h-${t.height}`);
          if (t.quality) parts.push(`q-${t.quality}`);
          if (t.format) parts.push(`f-${t.format}`);
          if (t.blur) parts.push(`bl-${t.blur}`);
          if (t.rotation) parts.push(`rt-${t.rotation}`);
          if (t.flip) parts.push(`fl-${t.flip}`);
          if (t.focus) parts.push(`fo-${t.focus}`);
          if (t.progressive) parts.push('pr-true');
          if (t.lossless) parts.push('lo-true');
          return parts.join(',');
        }).join(',')
      : '';
    
    // Construct URL manually
    const baseUrl = urlEndpoint.endsWith('/') ? urlEndpoint : `${urlEndpoint}/`;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return transformationString 
      ? `${baseUrl}${cleanPath}?tr=${transformationString}`
      : `${baseUrl}${cleanPath}`;
  } catch (error) {
    console.error('Error generating server ImageKit URL:', error);
    throw new Error('Failed to generate server ImageKit URL');
  }
}

/**
 * Delete a file from ImageKit (requires private key)
 */
export async function deleteFileFromImageKit(fileId: string) {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY!;
    
    if (!privateKey) {
      throw new Error('IMAGEKIT_PRIVATE_KEY is required for file deletion');
    }
    
    // This would require the full ImageKit SDK for server-side operations
    // For now, we'll throw an error indicating this needs to be implemented
    throw new Error('File deletion requires full ImageKit SDK implementation');
  } catch (error) {
    console.error('Error deleting from ImageKit:', error);
    throw new Error('Failed to delete file from ImageKit');
  }
}
