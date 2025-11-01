"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface DaisyUIBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

export default function DaisyUIBreadcrumb({
  items,
  className = "",
  separator
}: DaisyUIBreadcrumbProps) {
  const defaultSeparator = <ChevronRight className="w-4 h-4" />;
  const breadcrumbSeparator = separator || defaultSeparator;

  return (
    <div className={`breadcrumbs text-sm ${className}`}>
      <ul>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && (
              <span className="text-base-content/50 mx-1">
                {breadcrumbSeparator}
              </span>
            )}
            {item.href ? (
              <Link 
                href={item.href}
                className="flex items-center gap-1 hover:text-primary transition-colors"
              >
                {item.icon && <span className="flex items-center">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1 text-base-content/70">
                {item.icon && <span className="flex items-center">{item.icon}</span>}
                <span>{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Convenience component for common breadcrumb patterns
export function HomeBreadcrumb({ 
  currentPage, 
  className = "" 
}: { 
  currentPage: string; 
  className?: string; 
}) {
  return (
    <DaisyUIBreadcrumb
      items={[
        { label: "Home", href: "/", icon: <Home className="w-4 h-4" /> },
        { label: currentPage }
      ]}
      className={className}
    />
  );
}

// Breadcrumb for upload pages
export function UploadBreadcrumb({ 
  type = "media", 
  className = "" 
}: { 
  type?: "video" | "image" | "media"; 
  className?: string; 
}) {
  const typeLabel = type === "video" ? "Upload Video" : type === "image" ? "Upload Image" : "Upload";
  
  return (
    <DaisyUIBreadcrumb
      items={[
        { label: "Home", href: "/", icon: <Home className="w-4 h-4" /> },
        { label: typeLabel }
      ]}
      className={className}
    />
  );
}
