"use client";

import React, { useEffect } from "react";
import { X, Menu, ChevronRight } from "lucide-react";

interface DaisyUIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export default function DaisyUIDrawer({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  size = "md",
  className = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true
}: DaisyUIDrawerProps) {
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

  const getDrawerClass = () => {
    const baseClass = "drawer";
    const sideClass = `drawer-${side}`;
    return `${baseClass} ${sideClass}`;
  };

  const getContentClass = () => {
    const baseClass = "drawer-content";
    const sizeClass = getSizeClass(size);
    return `${baseClass} ${sizeClass} ${className}`;
  };

  const getSideClass = () => {
    const baseClass = "drawer-side";
    const sizeClass = getSizeClass(size);
    return `${baseClass} ${sizeClass}`;
  };

  return (
    <div className={getDrawerClass()}>
      <input
        type="checkbox"
        className="drawer-toggle"
        checked={isOpen}
        onChange={() => {}} // Controlled by isOpen prop
      />
      
      <div className={getContentClass()}>
        {children}
      </div>
      
      <div className={getSideClass()}>
        <label
          htmlFor="drawer-toggle"
          className="drawer-overlay"
          onClick={closeOnBackdrop ? onClose : undefined}
        />
        <div className="min-h-full bg-base-100 border-l border-base-300">
          <div className="p-4">
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
        </div>
      </div>
    </div>
  );
}

function getSizeClass(size: string): string {
  switch (size) {
    case "xs": return "w-64";
    case "sm": return "w-80";
    case "md": return "w-96";
    case "lg": return "w-[32rem]";
    case "xl": return "w-[40rem]";
    case "2xl": return "w-[48rem]";
    case "3xl": return "w-[56rem]";
    case "4xl": return "w-[64rem]";
    case "5xl": return "w-[72rem]";
    case "full": return "w-full";
    default: return "w-96";
  }
}

// Filter Drawer
interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: Record<string, unknown>) => void;
  onClearFilters: () => void;
  children: React.ReactNode;
  title?: string;
}

export function FilterDrawer({
  isOpen,
  onClose,
  onApplyFilters,
  onClearFilters,
  children,
  title = "Filters"
}: FilterDrawerProps) {
  const handleApplyFilters = () => {
    // In a real implementation, you would collect filter values from form inputs
    // For now, we'll pass an empty object as a placeholder
    const filters: Record<string, unknown> = {};
    onApplyFilters(filters);
  };

  return (
    <DaisyUIDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      side="right"
      size="md"
    >
      <div className="space-y-4">
        {children}
        
        <div className="flex gap-2 pt-4 border-t border-base-300">
          <button
            onClick={onClearFilters}
            className="btn btn-ghost btn-sm flex-1"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="btn btn-primary btn-sm flex-1"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </DaisyUIDrawer>
  );
}

// Settings Drawer
interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  onSave?: () => void;
  onReset?: () => void;
}

export function SettingsDrawer({
  isOpen,
  onClose,
  children,
  onSave,
  onReset
}: SettingsDrawerProps) {
  return (
    <DaisyUIDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      side="right"
      size="lg"
    >
      <div className="space-y-6">
        {children}
        
        <div className="flex gap-2 pt-4 border-t border-base-300">
          {onReset && (
            <button
              onClick={onReset}
              className="btn btn-ghost btn-sm"
            >
              Reset
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              className="btn btn-primary btn-sm flex-1"
            >
              Save Settings
            </button>
          )}
        </div>
      </div>
    </DaisyUIDrawer>
  );
}

// Mobile Menu Drawer
interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function MobileMenuDrawer({
  isOpen,
  onClose,
  children,
  title = "Menu"
}: MobileMenuDrawerProps) {
  return (
    <DaisyUIDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      side="left"
      size="sm"
    >
      <div className="space-y-2">
        {children}
      </div>
    </DaisyUIDrawer>
  );
}

// Drawer Toggle Button
interface DrawerToggleProps {
  onToggle: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function DrawerToggle({ 
  onToggle, 
  className = "",
  children 
}: DrawerToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`btn btn-ghost ${className}`}
    >
      {children || <Menu className="w-5 h-5" />}
    </button>
  );
}
