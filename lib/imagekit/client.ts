import { buildTransformationString, Transformation } from '@imagekit/next';

// ImageKit client configuration
export class ImageKitClient {

  constructor() {
    // Validate only public environment variables
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !urlEndpoint) {
      throw new Error(
        'ImageKit public environment variables are missing. Please check your .env file:\n' +
        '- NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY\n' +
        '- NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT'
      );
    }
  }

  /**
   * Generate a transformation URL for an image using official ImageKit utility
   */
  generateImageURL(
    path: string, 
    transformations: Transformation[] = []
  ): string {
    try {
      const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
      
      // Build transformation string manually for server-side usage
      const transformationString = transformations.length > 0 
        ? buildTransformationString(transformations)
        : '';
      
      // Construct URL manually since buildSrc is client-side only
      const baseUrl = urlEndpoint.endsWith('/') ? urlEndpoint : `${urlEndpoint}/`;
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      
      return transformationString 
        ? `${baseUrl}${cleanPath}?tr=${transformationString}`
        : `${baseUrl}${cleanPath}`;
    } catch (error) {
      console.error('Error generating ImageKit URL:', error);
      throw new Error('Failed to generate ImageKit URL');
    }
  }

  /**
   * Generate a transformation URL for a video using official ImageKit utility
   */
  generateVideoURL(
    path: string,
    transformations: Transformation[] = []
  ): string {
    try {
      const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
      // Build transformation string manually for server-side usage
      const transformationString = transformations.length > 0 
        ? buildTransformationString(transformations)
        : '';
      
      // Construct URL manually since buildSrc is client-side only
      const baseUrl = urlEndpoint.endsWith('/') ? urlEndpoint : `${urlEndpoint}/`;
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      
      return transformationString 
        ? `${baseUrl}${cleanPath}?tr=${transformationString}`
        : `${baseUrl}${cleanPath}`;
    } catch (error) {
      console.error('Error generating ImageKit video URL:', error);
      throw new Error('Failed to generate ImageKit video URL');
    }
  }

  /**
   * Upload functionality removed for security
   * Use server-utils.ts for server-side uploads that require private key
   */

  /**
   * Build transformation string using official ImageKit utility
   */
  buildTransformationString(transformations: Transformation[]): string {
    return buildTransformationString(transformations);
  }
}

// Export a singleton instance
export const imagekitClient = new ImageKitClient();

// Re-export official ImageKit types
export type { Transformation } from '@imagekit/next';
