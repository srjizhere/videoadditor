import { IImage } from '../models/Image';
import { IVideo } from '../models/Video';

// Base media interface
export interface BaseMedia {
  _id: string;
  title: string;
  description?: string;
  uploader: string;
  uploaderName: string;
  uploaderEmail: string;
  tags: string[];
  isPublic: boolean;
  likes: number;
  likedBy: string[];
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

// Media type enum
export enum MediaType {
  VIDEO = 'video',
  IMAGE = 'image'
}

// Union type for all media
export type Media = IImage | IVideo;

// Media category types
export type VideoCategory = 'gaming' | 'tech' | 'music' | 'sports' | 'education' | 'entertainment' | 'lifestyle' | 'other';
export type ImageCategory = 'nature' | 'portrait' | 'landscape' | 'abstract' | 'street' | 'macro' | 'other';

// Upload form data
export interface MediaUploadData {
  title: string;
  description?: string;
  tags: string[];
  category: string;
  isPublic: boolean;
}

// Image specific upload data
export interface ImageUploadData extends MediaUploadData {
  imageUrl: string;
  thumbnailUrl?: string;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
  format: 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';
  // AI-generated data
  aiTags?: Array<{
    tag: string;
    confidence: number;
    category: string;
  }>;
  aiCategory?: string;
  aiCategoryConfidence?: number;
  backgroundRemoved?: boolean;
  backgroundRemovedUrl?: string;
  qualityEnhanced?: boolean;
  qualityEnhancedUrl?: string;
}

// Video specific upload data
export interface VideoUploadData extends MediaUploadData {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize: number;
  resolution: {
    width: number;
    height: number;
  };
}

// API response types
export interface MediaListResponse {
  success: boolean;
  data: Media[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MediaResponse {
  success: boolean;
  data: Media;
}

export interface MediaErrorResponse {
  success: false;
  error: string;
  details?: any;
}

// Component props
export interface MediaComponentProps {
  media: Media;
  onLike?: (mediaId: string) => void;
  onShare?: (mediaId: string) => void;
  onView?: (mediaId: string) => void;
  showActions?: boolean;
  className?: string;
}

export interface MediaFeedProps {
  mediaType: MediaType;
  limit?: number;
  category?: string;
  showPagination?: boolean;
  className?: string;
}

export interface MediaUploadFormProps {
  mediaType: MediaType;
  onSuccess?: (media: Media) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Filter and sort options
export interface MediaFilters {
  category?: string;
  tags?: string[];
  uploader?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  minLikes?: number;
  minViews?: number;
}

export interface MediaSortOptions {
  field: 'createdAt' | 'likes' | 'views' | 'title';
  order: 'asc' | 'desc';
}

// Tab navigation
export interface TabItem {
  id: MediaType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

// ImageKit transformation options
export interface ImageTransformation {
  width?: number;
  height?: number;
  crop?: 'at_max' | 'at_least' | 'maintain_ratio' | 'force' | 'crop' | 'scale';
  quality?: number;
  format?: 'auto' | 'jpg' | 'png' | 'webp';
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export interface VideoTransformation {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'mp4' | 'webm';
  startTime?: number;
  endTime?: number;
  thumbnail?: {
    time: number;
    width?: number;
    height?: number;
  };
  crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max';
  focus?: 'auto' | 'face' | 'faces' | 'center' | 'top' | 'left' | 'bottom' | 'right';
  rotation?: number;
  flip?: 'horizontal' | 'vertical';
  speed?: number;
}

// Utility types
export type MediaWithType<T extends MediaType> = T extends MediaType.VIDEO ? IVideo : IImage;

export type MediaCategory<T extends MediaType> = T extends MediaType.VIDEO ? VideoCategory : ImageCategory;

// Hook return types
export interface UseMediaReturn {
  media: Media[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  filters: MediaFilters;
  setFilters: (filters: MediaFilters) => void;
  sort: MediaSortOptions;
  setSort: (sort: MediaSortOptions) => void;
}

export interface UseMediaDetailReturn {
  media: Media | null;
  loading: boolean;
  error: string | null;
  relatedMedia: Media[];
  like: () => Promise<void>;
  share: () => Promise<void>;
  view: () => Promise<void>;
}
