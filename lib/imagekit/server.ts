/**
 * Server-side ImageKit utilities using official URL format
 * This follows ImageKit's official URL transformation documentation
 */

// Ensure we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error('Server utilities can only be used on the server side');
}

// Get ImageKit configuration
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY!;

if (!urlEndpoint || !publicKey || !privateKey) {
  throw new Error('ImageKit environment variables are missing');
}

/**
 * Extract original image path from ImageKit URL (with or without transformations)
 * This is crucial for chained transformations to work correctly.
 * 
 * Examples:
 * - Original: https://ik.imagekit.io/demo/sample-image.jpg → sample-image.jpg
 * - Transformed: https://ik.imagekit.io/demo/tr:w-400,h-300/sample-image.jpg → sample-image.jpg
 * - Multi-step: https://ik.imagekit.io/demo/tr:w-400:rt-90/folder/sample-image.jpg → folder/sample-image.jpg
 * 
 * @param imageUrl - Full ImageKit URL or path
 * @returns The original image path without transformations
 */
export function extractOriginalPath(imageUrl: string): string {
  try {
    // Handle full URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      const urlObj = new URL(imageUrl);
      const pathname = urlObj.pathname;
      
      // Extract the ImageKit ID and path parts
      const parts = pathname.split('/').filter(part => part.length > 0);
      
      // Remove the ImageKit ID (first part)
      if (parts.length > 0) {
        parts.shift();
      }
      
      // Find and remove transformation steps (parts starting with 'tr:')
      const pathWithoutTransforms = parts.filter(part => !part.startsWith('tr:'));
      
      // Join remaining parts to get the original path
      return pathWithoutTransforms.join('/');
    }
    
    // Handle relative paths
    const parts = imageUrl.split('/').filter(part => part.length > 0);
    const pathWithoutTransforms = parts.filter(part => !part.startsWith('tr:'));
    return pathWithoutTransforms.join('/');
  } catch (error) {
    console.error('Error extracting original path:', error);
    // Fallback: return the input as-is
    return imageUrl;
  }
}

/**
 * Extract existing transformation steps from ImageKit URL
 * This allows us to preserve and chain transformations according to ImageKit documentation.
 * 
 * ImageKit Chained Transformation Format:
 * https://ik.imagekit.io/demo/tr:step1_params:step2_params:step3_params/image.jpg
 * 
 * Each step is separated by a colon (:), and parameters within a step are separated by commas (,)
 * 
 * Examples:
 * - https://ik.imagekit.io/demo/tr:w-400,h-300/image.jpg → ["w-400,h-300"]
 * - https://ik.imagekit.io/demo/tr:w-400,h-300:rt-90/image.jpg → ["w-400,h-300", "rt-90"]
 * - https://ik.imagekit.io/demo/tr:e-bgremove:q-90,f-auto/image.jpg → ["e-bgremove", "q-90,f-auto"]
 * 
 * @param imageUrl - Full ImageKit URL or path
 * @returns Array of transformation step strings (empty if no transformations)
 */
export function extractExistingTransformations(imageUrl: string): string[] {
  try {
    // Handle null/undefined/empty input
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length === 0) {
      console.warn('extractExistingTransformations: Invalid or empty imageUrl provided');
      return [];
    }
    
    let pathname: string;
    
    // Handle full URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(imageUrl);
        pathname = urlObj.pathname;
      } catch (urlError) {
        console.error('extractExistingTransformations: Invalid URL format', urlError);
        return [];
      }
    } else {
      pathname = imageUrl;
    }
    
    // Extract the transformation part
    const parts = pathname.split('/').filter(part => part && part.length > 0);
    
    // Find parts that start with 'tr:'
    const transformParts = parts.filter(part => part.startsWith('tr:'));
    
    if (transformParts.length === 0) {
      return []; // No transformations
    }
    
    // Extract transformation steps from all tr: parts
    const allSteps: string[] = [];
    
    for (const transformPart of transformParts) {
      // Remove 'tr:' prefix
      const transformContent = transformPart.substring(3);
      
      // Skip if empty after removing prefix
      if (!transformContent || transformContent.trim().length === 0) {
        continue;
      }
      
      // Split by colon to get individual transformation steps
      const steps = transformContent.split(':').filter(step => step && step.length > 0);
      
      allSteps.push(...steps);
    }
    
    return allSteps;
  } catch (error) {
    console.error('Error extracting transformations:', error);
    return [];
  }
}

