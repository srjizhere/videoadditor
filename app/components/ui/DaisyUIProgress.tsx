"use client";

import React from "react";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";

interface DaisyUIProgressProps {
  value: number;
  max?: number;
  size?: "xs" | "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "info";
  className?: string;
  showLabel?: boolean;
  label?: string;
}

export default function DaisyUIProgress({
  value,
  max = 100,
  size = "md",
  color = "primary",
  className = "",
  showLabel = false,
  label
}: DaisyUIProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const getSizeClass = () => {
    switch (size) {
      case "xs": return "h-1";
      case "sm": return "h-2";
      case "md": return "h-3";
      case "lg": return "h-4";
      default: return "h-3";
    }
  };

  const getColorClass = () => {
    switch (color) {
      case "primary": return "progress-primary";
      case "secondary": return "progress-secondary";
      case "accent": return "progress-accent";
      case "success": return "progress-success";
      case "warning": return "progress-warning";
      case "error": return "progress-error";
      case "info": return "progress-info";
      default: return "progress-primary";
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{label || "Progress"}</span>
          <span className="text-sm text-base-content/70">{Math.round(percentage)}%</span>
        </div>
      )}
      <progress 
        className={`progress ${getColorClass()} ${getSizeClass()} w-full`}
        value={value} 
        max={max}
      ></progress>
    </div>
  );
}

// Loading Spinner Component
interface DaisyUISpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "primary" | "secondary" | "accent" | "success" | "warning" | "error" | "info";
  className?: string;
}

export function DaisyUISpinner({
  size = "md",
  color = "primary",
  className = ""
}: DaisyUISpinnerProps) {
  const getSizeClass = () => {
    switch (size) {
      case "xs": return "loading-xs";
      case "sm": return "loading-sm";
      case "md": return "loading-md";
      case "lg": return "loading-lg";
      case "xl": return "loading-xl";
      default: return "loading-md";
    }
  };

  const getColorClass = () => {
    switch (color) {
      case "primary": return "text-primary";
      case "secondary": return "text-secondary";
      case "accent": return "text-accent";
      case "success": return "text-success";
      case "warning": return "text-warning";
      case "error": return "text-error";
      case "info": return "text-info";
      default: return "text-primary";
    }
  };

  return (
    <span className={`loading loading-spinner ${getSizeClass()} ${getColorClass()} ${className}`}></span>
  );
}

// Skeleton Loading Component
interface DaisyUISkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export function DaisyUISkeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse"
}: DaisyUISkeletonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case "text": return "h-4";
      case "rectangular": return "";
      case "circular": return "rounded-full";
      default: return "";
    }
  };

  const getAnimationClass = () => {
    switch (animation) {
      case "pulse": return "animate-pulse";
      case "wave": return "loading-shimmer";
      case "none": return "";
      default: return "animate-pulse";
    }
  };

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  return (
    <div
      className={`skeleton bg-base-300 ${getVariantClass()} ${getAnimationClass()} ${className}`}
      style={style}
    ></div>
  );
}

// Steps Component
interface Step {
  title: string;
  description?: string;
  status: "pending" | "current" | "completed" | "error";
}

interface DaisyUIStepsProps {
  steps: Step[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function DaisyUISteps({
  steps,
  orientation = "horizontal",
  className = ""
}: DaisyUIStepsProps) {
  const getStepClass = (status: Step["status"]) => {
    switch (status) {
      case "completed": return "step-primary";
      case "current": return "step-primary";
      case "error": return "step-error";
      case "pending": return "";
      default: return "";
    }
  };

  const getStepIcon = (status: Step["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "error": return <AlertCircle className="w-4 h-4" />;
      case "current": return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <ul className={`steps ${orientation === "vertical" ? "steps-vertical" : ""} ${className}`}>
      {steps.map((step, index) => (
        <li key={index} className={`step ${getStepClass(step.status)}`}>
          <div className="flex items-center gap-2">
            {getStepIcon(step.status)}
            <div>
              <div className="font-medium">{step.title}</div>
              {step.description && (
                <div className="text-sm text-base-content/70">{step.description}</div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Upload Progress Component
interface UploadProgressProps {
  progress: number;
  fileName?: string;
  fileSize?: string;
  status?: "uploading" | "processing" | "completed" | "error";
  onCancel?: () => void;
  className?: string;
}

export function UploadProgress({
  progress,
  fileName,
  fileSize,
  status = "uploading",
  onCancel,
  className = ""
}: UploadProgressProps) {
  const getStatusColor = () => {
    switch (status) {
      case "uploading": return "progress-primary";
      case "processing": return "progress-warning";
      case "completed": return "progress-success";
      case "error": return "progress-error";
      default: return "progress-primary";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "uploading": return "Uploading...";
      case "processing": return "Processing...";
      case "completed": return "Completed";
      case "error": return "Error";
      default: return "Uploading...";
    }
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DaisyUISpinner size="sm" color="primary" />
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
          {onCancel && status === "uploading" && (
            <button
              onClick={onCancel}
              className="btn btn-sm btn-ghost btn-circle"
            >
              ×
            </button>
          )}
        </div>
        
        {fileName && (
          <div className="text-sm text-base-content/70 mb-2">
            <div className="font-medium">{fileName}</div>
            {fileSize && <div className="text-xs">{fileSize}</div>}
          </div>
        )}
        
        <DaisyUIProgress
          value={progress}
          color={status === "error" ? "error" : status === "completed" ? "success" : "primary"}
          size="sm"
        />
      </div>
    </div>
  );
}

// Loading State Component
interface LoadingStateProps {
  message?: string;
  spinner?: boolean;
  skeleton?: boolean;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  spinner = true,
  skeleton = false,
  className = ""
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      {spinner && <DaisyUISpinner size="lg" />}
      {skeleton && (
        <div className="space-y-2 w-full max-w-xs">
          <DaisyUISkeleton height={20} />
          <DaisyUISkeleton height={16} width="80%" />
          <DaisyUISkeleton height={16} width="60%" />
        </div>
      )}
      <p className="mt-4 text-base-content/70">{message}</p>
    </div>
  );
}
