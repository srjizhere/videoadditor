"use client";

import VideoUploadForm from "../components/VideoUploadForm";
import Header from "../components/Header";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function VideoUploadPage() {
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
          <VideoUploadForm />
        </div>
      </div>
    </>
  );
}
