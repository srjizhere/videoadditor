/**
 * Advanced transformation deduplication and conflict resolution
 * Handles all ImageKit parameter types and ensures no duplicates or conflicts
 */

/**
 * Parameter groups that conflict with each other (only one allowed)
 */
const CONFLICT_GROUPS: { [key: string]: string[] } = {
  'format': ['f-'], // Only one format allowed
  'quality': ['q-'], // Only one quality allowed
  'rotation': ['rt-'], // Only one rotation (but cumulative)
  'flip': ['fl-'], // Only one flip direction
  'crop-width': ['w-'], // Only one width
  'crop-height': ['h-'], // Only one height
  'blur': ['bl-'], // Only one blur value
  'brightness': ['e-brightness-'], // Only one brightness
  'contrast': ['e-contrast-'], // Only one contrast
  'saturation': ['e-saturation-'], // Only one saturation
  'sharpen': ['e-sharpen-'], // Only one sharpen
  'background': ['bg-'], // Only one background color
  'bg-removal': ['e-bgremove'], // Background removal effect
  'auto-enhance': ['e-auto-enhance'], // Auto enhancement
  'progressive': ['pr-'], // Progressive loading
  'default-image': ['di-'], // Default image placeholder
};

/**
 * Get the conflict group for a parameter
 */
function getConflictGroup(param: string): string | null {
  const trimmed = param.trim();
  
  for (const [group, prefixes] of Object.entries(CONFLICT_GROUPS)) {
    for (const prefix of prefixes) {
      if (trimmed.startsWith(prefix)) {
        return group;
      }
    }
  }
  
  return null;
}

/**
 * Get parameter prefix for deduplication
 */
function getParameterPrefix(param: string): string {
  const trimmed = param.trim();
  
  // Handle special enhancement parameters
  if (trimmed.startsWith('e-brightness-')) return 'e-brightness-';
  if (trimmed.startsWith('e-contrast-')) return 'e-contrast-';
  if (trimmed.startsWith('e-saturation-')) return 'e-saturation-';
  if (trimmed.startsWith('e-sharpen-')) return 'e-sharpen-';
  if (trimmed.startsWith('e-bgremove')) return 'e-bgremove';
  if (trimmed.startsWith('e-auto-enhance')) return 'e-auto-enhance';
  
  // Standard parameters
  const hyphenIndex = trimmed.indexOf('-');
  if (hyphenIndex > 0) {
    return trimmed.substring(0, hyphenIndex + 1);
  }
  
  return trimmed;
}

/**
 * Check if two parameters are cumulative (rotation) or replacement (everything else)
 */
function isCumulativeParameter(param: string): boolean {
  return param.startsWith('rt-'); // Rotation is cumulative
}

/**
 * Merge cumulative parameters (like rotation)
 */
function mergeCumulativeParams(existingValue: string, newValue: string): string | null {
  if (existingValue.startsWith('rt-') && newValue.startsWith('rt-')) {
    const existing = parseInt(existingValue.substring(3)) || 0;
    const newRot = parseInt(newValue.substring(3)) || 0;
    const total = (existing + newRot) % 360;
    return `rt-${total}`;
  }
  return null; // Not cumulative, should replace
}

/**
 * Advanced deduplication with conflict resolution
 * 
 * Rules:
 * 1. Parameters in the same conflict group replace each other (latest wins)
 * 2. Rotation is cumulative (can add values)
 * 3. Utility params (pr-, di-) are always at the end
 * 4. Parameters are ordered logically
 * 
 * @param existingTransforms - Existing transformation parameters
 * @param newTransforms - New transformation parameters to add
 * @returns Deduplicated and ordered parameter array
 */
