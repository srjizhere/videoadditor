"use client";

import React, { useState, useEffect } from "react";
import { Upload, Video, Image as ImageIcon, X, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FileUpload from "./FileUpload";
import { useNotification } from "../layout/Notification";
import DaisyUIProgress, { UploadProgress } from "../ui/DaisyUIProgress";
import { VideoPreview } from "../ui/MediaPreview";
import { generateVideoThumbnailUrl, checkThumbnailAvailability } from "@/lib/imagekit/video-thumbnail";

interface VideoData {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string; // Optional - auto-generated if not provided
}

type ThumbnailType = 'auto' | 'manual';

export default function VideoUploadForm() {
  const router = useRouter();
  const [videoData, setVideoData] = useState<VideoData>({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: undefined,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<unknown>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [thumbnailType, setThumbnailType] = useState<ThumbnailType>('auto');
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState<string | undefined>(undefined);
  const [manualThumbnailUrl, setManualThumbnailUrl] = useState<string | undefined>(undefined);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const { showNotification } = useNotification();

  // Check thumbnail availability when auto thumbnail URL is set
  useEffect(() => {
    if (autoThumbnailUrl && thumbnailType === 'auto') {
      setThumbnailLoading(true);
      
      // Check if thumbnail is available (with retries)
      // ImageKit needs time to process videos after upload (typically 10-30 seconds)
      const checkThumbnail = async () => {
        let attempts = 0;
        const maxAttempts = 8; // Up to ~24 seconds total (8 attempts * 3 seconds)
        const delay = 3000; // 3 seconds between attempts
        
        const check = async () => {
          try {
            const isAvailable = await checkThumbnailAvailability(autoThumbnailUrl);
            if (isAvailable) {
              // Thumbnail is available - the image onLoad will handle hiding the loader
              setThumbnailLoading(false);
              return;
            }
          } catch (error) {
            console.warn('Error checking thumbnail availability:', error);
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(check, delay);
          } else {
            // After max attempts, stop showing loading spinner
            // The image component will still try to load, and onError/onLoad will handle it
            setThumbnailLoading(false);
            console.warn('Thumbnail not available after multiple attempts. ImageKit may still be processing the video.');
            console.warn('The thumbnail will appear automatically once ImageKit finishes processing (usually 10-30 seconds).');
          }
        };
        
        // Initial check after 3 seconds (give ImageKit time to start processing)
        setTimeout(check, 3000);
      };
      
      checkThumbnail();
    } else {
      setThumbnailLoading(false);
    }
  }, [autoThumbnailUrl, thumbnailType]);

  const handleVideoUpload = (response: unknown) => {
    const res = response as { url: string };
    const videoUrl = res.url;
    
    // Auto-generate thumbnail URL
    // Use ImageKit transformation with format output (f-jpg) to convert video frame to image
    const generatedAutoThumbnail = generateVideoThumbnailUrl(videoUrl, 1280, 720);
    
    console.log('Video uploaded:', videoUrl);
    console.log('Auto-generated thumbnail URL:', generatedAutoThumbnail);
    console.log('Note: ImageKit may need a few seconds to process the video before thumbnail is available');
    
    // Store auto-generated thumbnail URL
    setAutoThumbnailUrl(generatedAutoThumbnail);
    
    // Set thumbnail type to auto if no manual thumbnail exists
    const finalThumbnailType = manualThumbnailUrl ? thumbnailType : 'auto';
    setThumbnailType(finalThumbnailType);
    
    setVideoData(prev => {
      // Use current thumbnail type to determine which thumbnail to use
      const finalThumbnailUrl = finalThumbnailType === 'manual' && manualThumbnailUrl 
        ? manualThumbnailUrl 
        : generatedAutoThumbnail;
      
      console.log('Setting thumbnail URL:', finalThumbnailUrl, 'Type:', finalThumbnailType);
      return {
      ...prev,
        videoUrl: videoUrl,
        thumbnailUrl: finalThumbnailUrl,
      };
    });
    setUploadedFile(response);
    setShowPreview(true);
    showNotification("Video uploaded successfully!", "success");
  };

  const handleThumbnailUpload = (response: unknown) => {
    const res = response as { url: string };
    const manualUrl = res.url;
    
    // Store manual thumbnail and switch to manual type
    setManualThumbnailUrl(manualUrl);
    setThumbnailType('manual');
    
    setVideoData(prev => ({
      ...prev,
      thumbnailUrl: manualUrl,
    }));
    showNotification("Custom thumbnail uploaded successfully!", "success");
  };

  const handleUseAutoThumbnail = () => {
    if (!autoThumbnailUrl) return;
    
    setThumbnailType('auto');
    setVideoData(prev => ({
      ...prev,
      thumbnailUrl: autoThumbnailUrl,
    }));
    showNotification("Switched to auto-generated thumbnail", "info");
  };

  const handleRemoveManualThumbnail = () => {
    setManualThumbnailUrl(undefined);
    setThumbnailType('auto');
    
    // Switch back to auto-generated thumbnail
    if (autoThumbnailUrl) {
      setVideoData(prev => ({
        ...prev,
        thumbnailUrl: autoThumbnailUrl,
      }));
      showNotification("Removed custom thumbnail, using auto-generated", "info");
    } else {
    setVideoData(prev => ({
      ...prev,
        thumbnailUrl: undefined,
    }));
    }
  };

  const handleResetUpload = () => {
    setVideoData({
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: undefined,
    });
    setUploadedFile(null);
    setShowPreview(false);
    setUploadProgress(0);
    setThumbnailType('auto');
    setAutoThumbnailUrl(undefined);
    setManualThumbnailUrl(undefined);
    setThumbnailLoading(false);
    setThumbnailError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoData.title || !videoData.description || !videoData.videoUrl) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    setIsUploading(true);
    
    try {
      // Determine final thumbnail URL based on current type
      let finalThumbnailUrl: string;
      if (thumbnailType === 'manual' && manualThumbnailUrl) {
        finalThumbnailUrl = manualThumbnailUrl;
      } else if (autoThumbnailUrl) {
        finalThumbnailUrl = autoThumbnailUrl;
      } else {
        // Fallback: generate if somehow missing
        finalThumbnailUrl = generateVideoThumbnailUrl(videoData.videoUrl, 1280, 720);
      }
      
      // Map privacy setting to isPublic
      const isPublic = privacy === 'public';
      
      const response = await fetch("/api/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: videoData.title,
          description: videoData.description,
          videoUrl: videoData.videoUrl,
          thumbnailUrl: finalThumbnailUrl,
          category: "other",
          tags: [],
          isPublic: isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save video");
      }
      
      showNotification("Video saved successfully!", "success");
      
      // Reset form
      setVideoData({
        title: "",
        description: "",
        videoUrl: "",
        thumbnailUrl: undefined,
      });
      setThumbnailType('auto');
      setAutoThumbnailUrl(undefined);
      setManualThumbnailUrl(undefined);
      setThumbnailLoading(false);
      setThumbnailError(false);
      setUploadedFile(null);
      setUploadProgress(0);
      setShowPreview(false);
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error: unknown) {
      console.error("Video save error:", error);
      showNotification(error instanceof Error ? error.message : "Failed to save video. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card bg-base-100 shadow-2xl">
        {/* Header */}
        <div className="card-body bg-gradient-to-br from-primary via-primary to-secondary text-primary-content p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-primary-content/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                <Video className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h1 className="card-title text-4xl font-bold mb-2">Upload New Video</h1>
                <p className="text-primary-content/90 text-lg">Share your creativity with the world</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-primary-content/80">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-content/60 rounded-full"></div>
                <span>High Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-content/60 rounded-full"></div>
                <span>Fast Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-content/60 rounded-full"></div>
                <span>Secure Upload</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="card-body p-8">
          {showPreview && videoData.videoUrl ? (
            <div className="space-y-6">
              {/* Video Preview */}
              <VideoPreview
                url={videoData.videoUrl}
                thumbnailUrl={videoData.thumbnailUrl}
                title={videoData.title}
                description={videoData.description}
                onEdit={handleResetUpload}
                onDelete={handleResetUpload}
                className="mb-6"
              />
              
              {/* Continue with form */}
              <div className="divider">
                <span className="px-4 py-2 bg-base-200 rounded-full text-sm font-medium">Complete Video Details</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Video Information */}
                <div className="card bg-base-100 border-2 border-base-300 shadow-sm">
                  <div className="card-body p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Video Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-control">
                        <div className="mb-2">
                          <label className="block">
                            <span className="label-text font-semibold text-base block mb-1">Title <span className="text-error text-sm">*</span></span>
                          </label>
                        </div>
                        <input
                          type="text"
                          placeholder="Enter an engaging video title"
                          className="input input-bordered w-full focus:input-primary transition-colors"
                          value={videoData.title}
                          onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                          required
                        />
                        <div className="mt-1">
                          <span className="text-xs text-base-content/60">Make it catchy and descriptive</span>
                        </div>
                      </div>

                      <div className="form-control">
                        <div className="mb-2">
                          <label className="block">
                            <span className="label-text font-semibold text-base block mb-1">Category</span>
                          </label>
                        </div>
                        <select className="select select-bordered w-full focus:select-primary transition-colors" defaultValue="">
                          <option disabled value="">Choose a category</option>
                          <option>Entertainment</option>
                          <option>Education</option>
                          <option>Technology</option>
                          <option>Gaming</option>
                          <option>Music</option>
                          <option>Sports</option>
                          <option>News</option>
                          <option>Other</option>
                        </select>
                        <div className="mt-1">
                          <span className="text-xs text-base-content/60">Help viewers find your content</span>
                        </div>
                      </div>
                    </div>

                    <div className="form-control mt-6">
                      <div className="mb-2">
                        <label className="block">
                          <span className="label-text font-semibold text-base block mb-1">Description <span className="text-error text-sm">*</span></span>
                        </label>
                      </div>
                      <textarea
                        className="textarea textarea-bordered h-40 focus:textarea-primary transition-colors resize-none leading-relaxed"
                        placeholder="Tell viewers what your video is about, what they'll learn, or what makes it special..."
                        value={videoData.description}
                        onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                        required
                      ></textarea>
                      <div className="mt-2">
                        <span className="text-xs text-base-content/60">A good description helps with discoverability and SEO ranking</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div className="card bg-base-100 border-2 border-base-300 shadow-sm">
                  <div className="card-body p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Video Thumbnail
                    </h3>
                    <div className="form-control">
                      <div className="mb-3">
                        <label className="block">
                          <span className="label-text font-semibold text-base block mb-1">Select Thumbnail Option</span>
                          <span className="text-xs text-info">Recommended: 1280x720 (16:9)</span>
                        </label>
                      </div>
                      
                      {/* Thumbnail Type Toggle */}
                      <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={handleUseAutoThumbnail}
                      className={`btn btn-sm ${thumbnailType === 'auto' ? 'btn-primary' : 'btn-outline'}`}
                      disabled={!autoThumbnailUrl}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Auto-Generated
                      {thumbnailType === 'auto' && (
                        <span className="badge badge-sm badge-success ml-1">Active</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualThumbnailUrl) {
                          // Trigger file upload dialog
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              // FileUpload component will handle this
                              setThumbnailType('manual');
                            }
                          };
                          input.click();
                        } else {
                          setThumbnailType('manual');
                        }
                      }}
                      className={`btn btn-sm ${thumbnailType === 'manual' ? 'btn-primary' : 'btn-outline'}`}
                    >
                      <Upload className="w-4 h-4" />
                      Custom Upload
                      {thumbnailType === 'manual' && (
                        <span className="badge badge-sm badge-success ml-1">Active</span>
                      )}
                    </button>
                  </div>

                  {/* Thumbnail Preview Section - Grid Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Auto-Generated Thumbnail Preview */}
                    {autoThumbnailUrl && (
                      <div className={`card border-2 ${thumbnailType === 'auto' ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200'} shadow-md`}>
                        <div className="card-body p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Auto-Generated
                            </span>
                            {thumbnailType === 'auto' && (
                              <span className="badge badge-sm badge-primary">Active</span>
                            )}
                          </div>
                          <div className="relative w-full rounded-lg overflow-hidden border-2 border-base-300 bg-base-200" style={{ aspectRatio: '16/9' }}>
                            {!thumbnailError ? (
                              <>
                                <Image
                                  src={autoThumbnailUrl}
                                  alt="Auto-generated thumbnail"
                                  fill
                                  className="object-cover"
                                  unoptimized={true}
                                  onLoad={() => {
                                    setThumbnailLoading(false);
                                    setThumbnailError(false);
                                  }}
                                  onError={() => {
                                    // Thumbnail not ready yet - this is expected for new uploads
                                    setThumbnailError(true);
                                    setThumbnailLoading(false);
                                    
                                    if (process.env.NODE_ENV === 'development') {
                                      console.warn('Auto-generated thumbnail not ready yet.');
                                      console.warn('ImageKit may need 10-30 seconds to process the video after upload.');
                                      console.warn('Thumbnail URL:', autoThumbnailUrl);
                                    }
                                  }}
                                />
                                {thumbnailType === 'auto' && !thumbnailLoading && (
                                  <div className="absolute inset-0 bg-primary/10 border-2 border-primary z-10"></div>
                                )}
                                {/* Show processing message while thumbnail is loading */}
                                {thumbnailLoading && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-base-200/90 backdrop-blur-sm z-20">
                                    <div className="text-center p-4">
                                      <div className="loading loading-spinner loading-md mb-2"></div>
                                      <p className="text-xs text-base-content/70">Loading thumbnail...</p>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center p-4">
                                  <div className="loading loading-spinner loading-md mb-2 text-primary"></div>
                                  <p className="text-xs text-base-content/70 font-medium">Processing thumbnail...</p>
                                  <p className="text-xs text-base-content/50 mt-1">ImageKit is generating thumbnail</p>
                                  <p className="text-xs text-base-content/40 mt-1">Usually takes 10-30 seconds</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-base-content/60">
                              Automatically selected from your video
                            </p>
                            {thumbnailType !== 'auto' && (
                              <button
                                type="button"
                                onClick={handleUseAutoThumbnail}
                                className="btn btn-sm btn-primary btn-block"
                              >
                                Use This Thumbnail
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Manual Upload Section */}
                    <div className={`card border-2 ${thumbnailType === 'manual' ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200'} shadow-md`}>
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Custom Thumbnail
                          </span>
                          {thumbnailType === 'manual' && (
                            <span className="badge badge-sm badge-primary">Active</span>
                          )}
                    </div>
                        
                        {manualThumbnailUrl ? (
                          <div className="space-y-3">
                            <div className="relative w-full rounded-lg overflow-hidden border-2 border-base-300 bg-base-200" style={{ aspectRatio: '16/9' }}>
                          <Image
                                src={manualThumbnailUrl}
                                alt="Custom thumbnail"
                            fill
                            className="object-cover"
                                unoptimized={true}
                          />
                              {thumbnailType === 'manual' && (
                                <div className="absolute inset-0 bg-primary/10 border-2 border-primary z-10"></div>
                              )}
                        <button
                          type="button"
                                onClick={handleRemoveManualThumbnail}
                                className="absolute top-2 right-2 btn btn-circle btn-xs btn-error opacity-80 hover:opacity-100 z-20"
                                title="Remove custom thumbnail"
                        >
                          <X className="w-3 h-3" />
                        </button>
                            </div>
                            {thumbnailType !== 'manual' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setThumbnailType('manual');
                                  setVideoData(prev => ({ ...prev, thumbnailUrl: manualThumbnailUrl }));
                                  showNotification("Switched to custom thumbnail", "info");
                                }}
                                className="btn btn-sm btn-primary btn-block"
                              >
                                Use This Thumbnail
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <FileUpload
                                  onSuccess={handleThumbnailUpload}
                                  fileType="image"
                                />
                                <button
                                  type="button"
                                  onClick={handleRemoveManualThumbnail}
                                  className="btn btn-sm btn-outline btn-error"
                                  title="Remove and use auto-generated"
                                >
                                  <X className="w-4 h-4" />
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative w-full rounded-lg overflow-hidden border-2 border-dashed border-base-300 bg-base-100" style={{ aspectRatio: '16/9' }}>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center p-4">
                                  <Upload className="w-8 h-8 mx-auto mb-2 text-base-content/40" />
                                  <p className="text-xs text-base-content/60">No custom thumbnail</p>
                                </div>
                              </div>
                            </div>
                            <FileUpload
                              onSuccess={handleThumbnailUpload}
                              fileType="image"
                            />
                            <p className="text-xs text-base-content/60 text-center">
                              Upload JPG, PNG, or WebP (1280x720 recommended)
                            </p>
                      </div>
                    )}
                  </div>
                    </div>
                  </div>

                    <label className="label mt-2">
                      <span className="label-text-alt">💡 A good thumbnail can increase click-through rates by up to 154%</span>
                  </label>
                  </div>
                </div>
                </div>

                {/* Privacy Settings */}
                <div className="card bg-base-100 border-2 border-base-300 shadow-sm">
                  <div className="card-body p-6">
                    <h3 className="text-lg font-semibold mb-4">Privacy & Visibility</h3>
                    <div className="form-control">
                      <div className="mb-3">
                        <label className="block">
                          <span className="label-text font-semibold text-base block mb-1">Choose Privacy Level</span>
                          <span className="text-xs text-info">Control who can see your video</span>
                        </label>
                      </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
                      <div className="card-body p-4">
                        <label className="label cursor-pointer">
                          <input 
                            type="radio" 
                            name="privacy" 
                            className="radio radio-primary" 
                            checked={privacy === 'public'}
                            onChange={() => setPrivacy('public')}
                          />
                          <div className="ml-3">
                            <div className="font-semibold">Public</div>
                            <div className="text-sm text-base-content/70">Anyone can view</div>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
                      <div className="card-body p-4">
                        <label className="label cursor-pointer">
                          <input 
                            type="radio" 
                            name="privacy" 
                            className="radio radio-primary"
                            checked={privacy === 'unlisted'}
                            onChange={() => setPrivacy('unlisted')}
                          />
                          <div className="ml-3">
                            <div className="font-semibold">Unlisted</div>
                            <div className="text-sm text-base-content/70">Only with link</div>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
                      <div className="card-body p-4">
                        <label className="label cursor-pointer">
                          <input 
                            type="radio" 
                            name="privacy" 
                            className="radio radio-primary"
                            checked={privacy === 'private'}
                            onChange={() => setPrivacy('private')}
                          />
                          <div className="ml-3">
                            <div className="font-semibold">Private</div>
                            <div className="text-sm text-base-content/70">Only you</div>
                          </div>
                        </label>
                      </div>
                      </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="card bg-base-100 border-2 border-base-300 shadow-sm">
                  <div className="card-body p-6">
                    <div className="form-control">
                      <div className="mb-2">
                        <label className="block">
                          <span className="label-text font-semibold text-base block mb-1">Tags</span>
                          <span className="text-xs text-info">Separate with commas</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="gaming, tutorial, funny, entertainment..."
                        className="input input-bordered w-full focus:input-primary transition-colors"
                      />
                      <div className="mt-1">
                        <span className="text-xs text-base-content/60">Tags help people discover your content</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Status */}
                <div className="alert alert-success">
                  <CheckCircle className="w-5 h-5" />
                  <span>Video uploaded successfully! Ready to publish.</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-base-300">
                  <button
                    type="button"
                    className="btn btn-outline btn-lg flex-1"
                    onClick={() => router.push("/")}
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg flex-1"
                    disabled={isUploading || !videoData.title || !videoData.description || !videoData.videoUrl}
                  >
                    {isUploading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Publishing Video...
                      </>
                    ) : (
                      <>
                        <Video className="w-5 h-5" />
                        Publish Video
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Video Upload Section */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Video File</span>
                  <span className="label-text-alt text-error">Required</span>
                </label>
                <div className="relative">
                  <FileUpload
                    onSuccess={handleVideoUpload}
                    onProgress={setUploadProgress}
                    fileType="video"
                  />
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-2">
                      <DaisyUIProgress
                        value={uploadProgress}
                        max={100}
                        color="primary"
                        size="sm"
                        showLabel={true}
                        label="Upload Progress"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Video Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <div className="mb-2">
                    <label className="block">
                      <span className="label-text font-semibold block mb-1">Title <span className="text-error text-sm">*</span></span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter video title"
                    className="input input-bordered w-full"
                    value={videoData.title}
                    onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-control">
                  <div className="mb-2">
                    <label className="block">
                      <span className="label-text font-semibold block mb-1">Category</span>
                    </label>
                  </div>
                  <select className="select select-bordered w-full" defaultValue="">
                    <option disabled value="">Choose category</option>
                    <option>Entertainment</option>
                    <option>Education</option>
                    <option>Technology</option>
                    <option>Gaming</option>
                    <option>Music</option>
                    <option>Sports</option>
                    <option>News</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="form-control">
                <div className="mb-2">
                  <label className="block">
                    <span className="label-text font-semibold block mb-1">Description <span className="text-error text-sm">*</span></span>
                  </label>
                </div>
                <textarea
                  className="textarea textarea-bordered h-40 leading-relaxed"
                  placeholder="Describe your video in detail... What's it about? What will viewers learn or experience? Include key topics and highlights..."
                  value={videoData.description}
                  onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                  required
                ></textarea>
                <div className="mt-2">
                  <span className="text-xs text-base-content/60">A good description helps with discoverability and SEO ranking</span>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div className="form-control">
                <div className="mb-2">
                  <label className="block">
                    <span className="label-text font-semibold block mb-1">Thumbnail</span>
                    <span className="text-xs text-info">Recommended: 1280x720</span>
                  </label>
                </div>
                
                {/* Thumbnail Type Toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={handleUseAutoThumbnail}
                    className={`btn btn-sm ${thumbnailType === 'auto' ? 'btn-primary' : 'btn-outline'}`}
                    disabled={!autoThumbnailUrl}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Auto
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${thumbnailType === 'manual' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      if (!manualThumbnailUrl) {
                        // File upload will be triggered by FileUpload component
                      } else {
                        setThumbnailType('manual');
                      }
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    Custom
                  </button>
                </div>

                {/* Current Thumbnail Preview */}
                  {videoData.thumbnailUrl && (
                  <div className="mb-4">
                    <div className="card border-2 border-base-300 bg-base-100 shadow-sm">
                      <div className="card-body p-3">
                        <div className="relative w-full rounded-lg overflow-hidden border-2 border-base-300 bg-base-200" style={{ aspectRatio: '16/9' }}>
                      <Image
                        src={videoData.thumbnailUrl}
                        alt="Thumbnail preview"
                            fill
                            className="object-cover"
                            unoptimized={true}
                            onError={(e) => {
                              if (process.env.NODE_ENV === 'development') {
                                console.warn('Thumbnail not loaded yet, may still be processing');
                              }
                            }}
                          />
                          {thumbnailType === 'manual' && (
                      <button
                        type="button"
                              onClick={handleRemoveManualThumbnail}
                              className="absolute top-2 right-2 btn btn-circle btn-xs btn-error z-10"
                              title="Remove custom thumbnail"
                      >
                        <X className="w-3 h-3" />
                      </button>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <p className="text-xs text-base-content/60 text-center">
                            {thumbnailType === 'auto' ? (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Auto-generated thumbnail
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Upload className="w-3 h-3" />
                                Custom thumbnail
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    </div>
                  )}

                {/* Upload Custom Thumbnail */}
                {thumbnailType === 'manual' && !manualThumbnailUrl && (
                  <FileUpload
                    onSuccess={handleThumbnailUpload}
                    fileType="image"
                  />
                )}
              </div>

              {/* Privacy Settings */}
              <div className="form-control">
                <div className="mb-2">
                  <label className="block">
                    <span className="label-text font-semibold block mb-1">Privacy</span>
                  </label>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input 
                        type="radio" 
                        name="privacy" 
                        className="radio radio-primary" 
                        checked={privacy === 'public'}
                        onChange={() => setPrivacy('public')}
                      />
                      <span className="label-text ml-2">Public</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input 
                        type="radio" 
                        name="privacy" 
                        className="radio radio-primary"
                        checked={privacy === 'unlisted'}
                        onChange={() => setPrivacy('unlisted')}
                      />
                      <span className="label-text ml-2">Unlisted</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input 
                        type="radio" 
                        name="privacy" 
                        className="radio radio-primary"
                        checked={privacy === 'private'}
                        onChange={() => setPrivacy('private')}
                      />
                      <span className="label-text ml-2">Private</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="form-control">
                <div className="mb-2">
                  <label className="block">
                    <span className="label-text font-semibold block mb-1">Tags</span>
                    <span className="text-xs text-info">Separate with commas</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="gaming, tutorial, funny..."
                  className="input input-bordered w-full"
                />
                <div className="mt-1">
                  <span className="text-xs text-base-content/60">Tags help people discover your content</span>
                </div>
              </div>

              {/* Upload Status */}
              {videoData.videoUrl && (
                <div className="alert alert-success">
                  <CheckCircle className="w-5 h-5" />
                  <span>Video uploaded successfully! Ready to publish.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  className="btn btn-outline flex-1"
                  onClick={() => router.push("/")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={isUploading || !videoData.title || !videoData.description || !videoData.videoUrl}
                >
                  {isUploading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      Publish Video
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}