/**
 * Build a chained transformation URL according to ImageKit documentation
 * 
 * Format: https://ik.imagekit.io/<id>/tr:step1:step2:step3/<path>
 * 
 * @param path - Original image path (without transformations)
 * @param transformationSteps - Array of transformation step strings
 * @returns Complete ImageKit URL with chained transformations
 */
export function buildChainedTransformationURL(
  path: string,
  transformationSteps: string[]
): string {
  try {
    // Validate inputs
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      throw new Error('buildChainedTransformationURL: Invalid or empty path provided');
    }
    
    if (!Array.isArray(transformationSteps)) {
      throw new Error('buildChainedTransformationURL: transformationSteps must be an array');
    }
    
    // Filter out empty or invalid steps
    const validSteps = transformationSteps.filter(step => 
      step && typeof step === 'string' && step.trim().length > 0
    );
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const baseUrl = urlEndpoint.endsWith('/') ? urlEndpoint : `${urlEndpoint}/`;
    
    if (validSteps.length === 0) {
      // No transformations, return original URL
      return `${baseUrl}${cleanPath}`;
    }
    
    // Join transformation steps with colons as per ImageKit documentation
    const transformationString = validSteps.join(':');
    
    return `${baseUrl}tr:${transformationString}/${cleanPath}`;
  } catch (error) {
    console.error('Error building chained transformation URL:', error);
    throw new Error(`Failed to build chained transformation URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a transformation step string for manual enhancements
 * 
 * @param options - Enhancement options
 * @returns Transformation step string (e.g., "q-90,f-auto,e-brightness-10")
 */
export function createEnhancementStep(options: {
  blur?: number;
  quality?: number;
  format?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpen?: number;
}): string {
  // Validate input
  if (!options || typeof options !== 'object') {
    console.warn('createEnhancementStep: Invalid options provided, returning empty string');
    return '';
  }
  
  const params: string[] = [];
  
  // Add parameters only if they are valid numbers or strings
  if (typeof options.quality === 'number' && options.quality > 0 && options.quality <= 100) {
    params.push(`q-${Math.round(options.quality)}`);
  }
  if (typeof options.format === 'string' && options.format.trim().length > 0) {
    params.push(`f-${options.format.trim()}`);
  }
  if (typeof options.blur === 'number' && options.blur >= 0) {
    params.push(`bl-${Math.round(options.blur)}`);
  }
  if (typeof options.brightness === 'number' && options.brightness >= -100 && options.brightness <= 100) {
    params.push(`e-brightness-${Math.round(options.brightness)}`);
  }
  if (typeof options.contrast === 'number' && options.contrast >= -100 && options.contrast <= 100) {
    params.push(`e-contrast-${Math.round(options.contrast)}`);
  }
  if (typeof options.saturation === 'number' && options.saturation >= -100 && options.saturation <= 100) {
    params.push(`e-saturation-${Math.round(options.saturation)}`);
  }
  if (typeof options.sharpen === 'number' && options.sharpen >= 0 && options.sharpen <= 100) {
    params.push(`e-sharpen-${Math.round(options.sharpen)}`);
  }
  
  return params.join(',');
}

/**
 * Create a transformation step string for background removal
 * 
 * @param options - Background removal options
 * @returns Transformation step string (e.g., "w-800,h-800,q-90,f-png,e-bgremove,bg-transparent,pr-true")
 */
export function createBackgroundRemovalStep(options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  backgroundColor?: string;
}): string {
  const params: string[] = [];
  
  if (options.width) params.push(`w-${options.width}`);
  if (options.height) params.push(`h-${options.height}`);
  if (options.quality) params.push(`q-${options.quality}`);
  if (options.format) params.push(`f-${options.format}`);
  
  // Background removal specific parameters
  params.push('e-bgremove');
  params.push(`bg-${options.backgroundColor || 'transparent'}`);
  params.push('pr-true'); // Progressive loading
  
  return params.join(',');
}

/**
 * Detect the type of transformation from a transformation step string
 * 
 * Types:
 * - 'background-removal': Contains e-bgremove
 * - 'enhancement': Contains e-brightness, e-contrast, e-saturation, e-sharpen, or e-auto-enhance
 * - 'resize': Contains w-, h-, or ar-
 * - 'rotation': Contains rt-
 * - 'quality': Contains q- or f-
 * - 'other': Any other transformation
 * 
 * @param step - Transformation step string
 * @returns Transformation type
 */
export function detectTransformationType(step: string): string {
  if (step.includes('e-bgremove')) return 'background-removal';
  if (step.includes('e-brightness') || step.includes('e-contrast') || 
      step.includes('e-saturation') || step.includes('e-sharpen') ||
      step.includes('e-auto-enhance')) return 'enhancement';
  if (step.includes('w-') || step.includes('h-') || step.includes('ar-')) return 'resize';
  if (step.includes('rt-')) return 'rotation';
  if (step.includes('q-') || step.includes('f-')) return 'quality';
  if (step.includes('bl-')) return 'blur';
  
  return 'other';
}

/**
 * Merge transformation steps, replacing duplicates of the same type
 * 
 * Rules:
 * - Same transformation type: Replace the old one with the new one
 * - Different transformation types: Keep both (chain them)
 * 
 * Examples:
 * - Old: ["e-brightness-10"], New: "e-brightness-20" → ["e-brightness-20"]
 * - Old: ["e-bgremove"], New: "e-brightness-10" → ["e-bgremove", "e-brightness-10"]
 * - Old: ["e-brightness-10", "e-bgremove"], New: "e-brightness-20" → ["e-brightness-20", "e-bgremove"]
 * 
 * @param existingSteps - Array of existing transformation steps
 * @param newStep - New transformation step to add
 * @returns Merged array of transformation steps
 */
export function mergeTransformationSteps(
  existingSteps: string[],
  newStep: string
): string[] {
  try {
    // Validate inputs
    if (!Array.isArray(existingSteps)) {
      console.warn('mergeTransformationSteps: existingSteps is not an array, using empty array');
      existingSteps = [];
    }
    
    if (!newStep || typeof newStep !== 'string' || newStep.trim().length === 0) {
      console.warn('mergeTransformationSteps: Invalid or empty newStep, returning existing steps');
      return existingSteps;
    }
    
    const newType = detectTransformationType(newStep);
    
    // Filter out existing steps of the same type (they will be replaced)
    const filteredSteps = existingSteps.filter(step => {
      if (!step || typeof step !== 'string') {
        return false; // Remove invalid steps
      }
      const stepType = detectTransformationType(step);
      return stepType !== newType;
    });
    
    // Add the new step at the end
    return [...filteredSteps, newStep];
  } catch (error) {
    console.error('Error in mergeTransformationSteps:', error);
    // On error, return newStep only (safe fallback)
    return [newStep];
  }
}

/**
 * Merge transformation parameters at the individual parameter level
 * This prevents sequential chaining (with :) and processes all transformations in parallel
 * 
 * This is the preferred method for merging transformations as it's faster and avoids timeouts.
 * 
 * @param existingSteps - Array of existing transformation step strings
 * @param newStep - New transformation step string to merge
 * @returns Single merged transformation string (all parameters in one step)
 */
export function mergeTransformationParameters(
  existingSteps: string[],
  newStep: string
): string {
  try {
    // Parse all existing steps into individual parameters
    const allParams = new Map<string, string>();
    
    // Process existing steps
    if (Array.isArray(existingSteps)) {
      for (const step of existingSteps) {
        if (!step || typeof step !== 'string') continue;
        
        // Handle chained transformations (separated by colons)
        const chains = step.split(':');
        
        for (const chain of chains) {
          // Split chain into parameters
          const params = chain.split(',').filter(Boolean).map(p => p.trim());
          
          for (const param of params) {
            // Extract parameter key (e.g., 'q-' from 'q-90', 'e-brightness-' from 'e-brightness-10')
            const dashIndex = param.indexOf('-');
            if (dashIndex > 0) {
              // ✅ FIX: For simple params (q-90, f-auto, w-800), use just the prefix (q-, f-, w-)
              // For enhancement params (e-brightness-50, e-contrast-30), use e-brightness-, e-contrast-
              let key: string;
              
              // Check if it's an enhancement param (starts with e-)
              if (param.startsWith('e-')) {
                // Enhancement params: e-brightness-50 -> e-brightness-, e-contrast-30 -> e-contrast-
                const parts = param.split('-');
                if (parts.length >= 3) {
                  key = parts.slice(0, 3).join('-') + '-'; // e-brightness-
                } else {
                  key = param.substring(0, dashIndex + 1); // e-
                }
              } else {
                // Simple params: q-90 -> q-, f-auto -> f-, w-800 -> w-
                key = param.substring(0, dashIndex + 1);
              }
              
              allParams.set(key, param); // Replace if exists (newer takes precedence)
            }
          }
        }
      }
    }
    
    // Process new step
    if (newStep && typeof newStep === 'string' && newStep.trim()) {
      // Handle chained transformations in new step too
      const chains = newStep.split(':');
      
      for (const chain of chains) {
        const params = chain.split(',').filter(Boolean).map(p => p.trim());
        
        for (const param of params) {
          const dashIndex = param.indexOf('-');
          if (dashIndex > 0) {
            // ✅ FIX: Same logic as above for consistency
            let key: string;
            
            if (param.startsWith('e-')) {
              const parts = param.split('-');
              if (parts.length >= 3) {
                key = parts.slice(0, 3).join('-') + '-'; // e-brightness-
              } else {
                key = param.substring(0, dashIndex + 1); // e-
              }
            } else {
              key = param.substring(0, dashIndex + 1); // q-, f-, w-, etc.
            }
            
            allParams.set(key, param); // Replace existing with new
          }
        }
      }
    }
    
    // Combine all parameters into single string, ordered logically:
    // 1. Dimensions (w, h)
    // 2. Quality and format (q, f)
    // 3. Effects (e-*, bg-*)
    // 4. Other enhancements (bl, rt, fl, etc.)
    // 5. Utility params (pr, di, etc.)
    const orderedParams: string[] = [];
    const paramOrder = ['w-', 'h-', 'q-', 'f-', 'bl-', 'e-', 'bg-', 'rt-', 'fl-', 'c-', 'cm-', 'fo-', 'pr-', 'di-'];
    
    // First, add ordered params
    for (const prefix of paramOrder) {
      for (const [key, value] of allParams.entries()) {
        if (key.startsWith(prefix) && !orderedParams.includes(value)) {
          orderedParams.push(value);
        }
      }
    }
    
    // Then add any remaining params
    for (const [key, value] of allParams.entries()) {
      if (!orderedParams.includes(value)) {
        orderedParams.push(value);
      }
    }
    
    return orderedParams.join(',');
  } catch (error) {
    console.error('Error in mergeTransformationParameters:', error);
    return newStep || '';
  }
}

/**
 * Smart transformation chaining with override logic
 * 
 * This function combines existing transformations with a new transformation,
 * intelligently replacing duplicates of the same type.
 * 
 * @param imageUrl - Current image URL (may contain existing transformations)
 * @param newStep - New transformation step to add
 * @returns Complete chained transformation URL
 */
export function applyTransformationWithMerge(
  imageUrl: string,
  newStep: string
): string {
  // Extract original path and existing transformations
  const originalPath = extractOriginalPath(imageUrl);
  const existingTransformations = extractExistingTransformations(imageUrl);
  
  // Merge transformations (replaces duplicates)
  const mergedTransformations = mergeTransformationSteps(existingTransformations, newStep);
  
  // Build chained URL
  return buildChainedTransformationURL(originalPath, mergedTransformations);
}

/**
 * Generate transformation URL using official ImageKit URL format
 */
export function generateTransformationURL(
  path: string,
  transformations: any = {},
  chainIndex: number = 0
): string {
  try {
    // Clean the path
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Build transformation parameters
    const params = [];
    
    // Basic transformations
    if (transformations.width) params.push(`w-${transformations.width}`);
    if (transformations.height) params.push(`h-${transformations.height}`);
    if (transformations.quality) params.push(`q-${transformations.quality}`);
    if (transformations.format) params.push(`f-${transformations.format}`);
    if (transformations.blur) params.push(`bl-${transformations.blur}`);
    if (transformations.rotation) params.push(`rt-${transformations.rotation}`);
    if (transformations.flip) params.push(`fl-${transformations.flip}`);
    if (transformations.focus) params.push(`fo-${transformations.focus}`);
    if (transformations.effect) params.push(`e-${transformations.effect}`);
    if (transformations.bg) params.push(`bg-${transformations.bg}`);
    if (transformations.progressive) params.push('pr-true');
    if (transformations.lossless) params.push('lo-true');
    
    // Crop mode and positioning
    if (transformations.cropMode) params.push(`cm-${transformations.cropMode}`);
    if (transformations.cropPosition) params.push(`cp-${transformations.cropPosition}`);
    if (transformations.smartCrop) params.push(`c-${transformations.smartCrop}`);
    
    // Enhancement parameters (using correct ImageKit parameter names)
    if (transformations.brightness) params.push(`e-brightness-${transformations.brightness}`);
    if (transformations.contrast) params.push(`e-contrast-${transformations.contrast}`);
    if (transformations.saturation) params.push(`e-saturation-${transformations.saturation}`);
    if (transformations.sharpen) params.push(`e-sharpen-${transformations.sharpen}`);
    if (transformations.gamma) params.push(`g-${transformations.gamma}`);
    if (transformations.vibrance) params.push(`v-${transformations.vibrance}`);
    
    // Border and radius
    if (transformations.border) params.push(`bo-${transformations.border}`);
    if (transformations.borderRadius) params.push(`r-${transformations.borderRadius}`);
    
    // Default image for 404 errors
    if (transformations.defaultImage) params.push(`di-${transformations.defaultImage}`);
    
    // Client hints support
    if (transformations.dpr === 'auto') params.push('dpr-auto');
    if (transformations.width === 'auto') params.push('w-auto');
    
    // Construct URL according to ImageKit documentation
    const baseUrl = urlEndpoint.endsWith('/') ? urlEndpoint : `${urlEndpoint}/`;
    const transformationString = params.join(',');
    
    return transformationString 
      ? `${baseUrl}tr:${transformationString}/${cleanPath}`
      : `${baseUrl}${cleanPath}`;
  } catch (error) {
    console.error('Error generating transformation URL:', error);
    throw new Error('Failed to generate transformation URL');
  }
}

/**
 * Generate authentication parameters for client-side uploads
 * This requires the ImageKit Node.js SDK for proper signature generation
 */
export function getAuthenticationParameters(): {
  token: string;
  expire: number;
  signature: string;
} {
  try {
    // For now, return a placeholder - this would need the ImageKit SDK
    // In a real implementation, you'd use the ImageKit SDK here
    throw new Error('Authentication parameters require ImageKit Node.js SDK - not implemented yet');
  } catch (error) {
    console.error('Error generating authentication parameters:', error);
    throw new Error('Failed to generate authentication parameters');
  }
}

/**
 * Upload file - requires ImageKit Node.js SDK
 */
export async function uploadFile(
  file: Buffer | string,
  fileName: string,
  options: any = {}
) {
  throw new Error('Upload functionality requires ImageKit Node.js SDK - not implemented yet');
}

/**
 * Delete file - requires ImageKit Node.js SDK
 */
export async function deleteFile(fileId: string) {
  throw new Error('Delete functionality requires ImageKit Node.js SDK - not implemented yet');
}

/**
 * List files - requires ImageKit Node.js SDK
 */
export async function listFiles(options: any = {}) {
  throw new Error('List files functionality requires ImageKit Node.js SDK - not implemented yet');
}

/**
 * Get file details - requires ImageKit Node.js SDK
 */
export async function getFileDetails(fileId: string) {
  throw new Error('Get file details functionality requires ImageKit Node.js SDK - not implemented yet');
}

/**
 * Generate background removal URL using official ImageKit transformation format
 * Using e-bgremove (10 units) instead of e-removedotbg (130 units) for cost efficiency
 */
export function generateBackgroundRemovalURL(path: string, quality: number = 90): string {
  return generateTransformationURL(path, {
    effect: 'bgremove',  // Use ImageKit's cheaper background removal (10 units vs 130)
    quality: quality,
    format: 'png',
    bg: 'transparent',  // Set transparent background
    // Optimize for faster processing - smaller images process faster
    width: 800,   // Further reduce size for faster processing
    height: 800,  // Further reduce size for faster processing
    // Add progressive loading for better UX
    progressive: true
  });
}

/**
 * Generate auto-enhancement URL using official ImageKit transformation format
 * Uses ImageKit's AI auto-enhancement for optimal results
 */
export function generateAutoEnhancementURL(path: string, quality: number = 90): string {
  return generateTransformationURL(path, {
    effect: 'auto-enhance',  // ImageKit's AI auto-enhancement
    quality: quality,
    format: 'auto',  // Let ImageKit choose the best format
    progressive: true  // Enable progressive loading
  });
}

/**
 * Generate manual transformation URL using official ImageKit transformation format
 * Supports various enhancement options like brightness, contrast, saturation, etc.
 */
export function generateManualTransformationURL(
  path: string,
  options: {
    blur?: number;
    quality?: number;
    format?: string;
    width?: number;
    height?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    sharpen?: number;
    autoEnhance?: boolean;
  } = {}
): string {
  const transformations: any = {};
  
  // Basic transformations
  if (options.blur) transformations.blur = options.blur;
  if (options.quality) transformations.quality = options.quality;
  if (options.format) transformations.format = options.format;
  if (options.width) transformations.width = options.width;
  if (options.height) transformations.height = options.height;
  
  // Enhancement transformations
  if (options.brightness) transformations.brightness = options.brightness;
  if (options.contrast) transformations.contrast = options.contrast;
  if (options.saturation) transformations.saturation = options.saturation;
  if (options.sharpen) transformations.sharpen = options.sharpen;
  
  // AI enhancement
  if (options.autoEnhance) transformations.effect = 'auto-enhance';
  
  return generateTransformationURL(path, transformations);
}

/**
 * Generate chained transformation URL using official ImageKit format
 * Supports multiple transformation steps separated by colons
 */
export function generateChainedTransformationURL(
  path: string,
  transformationSteps: any[]
): string {
  try {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const baseUrl = urlEndpoint.endsWith('/') ? urlEndpoint : `${urlEndpoint}/`;
    
    // Generate transformation string for each step
    const stepStrings = transformationSteps.map(step => {
      const params = [];
      
      // Basic transformations
      if (step.width) params.push(`w-${step.width}`);
      if (step.height) params.push(`h-${step.height}`);
      if (step.quality) params.push(`q-${step.quality}`);
      if (step.format) params.push(`f-${step.format}`);
      if (step.blur) params.push(`bl-${step.blur}`);
      if (step.rotation) params.push(`rt-${step.rotation}`);
      if (step.flip) params.push(`fl-${step.flip}`);
      if (step.focus) params.push(`fo-${step.focus}`);
      if (step.effect) params.push(`e-${step.effect}`);
      if (step.bg) params.push(`bg-${step.bg}`);
      if (step.progressive) params.push('pr-true');
      if (step.lossless) params.push('lo-true');
      
      // Crop mode and positioning
      if (step.cropMode) params.push(`cm-${step.cropMode}`);
      if (step.cropPosition) params.push(`cp-${step.cropPosition}`);
      if (step.smartCrop) params.push(`c-${step.smartCrop}`);
      
      // Enhancement parameters (using correct ImageKit parameter names)
      if (step.brightness) params.push(`e-brightness-${step.brightness}`);
      if (step.contrast) params.push(`e-contrast-${step.contrast}`);
      if (step.saturation) params.push(`e-saturation-${step.saturation}`);
      if (step.sharpen) params.push(`e-sharpen-${step.sharpen}`);
      if (step.gamma) params.push(`g-${step.gamma}`);
      if (step.vibrance) params.push(`v-${step.vibrance}`);
      
      // Border and radius
      if (step.border) params.push(`bo-${step.border}`);
      if (step.borderRadius) params.push(`r-${step.borderRadius}`);
      
      // Default image for 404 errors
      if (step.defaultImage) params.push(`di-${step.defaultImage}`);
      
      // Client hints support
      if (step.dpr === 'auto') params.push('dpr-auto');
      if (step.width === 'auto') params.push('w-auto');
      
      return params.join(',');
    });
    
    const transformationString = stepStrings.join(':');
    
    return transformationString 
      ? `${baseUrl}tr:${transformationString}/${cleanPath}`
      : `${baseUrl}${cleanPath}`;
  } catch (error) {
    console.error('Error generating chained transformation URL:', error);
    throw new Error('Failed to generate chained transformation URL');
  }
}

/**
 * Generate responsive image URL with client hints support
 * Supports automatic DPR and width detection
 */
export function generateResponsiveImageURL(
  path: string,
  baseWidth: number,
  options: {
    quality?: number;
    format?: string;
    progressive?: boolean;
  } = {}
): string {
  return generateTransformationURL(path, {
    width: 'auto',
    dpr: 'auto',
    quality: options.quality || 85,
    format: options.format || 'auto',
    progressive: options.progressive !== false
  });
}

/**
 * Generate avatar image URL with smart cropping
 * Uses face detection for optimal cropping
 */
export function generateAvatarURL(
  path: string,
  size: number,
  options: {
    quality?: number;
    format?: string;
    borderRadius?: number;
  } = {}
): string {
  return generateTransformationURL(path, {
    width: size,
    height: size,
    cropMode: 'maintain_ratio',
    focus: 'face',
    quality: options.quality || 90,
    format: options.format || 'auto',
    borderRadius: options.borderRadius || size / 2
  });
}

/**
 * Generate thumbnail URL with smart cropping
 * Optimized for thumbnail generation
 */
export function generateThumbnailURL(
  path: string,
  width: number,
  height: number,
  options: {
    quality?: number;
    format?: string;
    smartCrop?: boolean;
  } = {}
): string {
  return generateTransformationURL(path, {
    width,
    height,
    cropMode: options.smartCrop ? 'maintain_ratio' : 'force',
    focus: options.smartCrop ? 'auto' : 'center',
    quality: options.quality || 80,
    format: options.format || 'auto'
  });
}

/**
 * Generate optimized web image URL
 * Optimized for web delivery with progressive loading
 */
export function generateWebOptimizedURL(
  path: string,
  maxWidth: number,
  options: {
    quality?: number;
    format?: string;
    progressive?: boolean;
  } = {}
): string {
  return generateTransformationURL(path, {
    width: maxWidth,
    quality: options.quality || 85,
    format: options.format || 'auto',
    progressive: options.progressive !== false,
    lossless: false
  });
}
