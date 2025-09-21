// AI-Powered Image Tagging and Categorization
import { AIServiceError, AIRateLimiter, AITag } from '../ai-services';

// Google Cloud Vision API
// import { ImageAnnotatorClient } from '@google-cloud/vision';

export interface ImageTaggingResult {
  tags: AITag[];
  category: string;
  categoryConfidence: number;
  success: boolean;
  processingTime: number;
  error?: string;
}

export interface ImageTaggingOptions {
  maxTags?: number;
  minConfidence?: number;
  includeCategories?: string[];
  excludeCategories?: string[];
}

/**
 * Generate AI tags and category for an image using ImageKit's AI tagging
 */
export async function generateImageTags(
  imageUrl: string,
  options: ImageTaggingOptions = {}
): Promise<ImageTaggingResult> {
  const startTime = Date.now();
  
  try {
    // Check rate limit
    const canProceed = await AIRateLimiter.checkLimit('image-tagging', 100, 60000);
    if (!canProceed) {
      throw new AIServiceError(
        'Rate limit exceeded for image tagging service',
        'image-tagging',
        429
      );
    }

    // Validate image URL
    if (!imageUrl || !imageUrl.startsWith('http')) {
      throw new AIServiceError(
        'Invalid image URL provided',
        'image-tagging',
        400
      );
    }

    // Use Google Cloud Vision API for real AI tagging
    const realTags = await generateGoogleCloudTags(imageUrl, options);
    
    const processingTime = Date.now() - startTime;

    return {
      tags: realTags.tags,
      category: realTags.category,
      categoryConfidence: realTags.categoryConfidence,
      success: true,
      processingTime,
    };

  } catch (error) {
    // const _processingTime = Date.now() - startTime;
    
    if (error instanceof AIServiceError) {
      throw error;
    }

    throw new AIServiceError(
      `Image tagging failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'image-tagging',
      500,
      error
    );
  }
}

/**
 * Google Cloud Vision API implementation
 */
async function generateGoogleCloudTags(
  _imageUrl: string,
  _options: ImageTaggingOptions
): Promise<{ tags: AITag[]; category: string; categoryConfidence: number }> {
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    throw new AIServiceError(
      'Google Cloud Vision API not configured. Please set GOOGLE_CLOUD_PROJECT_ID environment variable.',
      'image-tagging',
      500
    );
  }

  try {
    // Note: Uncomment and install @google-cloud/vision when ready to use
    /*
    const { ImageAnnotatorClient } = await import('@google-cloud/vision');
    
    const client = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      },
    });

    const [result] = await client.labelDetection(imageUrl);
    const labels = result.labelAnnotations || [];
    
    const tags: AITag[] = labels
      .filter(label => (label.score || 0) >= (options.minConfidence || 0.5))
      .slice(0, options.maxTags || 10)
      .map(label => ({
        tag: label.description?.toLowerCase() || '',
        confidence: label.score || 0,
        category: categorizeLabelDescription(label.description || '')
      }));

    const category = detectPrimaryCategory(tags);
    const categoryConfidence = calculateCategoryConfidence(tags, category);

    return { tags, category, categoryConfidence };
    */

    throw new AIServiceError(
      'Google Cloud Vision API not implemented. Please uncomment the implementation and install @google-cloud/vision.',
      'image-tagging',
      501
    );
    
  } catch (error) {
    if (error instanceof AIServiceError) {
      throw error;
    }
    
    throw new AIServiceError(
      `Google Cloud Vision API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'image-tagging',
      500,
      error
    );
  }
}


/**
 * Batch process multiple images for tagging
 */
