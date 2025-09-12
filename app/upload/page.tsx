"use client";

import VideoUploadForm from "../components/VideoUploadForm";
import ImageUploadForm from "../components/ImageUploadForm";
import Header from "../components/Header";
import Link from "next/link";
import { Home, ArrowLeft, Video, Image as ImageIcon } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        {/* Navigation Bar */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-12">
          {/* Media Type Selector */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setMediaType(MediaType.VIDEO)}
                className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-200 ${
                  mediaType === MediaType.VIDEO
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Video className="w-5 h-5" />
                Upload Video
              </button>
              <button
                onClick={() => setMediaType(MediaType.IMAGE)}
                className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-200 ${
                  mediaType === MediaType.IMAGE
                    ? 'bg-green-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
