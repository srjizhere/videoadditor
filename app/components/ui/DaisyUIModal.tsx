"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";

interface DaisyUIModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export default function DaisyUIModal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true
}: DaisyUIModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.showModal();
    } else {
      modalRef.current?.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeOnEscape, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdrop && event.target === modalRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={modalRef}
      className={`modal ${className}`}
      onClick={handleBackdropClick}
    >
      <div className={`modal-box ${getSizeClass(size)}`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}

function getSizeClass(size: string): string {
  switch (size) {
    case "xs": return "max-w-xs";
    case "sm": return "max-w-sm";
    case "md": return "max-w-md";
    case "lg": return "max-w-lg";
    case "xl": return "max-w-xl";
    case "2xl": return "max-w-2xl";
    case "3xl": return "max-w-3xl";
    case "4xl": return "max-w-4xl";
    case "5xl": return "max-w-5xl";
    case "full": return "max-w-full";
    default: return "max-w-md";
  }
}

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger" | "info";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  isLoading = false
}: ConfirmationModalProps) {
  const getIcon = () => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      case "danger":
        return <AlertCircle className="w-6 h-6 text-error" />;
      case "info":
        return <Info className="w-6 h-6 text-info" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-warning" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case "danger":
        return "btn-error";
      case "warning":
        return "btn-warning";
      case "info":
        return "btn-info";
      default:
        return "btn-warning";
    }
  };

  return (
    <DaisyUIModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="flex items-start gap-4">
        {getIcon()}
        <div className="flex-1">
          <p className="text-base-content/80">{message}</p>
        </div>
      </div>
      
      <div className="modal-action">
        <button
          onClick={onClose}
          className="btn btn-ghost"
          disabled={isLoading}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`btn ${getConfirmButtonClass()}`}
          disabled={isLoading}
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          {confirmText}
        </button>
      </div>
    </DaisyUIModal>
  );
}

// Image Preview Modal
interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  alt?: string;
}

export function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  alt = "Preview"
}: ImagePreviewModalProps) {
  return (
    <DaisyUIModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="4xl"
    >
      <div className="relative">
        <Image
          src={imageUrl}
          alt={alt}
          width={800}
          height={600}
          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
        />
      </div>
    </DaisyUIModal>
  );
}

// Form Modal
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
}

export function FormModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = "Submit",
  cancelText = "Cancel",
  isLoading = false,
  size = "lg"
}: FormModalProps) {
  return (
    <DaisyUIModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      <form onSubmit={onSubmit}>
        {children}
        
        <div className="modal-action">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          {onSubmit && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading && <span className="loading loading-spinner loading-sm"></span>}
              {submitText}
            </button>
          )}
        </div>
      </form>
    </DaisyUIModal>
  );
}

// Success Modal
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  title,
  message,
  buttonText = "Got it"
}: SuccessModalProps) {
  return (
    <DaisyUIModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="flex items-start gap-4">
        <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
        <div className="flex-1">
          <p className="text-base-content/80">{message}</p>
        </div>
      </div>
      
      <div className="modal-action">
        <button
          onClick={onClose}
          className="btn btn-success"
        >
          {buttonText}
        </button>
      </div>
    </DaisyUIModal>
  );
}
