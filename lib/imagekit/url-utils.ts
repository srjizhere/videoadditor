/**
 * Client-side ImageKit URL utilities
 * Handles both PATH FORMAT (recommended) and QUERY FORMAT (legacy)
 * Always outputs PATH FORMAT for consistency with server-side code
 */

/**
 * Extract transformation parameters from ImageKit URL
 * Supports both formats:
 * - PATH FORMAT: https://ik.imagekit.io/id/tr:param1,param2/image.jpg
 * - QUERY FORMAT: https://ik.imagekit.io/id/image.jpg?tr=param1,param2
 * 
 * @param url - ImageKit URL (can be either format)
 * @returns Array of transformation parameters (e.g., ['w-300', 'h-200', 'rt-90'])
 */
export function extractTransformations(url: string): string[] {
  if (!url || typeof url !== 'string') {
    return [];
  }

  try {
    const urlObj = new URL(url);
    
    // 1. Check QUERY FORMAT first (backwards compatibility)
    const queryTr = urlObj.searchParams.get('tr');
    if (queryTr) {
      return queryTr.split(',').filter(Boolean).map(t => t.trim());
    }
    
    // 2. Check PATH FORMAT (current standard)
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(part => part.length > 0);
    
    // Find transformation segments (parts starting with 'tr:')
    for (const part of parts) {
      if (part.startsWith('tr:')) {
        // Extract transformation string: 'tr:param1,param2' -> 'param1,param2'
        const transformString = part.substring(3); // Remove 'tr:' prefix
        
        // Handle chained transformations (separated by colons)
        // Example: 'tr:param1,param2:param3,param4' -> ['param1,param2', 'param3,param4']
        const chains = transformString.split(':');
        
        // Flatten all parameters from all chains
        const allParams: string[] = [];
        for (const chain of chains) {
          const params = chain.split(',').filter(Boolean).map(p => p.trim());
          allParams.push(...params);
        }
        
        return allParams;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting transformations:', error);
    return [];
  }
}

/**
 * Extract the original image path from ImageKit URL
 * Removes all transformation segments to get the base image path
 * 
 * Examples:
 * - https://ik.imagekit.io/id/tr:w-300/image.jpg -> id/image.jpg
 * - https://ik.imagekit.io/id/image.jpg?tr=w-300 -> id/image.jpg
 * 
 * @param url - ImageKit URL (can be either format)
 * @returns Original image path (e.g., 'id/image.jpg' or 'id/folder/image.jpg')
 */
export function extractOriginalPath(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove query parameters (they don't affect the path)
    const parts = pathname.split('/').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return '';
    }
    
    // ✅ CRITICAL: Remove the ImageKit ID (first part) - matches server-side logic
    // This prevents duplicate ImageKit ID in the path
    const imageKitId = parts[0];
    const pathAfterId = parts.slice(1);
    
    // Filter out transformation segments (parts starting with 'tr:')
    const pathWithoutTransforms = pathAfterId.filter(part => !part.startsWith('tr:'));
    
    // ✅ CRITICAL FIX: If the path starts with the ImageKit ID again, remove it
    // This happens when ImageKit stores files as: id/image.jpg instead of image.jpg
    // Since baseUrl already includes the ID, we shouldn't include it again
    if (pathWithoutTransforms.length > 0 && pathWithoutTransforms[0] === imageKitId) {
      pathWithoutTransforms.shift(); // Remove duplicate ImageKit ID
    }
    
    return pathWithoutTransforms.join('/');
  } catch (error) {
    console.error('Error extracting original path:', error);
    return '';
  }
}

/**
 * Extract base URL (protocol + host + ImageKit ID)
 * 
 * Example:
 * - https://ik.imagekit.io/id/tr:w-300/image.jpg -> https://ik.imagekit.io/id
 * 
 * @param url - Full ImageKit URL
 * @returns Base URL with ImageKit ID
 */
export function extractBaseUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(part => part.length > 0);
    
    // Get ImageKit ID (first part of pathname)
    const imagekitId = parts.length > 0 ? parts[0] : '';
    
    return `${urlObj.protocol}//${urlObj.host}/${imagekitId}`;
  } catch (error) {
    console.error('Error extracting base URL:', error);
    return '';
  }
}