export async function batchGenerateImageTags(
  imageUrls: string[],
  options: ImageTaggingOptions = {}
): Promise<ImageTaggingResult[]> {
  const results: ImageTaggingResult[] = [];
  
  // Process images in batches of 3 to avoid overwhelming the service
  const batchSize = 3;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => 
      generateImageTags(url, options).catch(error => ({
        tags: [],
        category: 'other',
        categoryConfidence: 0,
        success: false,
        processingTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * Get suggested tags based on existing tags using AI
 */
export async function getSuggestedTags(
  existingTags: string[],
  imageUrl?: string
): Promise<string[]> {
  if (existingTags.length === 0) {
    return [];
  }

  try {
    // Use AI to generate contextual suggestions
    if (imageUrl) {
      const taggingResult = await generateGoogleCloudTags(imageUrl, { maxTags: 15 });
      const aiTags = taggingResult.tags.map(tag => tag.tag);
      
      // Return AI tags that aren't already in existing tags
      return aiTags.filter(suggestion => 
        !existingTags.some(existing => 
          existing.toLowerCase() === suggestion.toLowerCase()
        )
      ).slice(0, 10);
    }

    // Fallback: semantic suggestions based on existing tags
    return generateSemanticSuggestions(existingTags);
    
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    return generateSemanticSuggestions(existingTags);
  }
}

/**
 * Generate semantic suggestions based on existing tags
 */
function generateSemanticSuggestions(existingTags: string[]): string[] {
  // Basic semantic mapping for fallback
  const semanticMap: { [key: string]: string[] } = {
    'nature': ['landscape', 'outdoor', 'environment', 'natural'],
    'landscape': ['nature', 'scenic', 'vista', 'horizon'],
    'portrait': ['person', 'human', 'individual', 'headshot'],
    'person': ['human', 'individual', 'people', 'portrait'],
    'food': ['cuisine', 'dish', 'meal', 'culinary'],
    'animal': ['wildlife', 'creature', 'fauna', 'pet'],
    'building': ['architecture', 'structure', 'construction', 'edifice'],
    'city': ['urban', 'metropolitan', 'downtown', 'skyline']
  };

  const suggestions: string[] = [];
  
  for (const tag of existingTags) {
    const related = semanticMap[tag.toLowerCase()];
    if (related) {
      suggestions.push(...related);
    }
  }

  // Remove duplicates and existing tags
  return [...new Set(suggestions)].filter(suggestion => 
    !existingTags.some(existing => 
      existing.toLowerCase() === suggestion.toLowerCase()
    )
  ).slice(0, 10);
}

/**
 * Validate and clean tags
 */
export function cleanTags(tags: string[]): string[] {
  return tags
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length <= 30)
    .filter((tag, index, array) => array.indexOf(tag) === index) // Remove duplicates
    .slice(0, 20); // Limit to 20 tags
}

/**
 * Helper functions for real AI implementation
 * These functions are currently unused but kept for future implementation
 */

// Categorize Google Cloud Vision labels into our categories
// function _categorizeLabelDescription(description: string): string {
//   const desc = description.toLowerCase();
  
//   if (['person', 'face', 'smile', 'human', 'portrait'].some(term => desc.includes(term))) {
//     return 'people';
//   }
//   if (['building', 'architecture', 'city', 'urban', 'house'].some(term => desc.includes(term))) {
//     return 'architecture';
//   }
//   if (['animal', 'dog', 'cat', 'bird', 'pet', 'wildlife'].some(term => desc.includes(term))) {
//     return 'animal';
//   }
//   if (['food', 'meal', 'dish', 'restaurant', 'cooking'].some(term => desc.includes(term))) {
//     return 'food';
//   }
//   if (['landscape', 'mountain', 'tree', 'sky', 'outdoor', 'nature'].some(term => desc.includes(term))) {
//     return 'nature';
//   }
  
//   return 'other';
// }

// Detect primary category from tags
// function _detectPrimaryCategory(tags: AITag[]): string {
//   const categoryCount: { [key: string]: number } = {};
  
//   tags.forEach(tag => {
//     categoryCount[tag.category] = (categoryCount[tag.category] || 0) + tag.confidence;
//   });
  
//   return Object.keys(categoryCount).reduce((a, b) => 
//     categoryCount[a] > categoryCount[b] ? a : b, 'other'
//   );
// }

// Calculate category confidence
// function _calculateCategoryConfidence(tags: AITag[], category: string): number {
//   const categoryTags = tags.filter(tag => tag.category === category);
//   if (categoryTags.length === 0) return 0;
  
//   const avgConfidence = categoryTags.reduce((sum, tag) => sum + tag.confidence, 0) / categoryTags.length;
//   return Math.min(avgConfidence * 1.1, 1); // Slight boost, cap at 1
// }
