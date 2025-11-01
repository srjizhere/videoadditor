"use client";

import { VideoUploadForm } from "../components/forms";
import { ImageUploadForm } from "../components/forms";
import { Header } from "../components/layout";
import { UploadBreadcrumb } from "../components/ui/DaisyUIBreadcrumb";
import { Video, Image as ImageIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { MediaType } from "@/types/media";

export default function UploadPage() {
  const searchParams = useSearchParams();
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.VIDEO);

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'image') {
      setMediaType(MediaType.IMAGE);
    } else {
      setMediaType(MediaType.VIDEO);
    }
  }, [searchParams]);
  return (
    <>
      <Header />
      <div className="min-h-screen bg-base-100">
        {/* Breadcrumb Navigation */}
        <div className="bg-base-200/50 border-b border-base-300">
          <div className="container mx-auto px-4 py-4">
            <UploadBreadcrumb 
              type={mediaType === MediaType.VIDEO ? "video" : "image"} 
              className="text-base-content/70"
            />
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-12">
          {/* Media Type Selector */}
          <div className="flex justify-center mb-8">
            <div className="tabs tabs-boxed bg-base-200">
              <button
                onClick={() => setMediaType(MediaType.VIDEO)}
                className={`tab flex items-center gap-2 ${
                  mediaType === MediaType.VIDEO ? 'tab-active' : ''
                }`}
              >
                <Video className="w-5 h-5" />
                Upload Video
              </button>
              <button
                onClick={() => setMediaType(MediaType.IMAGE)}
                className={`tab flex items-center gap-2 ${
                  mediaType === MediaType.IMAGE ? 'tab-active' : ''
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                Upload Image
              </button>
            </div>
          </div>

          {/* Upload Form */}
          {mediaType === MediaType.VIDEO ? (
            <VideoUploadForm />
          ) : (
            <ImageUploadForm />
          )}
        </div>
      </div>
    </>
  );
}