/**
 * Build ImageKit URL in PATH FORMAT (consistent with server-side)
 * 
 * Format: https://ik.imagekit.io/id/tr:param1,param2,param3/path/to/image.jpg
 * 
 * @param baseUrl - Base URL with ImageKit ID (e.g., 'https://ik.imagekit.io/id')
 * @param path - Image path (e.g., 'image.jpg' or 'folder/image.jpg')
 * @param transforms - Array of transformation parameters (e.g., ['w-300', 'h-200', 'rt-90'])
 * @returns Complete ImageKit URL in PATH FORMAT
 */
export function buildTransformationUrl(
  baseUrl: string,
  path: string,
  transforms: string[]
): string {
  if (!baseUrl || !path) {
    console.warn('buildTransformationUrl: Missing baseUrl or path');
    return '';
  }

  try {
    // Clean the path (remove leading slash if present)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // Filter out empty transforms
    const validTransforms = transforms.filter(t => t && t.trim().length > 0);
    
    // Build URL
    if (validTransforms.length === 0) {
      // No transformations - return simple URL
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBaseUrl}/${cleanPath}`;
    }
    
    // Build PATH FORMAT: tr:param1,param2,param3/path
    const transformString = validTransforms.join(',');
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    return `${cleanBaseUrl}/tr:${transformString}/${cleanPath}`;
  } catch (error) {
    console.error('Error building transformation URL:', error);
    return '';
  }
}

/**
 * Filter transformation parameters to remove specific types
 * Useful for replacing old transformations with new ones
 * 
 * @param transforms - Array of transformation parameters
 * @param prefixesToRemove - Array of prefixes to filter out (e.g., ['rt-', 'pr-', 'di-'])
 * @returns Filtered array of transformation parameters
 */
export function filterTransformations(
  transforms: string[],
  prefixesToRemove: string[]
): string[] {
  return transforms.filter(transform => {
    const trimmed = transform.trim();
    return !prefixesToRemove.some(prefix => trimmed.startsWith(prefix));
  });
}

/**
 * Get the parameter prefix from a transformation parameter
 * Examples: 'q-90' -> 'q-', 'e-brightness-50' -> 'e-brightness-', 'w-800' -> 'w-'
 * 
 * @param param - Transformation parameter (e.g., 'q-90', 'w-800', 'e-brightness-50')
 * @returns Parameter prefix (e.g., 'q-', 'w-', 'e-brightness-')
 */
function getParameterPrefix(param: string): string {
  const trimmed = param.trim();
  
  // Handle special cases with hyphens in the middle
  // e-brightness-50 -> e-brightness-
  // e-contrast-30 -> e-contrast-
  // e-saturation-40 -> e-saturation-
  // e-sharpen-20 -> e-sharpen-
  // bg-transparent -> bg-
  if (trimmed.startsWith('e-')) {
    // Extract up to second hyphen for enhancement params
    const parts = trimmed.split('-');
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('-') + '-'; // e-brightness-, e-contrast-, etc.
    }
    return 'e-';
  }
  
  // Handle bg- prefix
  if (trimmed.startsWith('bg-')) {
    return 'bg-';
  }
  
  // For standard params like q-90, w-800, h-600, rt-90, fl-h, etc.
  const hyphenIndex = trimmed.indexOf('-');
  if (hyphenIndex > 0) {
    return trimmed.substring(0, hyphenIndex + 1); // Include the hyphen
  }
  
  return trimmed; // Fallback: return as-is if no hyphen found
}

/**
 * Deduplicate transformation parameters by keeping only the latest occurrence of each parameter type
 * This prevents duplicate parameters (e.g., multiple q-*, f-*, w-*, h-*, etc.)
 * 
 * Order is preserved: first occurrence of each parameter type is kept, later duplicates are removed
 * Then new parameters are appended at the end
 * 
 * Uses advanced deduplication for better conflict resolution
 * 
 * @param existingTransforms - Array of existing transformation parameters
 * @param newTransforms - Array of new transformation parameters to add
 * @returns Deduplicated array with no parameter type conflicts
 */
export function deduplicateTransformations(
  existingTransforms: string[],
  newTransforms: string[]
): string[] {
  // ✅ Use advanced deduplication for better conflict resolution
  try {
    const { advancedDeduplicateTransformations } = require('./transformation-deduplication');
    return advancedDeduplicateTransformations(existingTransforms || [], newTransforms || []);
  } catch (error) {
    // Fallback to legacy deduplication if advanced version fails
    console.warn('Advanced deduplication not available, using legacy:', error);
    return _legacyDeduplicateTransformations(existingTransforms || [], newTransforms || []);
  }
}

/**
 * Legacy deduplication function (kept for backwards compatibility)
 * @deprecated Use the new advanced deduplication via deduplicateTransformations
 */
function _legacyDeduplicateTransformations(
  existingTransforms: string[],
  newTransforms: string[]
): string[] {
  // Create a map to track parameter types and their values
  // Key: parameter prefix (e.g., 'q-', 'f-', 'w-')
  // Value: the parameter string (e.g., 'q-90', 'f-auto')
  const paramMap = new Map<string, string>();
  const utilityParams: string[] = []; // pr-*, di-* should be at the end
  
  // Process existing transforms: keep first occurrence of each type
  for (const param of existingTransforms) {
    const trimmed = param.trim();
    if (!trimmed) continue;
    
    const prefix = getParameterPrefix(trimmed);
    
    // Utility params should be collected separately and added at the end
    if (prefix === 'pr-' || prefix === 'di-') {
      if (!utilityParams.includes(trimmed)) {
        utilityParams.push(trimmed);
      }
      continue;
    }
    
    // For other params, keep first occurrence only
    if (!paramMap.has(prefix)) {
      paramMap.set(prefix, trimmed);
    }
  }
  
  // Process new transforms: these override existing ones of the same type
  for (const param of newTransforms) {
    const trimmed = param.trim();
    if (!trimmed) continue;
    
    const prefix = getParameterPrefix(trimmed);
    
    // Utility params
    if (prefix === 'pr-' || prefix === 'di-') {
      // Replace existing utility param of same type
      const existingIndex = utilityParams.findIndex(p => getParameterPrefix(p) === prefix);
      if (existingIndex >= 0) {
        utilityParams[existingIndex] = trimmed;
      } else {
        utilityParams.push(trimmed);
      }
      continue;
    }
    
    // Override existing param of same type
    paramMap.set(prefix, trimmed);
  }
  
  // Build final array: main params first, then utility params
  const result: string[] = [];
  
  // Add main parameters (order matters - preserve ImageKit parameter order)
  // Order: dimensions -> quality/format -> effects -> transformations
  const orderedPrefixes = [
    // Dimensions
    'w-', 'h-', 'c-', 'cm-', 'cp-', 'fo-',
    // Quality & Format
    'q-', 'f-',
    // Blur
    'bl-',
    // Effects (enhancements)
    'e-brightness-', 'e-contrast-', 'e-saturation-', 'e-sharpen-', 'e-',
    // Background
    'bg-',
    // Transformations
    'rt-', 'fl-',
    // Others
    'r-', 'bo-', 'dpr-', 'lo-', 'oi-'
  ];
  
  // Add ordered params first
  for (const orderedPrefix of orderedPrefixes) {
    if (paramMap.has(orderedPrefix)) {
      result.push(paramMap.get(orderedPrefix)!);
      paramMap.delete(orderedPrefix);
    }
  }
  
  // Add any remaining params (unknown prefixes)
  for (const [_, value] of paramMap) {
    result.push(value);
  }
  
  // Add utility params at the end
  result.push(...utilityParams);
  
  return result;
}

