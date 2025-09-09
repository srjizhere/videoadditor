"use client";

import React, { useState } from "react";
import { Upload, Video, Image, X, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FileUpload from "./FileUpload";
import { useNotification } from "./Notification";

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
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const { showNotification } = useNotification();

  const handleVideoUpload = (response: any) => {
    setVideoData(prev => ({
      ...prev,
      videoUrl: response.url,
    }));
    setUploadedFile(response);
    showNotification("Video uploaded successfully!", "success");
  };

  const handleThumbnailUpload = (response: any) => {
    setVideoData(prev => ({
      ...prev,
      thumbnailUrl: response.url,
    }));
    showNotification("Thumbnail uploaded successfully!", "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoData.title || !videoData.description || !videoData.videoUrl) {
      showNotification("Please fill in all required fields and upload a video", "error");
      return;
    }

    if (!session?.user) {
      showNotification("Please log in to upload videos", "error");
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
          ...videoData,
          uploader: session.user.id,
          uploaderName: session.user.name || session.user.email?.split('@')[0],
          uploaderEmail: session.user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save video");
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
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (error: any) {
      console.error("Video save error:", error);
      showNotification(error.message || "Failed to save video. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Upload New Video</h1>
              <p className="text-blue-100">Share your creativity with the world</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Video Upload Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white">
                Video File *
              </label>
              
              {!videoData.videoUrl ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Upload your video
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Drag and drop your video file here, or click to browse
                      </p>
                      <FileUpload
                        onSuccess={handleVideoUpload}
                        onProgress={setUploadProgress}
                        fileType="video"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 dark:text-green-100">
                        Video uploaded successfully!
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {uploadedFile?.name || "Video file"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoData(prev => ({ ...prev, videoUrl: "" }));
                        setUploadedFile(null);
                      }}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Upload Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-900 dark:text-white">
                Thumbnail Image (Optional)
              </label>
              
              {!videoData.thumbnailUrl ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                      <Image className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Upload thumbnail
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Add a custom thumbnail for your video
                      </p>
                      <FileUpload
                        onSuccess={handleThumbnailUpload}
                        fileType="image"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 dark:text-green-100">
                        Thumbnail uploaded!
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoData(prev => ({ ...prev, thumbnailUrl: "" }));
                      }}
                      className="p-2 hover:bg-green-100 dark:hover:bg-green-800 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Video Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Video Title *
                </label>
                <input
                  type="text"
                  value={videoData.title}
                  onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter an engaging title for your video"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Duration
                </label>
                <input
                  type="text"
                  value={uploadedFile?.duration || "Auto-detected"}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                Description *
              </label>
              <textarea
                value={videoData.description}
                onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your video content, what viewers can expect to see..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all resize-none"
                required
              />
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Uploading... {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-6">
              <button
                type="button"
                onClick={() => {
                  setVideoData({
                    title: "",
                    description: "",
                    videoUrl: "",
                    thumbnailUrl: "",
                  });
                  setUploadedFile(null);
                  setUploadProgress(0);
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isUploading || !videoData.videoUrl}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        </div>
      </div>
    </div>
  );
}
