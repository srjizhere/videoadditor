// Simple ImageKit utility functions

export interface VideoTransformation {
  width?: number;
  height?: number;
  quality?: number;
}

export interface ImageTransformation {
  width?: number;
  height?: number;
  quality?: number;
}

export function buildVideoTransformationUrl(
  baseUrl: string,
  transformations: VideoTransformation
): string {
  const params = new URLSearchParams();
  
  if (transformations.width) params.append('w', transformations.width.toString());
  if (transformations.height) params.append('h', transformations.height.toString());
  if (transformations.quality) params.append('q', transformations.quality.toString());
  
  return `${baseUrl}?${params.toString()}`;
}

export function buildImageTransformationUrl(
  baseUrl: string,
  transformations: ImageTransformation
): string {
  const params = new URLSearchParams();
  
  if (transformations.width) params.append('w', transformations.width.toString());
  if (transformations.height) params.append('h', transformations.height.toString());
  if (transformations.quality) params.append('q', transformations.quality.toString());
  
  return `${baseUrl}?${params.toString()}`;
}