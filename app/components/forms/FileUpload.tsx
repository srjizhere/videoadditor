"use client"; // This component must be a client component

import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next";
import { useRef, useState } from "react";
import { X, Image as ImageIcon, Video } from "lucide-react";

interface FileUploadProps {
  onSuccess?: (res: unknown) => void;
  onProgress?: (progress: number) => void;
  fileType?: "image" | "video";
}

const FileUpload = ({ onSuccess, onProgress, fileType }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  //optional validation

  const validateFile = (file: File) => {
    if (fileType === "video") {
      if (!file.type.startsWith("video/")) {
        setError("Please upload a valid video file");
        return false;
      }
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File size must be less than 100 MB");
      return false;
    }
    return true;
  };

  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    setUploading(true);
    setError(null);

    try {
      // Add cache-busting parameter to ensure fresh authentication
      const authRes = await fetch(`/api/auth/imagekit-auth?t=${Date.now()}`);
      const auth = await authRes.json();

      if (!authRes.ok) {
        throw new Error(auth.error || "Authentication failed");
      }

      const res = await upload({
        file,
        fileName: file.name,
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
        signature: auth.signature,
        expire: auth.expire,
        token: auth.token,
        onProgress: (event) => {
          if(event.lengthComputable && onProgress){
            const percent = (event.loaded / event.total) * 100;
            onProgress(Math.round(percent));
          }
        },
      });
      onSuccess?.(res);
    } catch (error) {
      console.error("Upload failed", error);
      
      if (error instanceof ImageKitInvalidRequestError) {
        setError("Invalid request. Please check your file and try again.");
      } else if (error instanceof ImageKitAbortError) {
        setError("Upload was cancelled.");
      } else if (error instanceof ImageKitUploadNetworkError) {
        setError("Network error. Please check your connection and try again.");
      } else if (error instanceof ImageKitServerError) {
        setError("Server error. Please try again later.");
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
        setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      await handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileType === "video" ? "video/*" : "image/*"}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      
      {/* Drag and Drop Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer group ${
          dragActive 
            ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20' 
            : 'border-base-300 hover:border-primary/50 hover:bg-base-200/50 hover:scale-[1.01]'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="space-y-6">
          {uploading ? (
            <div className="space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  {fileType === "video" ? (
                    <Video className="w-6 h-6 text-primary" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-primary" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-base-content mb-1">Uploading...</p>
                <p className="text-sm text-base-content/70">Please wait while we process your file</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative">
                <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  dragActive 
                    ? 'bg-primary/20 scale-110' 
                    : 'bg-base-200 group-hover:bg-primary/10 group-hover:scale-105'
                }`}>
                  {fileType === "video" ? (
                    <Video className={`w-10 h-10 transition-colors duration-300 ${
                      dragActive ? 'text-primary' : 'text-base-content/60 group-hover:text-primary'
                    }`} />
                  ) : (
                    <ImageIcon className={`w-10 h-10 transition-colors duration-300 ${
                      dragActive ? 'text-primary' : 'text-base-content/60 group-hover:text-primary'
                    }`} />
                  )}
                </div>
                {dragActive && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-base-content">
                  {dragActive ? 'Drop your file here' : `Upload ${fileType === 'video' ? 'Video' : 'Image'}`}
                </h3>
                <p className="text-base-content/70">
                  {dragActive 
                    ? 'Release to upload your file' 
                    : 'Click to browse or drag and drop your file here'
                  }
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-base-content/60">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>{fileType === "video" ? 'MP4, MOV, AVI' : 'JPG, PNG, WebP'}</span>
                  </div>
                  <div className="w-px h-4 bg-base-300"></div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-warning rounded-full"></div>
                    <span>{fileType === "video" ? 'Max 100MB' : 'Max 10MB'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Upload Progress Indicator */}
        {uploading && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="w-full bg-base-300 rounded-full h-1">
              <div className="bg-primary h-1 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-error/10 border border-error/20 rounded-xl">
          <div className="flex items-center gap-3 text-error">
            <div className="w-8 h-8 bg-error/20 rounded-full flex items-center justify-center">
              <X className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">Upload Failed</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
