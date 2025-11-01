"use client";

import React, { useState } from "react";
import { Upload, Video, Image as ImageIcon, X, CheckCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FileUpload from "./FileUpload";
import { useNotification } from "../layout/Notification";
import DaisyUIProgress, { UploadProgress } from "../ui/DaisyUIProgress";
import { VideoPreview } from "../ui/MediaPreview";

interface VideoData {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
}

export default function VideoUploadForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [videoData, setVideoData] = useState<VideoData>({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<unknown>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { showNotification } = useNotification();

  const handleVideoUpload = (response: unknown) => {
    const res = response as { url: string };
    setVideoData(prev => ({
      ...prev,
      videoUrl: res.url,
    }));
    setUploadedFile(response);
    setShowPreview(true);
    showNotification("Video uploaded successfully!", "success");
  };

  const handleThumbnailUpload = (response: unknown) => {
    const res = response as { url: string };
    setVideoData(prev => ({
      ...prev,
      thumbnailUrl: res.url,
    }));
    showNotification("Thumbnail uploaded successfully!", "success");
  };

  const handleResetUpload = () => {
    setVideoData({
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
    });
    setUploadedFile(null);
    setShowPreview(false);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoData.title || !videoData.description || !videoData.videoUrl) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    setIsUploading(true);
    
    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: videoData.title,
          description: videoData.description,
          videoUrl: videoData.videoUrl,
          thumbnailUrl: videoData.thumbnailUrl,
          category: "other",
          tags: [],
          isPublic: true,
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
        thumbnailUrl: "",
      });
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
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Video Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base">Title</span>
                      <span className="label-text-alt text-error font-medium">Required</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter an engaging video title"
                      className="input input-bordered w-full focus:input-primary transition-colors"
                      value={videoData.title}
                      onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                    <label className="label">
                      <span className="label-text-alt">Make it catchy and descriptive</span>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-base">Category</span>
                    </label>
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
                    <label className="label">
                      <span className="label-text-alt">Help viewers find your content</span>
                    </label>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-base">Description</span>
                    <span className="label-text-alt text-error font-medium">Required</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-32 focus:textarea-primary transition-colors resize-none"
                    placeholder="Tell viewers what your video is about, what they'll learn, or what makes it special..."
                    value={videoData.description}
                    onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                    required
                  ></textarea>
                  <label className="label">
                    <span className="label-text-alt">A good description helps with discoverability</span>
                  </label>
                </div>

                {/* Thumbnail Upload */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-base">Thumbnail (Optional)</span>
                    <span className="label-text-alt text-info">Recommended: 1280x720</span>
                  </label>
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <FileUpload
                        onSuccess={handleThumbnailUpload}
                        fileType="image"
                      />
                    </div>
                    {videoData.thumbnailUrl && (
                      <div className="relative group">
                        <div className="relative w-32 h-20 rounded-xl overflow-hidden border-2 border-base-300">
                          <Image
                            src={videoData.thumbnailUrl}
                            alt="Thumbnail preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setVideoData(prev => ({ ...prev, thumbnailUrl: "" }))}
                          className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="text-xs text-base-content/60 mt-1 text-center">Preview</div>
                      </div>
                    )}
                  </div>
                  <label className="label">
                    <span className="label-text-alt">A good thumbnail increases click-through rates</span>
                  </label>
                </div>

                {/* Privacy Settings */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-base">Privacy Settings</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer">
                      <div className="card-body p-4">
                        <label className="label cursor-pointer">
                          <input type="radio" name="privacy" className="radio radio-primary" defaultChecked />
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
                          <input type="radio" name="privacy" className="radio radio-primary" />
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
                          <input type="radio" name="privacy" className="radio radio-primary" />
                          <div className="ml-3">
                            <div className="font-semibold">Private</div>
                            <div className="text-sm text-base-content/70">Only you</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold text-base">Tags</span>
                    <span className="label-text-alt text-info">Separate with commas</span>
                  </label>
                  <input
                    type="text"
                    placeholder="gaming, tutorial, funny, entertainment..."
                    className="input input-bordered w-full focus:input-primary transition-colors"
                  />
                  <label className="label">
                    <span className="label-text-alt">Tags help people discover your content</span>
                  </label>
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
                  <label className="label">
                    <span className="label-text font-semibold">Title</span>
                    <span className="label-text-alt text-error">Required</span>
                  </label>
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
                  <label className="label">
                    <span className="label-text font-semibold">Category</span>
                  </label>
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
                <label className="label">
                  <span className="label-text font-semibold">Description</span>
                  <span className="label-text-alt text-error">Required</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder="Describe your video..."
                  value={videoData.description}
                  onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                  required
                ></textarea>
              </div>

              {/* Thumbnail Upload */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Thumbnail (Optional)</span>
                  <span className="label-text-alt">Recommended: 1280x720</span>
                </label>
                <div className="flex items-center gap-4">
                  <FileUpload
                    onSuccess={handleThumbnailUpload}
                    fileType="image"
                  />
                  {videoData.thumbnailUrl && (
                    <div className="relative">
                      <Image
                        src={videoData.thumbnailUrl}
                        alt="Thumbnail preview"
                        width={96}
                        height={64}
                        className="w-24 h-16 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setVideoData(prev => ({ ...prev, thumbnailUrl: "" }))}
                        className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Privacy</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input type="radio" name="privacy" className="radio radio-primary" defaultChecked />
                      <span className="label-text ml-2">Public</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input type="radio" name="privacy" className="radio radio-primary" />
                      <span className="label-text ml-2">Unlisted</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer">
                      <input type="radio" name="privacy" className="radio radio-primary" />
                      <span className="label-text ml-2">Private</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Tags</span>
                  <span className="label-text-alt">Separate with commas</span>
                </label>
                <input
                  type="text"
                  placeholder="gaming, tutorial, funny..."
                  className="input input-bordered w-full"
                />
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