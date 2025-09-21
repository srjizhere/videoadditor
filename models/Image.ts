import mongoose, { Document, Schema } from 'mongoose';

export interface IImage extends Document {
  _id: string;
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  uploader: mongoose.Types.ObjectId;
  uploaderName: string;
  uploaderEmail: string;
  mediaType: 'image';
  tags: string[];
  category: 'nature' | 'portrait' | 'landscape' | 'abstract' | 'street' | 'macro' | 'other';
  isPublic: boolean;
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
  views: number;
  downloads: number;
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
  aiCategory?: 'nature' | 'portrait' | 'landscape' | 'abstract' | 'street' | 'macro' | 'food' | 'animal' | 'architecture' | 'other';
  aiCategoryConfidence?: number;
  faceDetection?: {
    faces: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>;
    faceCount: number;
  };
  backgroundRemoved?: boolean;
  backgroundRemovedUrl?: string;
  qualityEnhanced?: boolean;
  qualityEnhancedUrl?: string;
  contentModeration?: {
    isAppropriate: boolean;
    confidence: number;
    categories: Array<{
      name: string;
      confidence: number;
    }>;
    reasons: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IImage>({
  title: {
    type: String,
    required: [true, 'Image title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      validator: function(v: string) {
        // Support both direct image URLs and ImageKit URLs
        return /^https?:\/\/.+(\.(jpg|jpeg|png|webp|gif)|[?&]tr=)/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  },
  thumbnailUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+(\.(jpg|jpeg|png|webp|gif)|[?&]tr=)/i.test(v);
      },
      message: 'Invalid thumbnail URL format'
    }
  },
  uploader: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  uploaderName: {
    type: String,
    required: [true, 'Uploader name is required'],
    trim: true
  },
  uploaderEmail: {
    type: String,
    required: [true, 'Uploader email is required'],
    trim: true,
    lowercase: true
  },
  mediaType: {
    type: String,
    enum: ['image'],
    default: 'image'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  category: {
    type: String,
    enum: ['nature', 'portrait', 'landscape', 'abstract', 'street', 'macro', 'other'],
    default: 'other'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Likes cannot be negative']
  },
  likedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative']
  },
  downloads: {
    type: Number,
    default: 0,
    min: [0, 'Downloads cannot be negative']
  },
  dimensions: {
    width: {
      type: Number,
      required: [true, 'Image width is required'],
      min: [1, 'Width must be at least 1 pixel']
    },
    height: {
      type: Number,
      required: [true, 'Image height is required'],
      min: [1, 'Height must be at least 1 pixel']
    }
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be at least 1 byte']
  },
  format: {
    type: String,
    enum: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    required: [true, 'Image format is required']
  },
  // AI-generated data
  aiTags: [{
    tag: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, required: true },
    category: { type: String, required: true }
  }],
  aiCategory: {
    type: String,
    enum: ['nature', 'portrait', 'landscape', 'abstract', 'street', 'macro', 'food', 'animal', 'architecture', 'other'],
    default: null
  },
  aiCategoryConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  faceDetection: {
    faces: [{
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      confidence: { type: Number, min: 0, max: 1, required: true }
    }],
    faceCount: { type: Number, default: 0 }
  },
  backgroundRemoved: {
    type: Boolean,
    default: false
  },
  backgroundRemovedUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+(\.(jpg|jpeg|png|webp|gif)|[?&]tr=)/i.test(v);
      },
      message: 'Invalid background removed URL format'
    }
  },
  qualityEnhanced: {
    type: Boolean,
    default: false
  },
  qualityEnhancedUrl: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+(\.(jpg|jpeg|png|webp|gif)|[?&]tr=)/i.test(v);
      },
      message: 'Invalid quality enhanced URL format'
    }
  },
  contentModeration: {
    isAppropriate: { type: Boolean, default: true },
    confidence: { type: Number, min: 0, max: 1, default: 1 },
    categories: [{
      name: { type: String, required: true },
      confidence: { type: Number, min: 0, max: 1, required: true }
    }],
    reasons: [{ type: String }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
imageSchema.index({ uploader: 1, createdAt: -1 });
imageSchema.index({ category: 1, createdAt: -1 });
imageSchema.index({ tags: 1 });
imageSchema.index({ likes: -1, createdAt: -1 });
imageSchema.index({ views: -1, createdAt: -1 });
imageSchema.index({ isPublic: 1, createdAt: -1 });

// Virtual for aspect ratio
imageSchema.virtual('aspectRatio').get(function() {
  return this.dimensions.width / this.dimensions.height;
});

// Virtual for file size in MB
imageSchema.virtual('fileSizeMB').get(function() {
  return (this.fileSize / (1024 * 1024)).toFixed(2);
});

// Pre-save middleware to generate thumbnail if not provided
imageSchema.pre('save', function(next) {
  if (!this.thumbnailUrl && this.imageUrl) {
    // Generate thumbnail URL using ImageKit transformations
    const baseUrl = this.imageUrl.split('?')[0];
    this.thumbnailUrl = `${baseUrl}?tr=w-300,h-300,c-at_max`;
  }
  next();
});

export default mongoose.models.Image || mongoose.model<IImage>('Image', imageSchema);