export function advancedDeduplicateTransformations(
  existingTransforms: string[],
  newTransforms: string[]
): string[] {
  // Combine all params: existing first, then new (new overrides)
  const allParams = [...existingTransforms, ...newTransforms];
  
  // Maps for different param types
  const conflictGroupMap = new Map<string, string>(); // conflictGroup -> latest param
  const cumulativeMap = new Map<string, string>(); // prefix -> merged value
  const prefixMap = new Map<string, string>(); // prefix -> latest param
  const utilityParams: string[] = [];
  
  // Process all params in order (new ones will override old ones)
  for (const param of allParams) {
    const trimmed = param.trim();
    if (!trimmed) continue;
    
    const prefix = getParameterPrefix(trimmed);
    const conflictGroup = getConflictGroup(trimmed);
    
    // Utility params - collect and dedupe
    if (prefix === 'pr-' || prefix === 'di-') {
      const existingIndex = utilityParams.findIndex(p => getParameterPrefix(p) === prefix);
      if (existingIndex >= 0) {
        utilityParams[existingIndex] = trimmed; // Replace
      } else {
        utilityParams.push(trimmed);
      }
      continue;
    }
    
    // Cumulative params (rotation)
    if (isCumulativeParameter(trimmed)) {
      const existing = cumulativeMap.get(prefix);
      if (existing) {
        const merged = mergeCumulativeParams(existing, trimmed);
        if (merged) {
          cumulativeMap.set(prefix, merged);
        } else {
          cumulativeMap.set(prefix, trimmed); // Can't merge, use new
        }
      } else {
        cumulativeMap.set(prefix, trimmed);
      }
      continue;
    }
    
    // Conflict group params - latest wins
    if (conflictGroup) {
      conflictGroupMap.set(conflictGroup, trimmed);
      continue;
    }
    
    // Regular prefix params - latest wins
    prefixMap.set(prefix, trimmed);
  }
  
  // Build ordered result array
  const result: string[] = [];
  
  // Order: dimensions -> quality/format -> blur -> effects -> background -> transformations -> utility
  const orderedConflictGroups = [
    'crop-width', 'crop-height', // Dimensions first
    'quality', 'format',          // Quality & Format
    'blur',                       // Blur
    'brightness', 'contrast', 'saturation', 'sharpen', // Effects
    'auto-enhance',               // Auto enhance
    'bg-removal', 'background',   // Background
    'rotation', 'flip',           // Transformations
  ];
  
  // Add conflict group params in order
  for (const group of orderedConflictGroups) {
    if (conflictGroupMap.has(group)) {
      result.push(conflictGroupMap.get(group)!);
      conflictGroupMap.delete(group);
    }
  }
  
  // Add any remaining conflict groups (shouldn't happen normally)
  for (const [_, value] of conflictGroupMap) {
    result.push(value);
  }
  
  // Add prefix-based params in specific order
  const orderedPrefixes = [
    'c-', 'cm-', 'cp-', 'fo-', // Crop-related
    'r-', 'bo-', 'dpr-', 'lo-', 'oi-' // Others
  ];
  
  for (const prefix of orderedPrefixes) {
    if (prefixMap.has(prefix)) {
      result.push(prefixMap.get(prefix)!);
      prefixMap.delete(prefix);
    }
  }
  
  // Add remaining prefix params
  for (const [_, value] of prefixMap) {
    result.push(value);
  }
  
  // Add cumulative params (rotation)
  for (const [_, value] of cumulativeMap) {
    result.push(value);
  }
  
  // Add utility params at the very end
  result.push(...utilityParams);
  
  return result;
}

/**
 * Validate transformation parameters for conflicts
 * Returns array of conflict messages if any
 */
export function validateTransformations(transforms: string[]): string[] {
  const conflicts: string[] = [];
  const seenGroups = new Set<string>();
  
  for (const param of transforms) {
    const conflictGroup = getConflictGroup(param);
    if (conflictGroup && seenGroups.has(conflictGroup)) {
      conflicts.push(`Multiple ${conflictGroup} parameters found`);
    }
    if (conflictGroup) {
      seenGroups.add(conflictGroup);
    }
  }
  
  return conflicts;
}

