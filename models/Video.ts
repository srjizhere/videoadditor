import mongoose, { Schema, model, models } from "mongoose";

export const VIDEO_DIMENSIONS = {
  width: 1080,
  height: 1920,
} as const;

export interface IVideo {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string; // Optional - auto-generated if not provided
  uploader: mongoose.Types.ObjectId;
  uploaderName?: string;
  uploaderEmail?: string;
  mediaType: 'video';
  controls?: boolean;
  transformation?: {
    height: number;
    width: number;
    quality?: number;
  };
  views?: number;
  likes?: number;
  likedBy?: mongoose.Types.ObjectId[];
  isPublic?: boolean;
  tags?: string[];
  duration?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
const videoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { 
      type: String, 
      required: false // Auto-generated if not provided
    },
    uploader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String },
    uploaderEmail: { type: String },
    mediaType: { type: String, enum: ['video'], default: 'video' },
    controls: { type: Boolean, default: true },
    transformation: {
      height: { type: Number, default: VIDEO_DIMENSIONS.height },
      width: { type: Number, default: VIDEO_DIMENSIONS.width },
      quality: { type: Number, min: 1, max: 100 },
    },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPublic: { type: Boolean, default: true },
    tags: [{ type: String }],
    duration: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate thumbnail if not provided
videoSchema.pre('save', async function(next) {
  if (!this.thumbnailUrl && this.videoUrl) {
    // Dynamic import to avoid circular dependency
    const { generateVideoThumbnailUrl } = await import('@/lib/imagekit/video-thumbnail');
    // Generate thumbnail URL using ImageKit transformations
    this.thumbnailUrl = generateVideoThumbnailUrl(this.videoUrl, 1280, 720);
  }
  next();
});

const Video = models?.Video || model<IVideo>("Video", videoSchema);

export default Video;
