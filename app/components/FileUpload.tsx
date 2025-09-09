"use client"; // This component must be a client component

import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next";
import { useRef, useState } from "react";

interface FileUploadProps {
  onSuccess: (res: any) => void;
  onProgress?: (progress: number) => void;
  fileType?: "image" | "video";
}

const FileUpload = ({ onSuccess, onProgress, fileType }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file || !validateFile(file)) return;

    setUploading(true);
    setError(null);

    try {
      const authRes = await fetch("/api/auth/imagekit-auth");
      const auth = await authRes.json();

      if (!authRes.ok) {
        throw new Error(auth.error || "Authentication failed");
      }

      const res = await upload({
        file,
        fileName: file.name,
        publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!,
        signature: auth.signature,
        expire: auth.expire,
        token: auth.token,
        onProgress: (event) => {
          if(event.lengthComputable && onProgress){
            const percent = (event.loaded / event.total) * 100;
            onProgress(Math.round(percent))
          }
        },
      });
      onSuccess(res)
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
        setUploading(false)
    }
  };

  return (
    <>
      <input
        type="file"
        accept={fileType === "video" ? "video/*" : "image/*"}
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <span>Loading....</span>}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </>
  );
};

export default FileUpload;
