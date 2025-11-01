"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";

interface DaisyUIPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  showArrow?: boolean;
}

export default function DaisyUIPopover({
  trigger,
  children,
  position = "bottom",
  size = "md",
  className = "",
  closeOnClickOutside = true,
  closeOnEscape = true,
  showArrow = true
}: DaisyUIPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        closeOnClickOutside &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closeOnClickOutside, closeOnEscape]);

  const getPositionClass = () => {
    switch (position) {
      case "top":
        return "bottom-full mb-2";
      case "bottom":
        return "top-full mt-2";
      case "left":
        return "right-full mr-2";
      case "right":
        return "left-full ml-2";
      default:
        return "top-full mt-2";
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "xs": return "w-48";
      case "sm": return "w-64";
      case "md": return "w-80";
      case "lg": return "w-96";
      case "xl": return "w-[28rem]";
      default: return "w-80";
    }
  };

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 ${getPositionClass()} ${getSizeClass()} ${className}`}
        >
          <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-4">
            {showArrow && (
              <div className={`absolute w-2 h-2 bg-base-100 border border-base-300 transform rotate-45 ${
                position === "top" ? "top-full -mt-1 left-1/2 -translate-x-1/2 border-t-0 border-l-0" :
                position === "bottom" ? "bottom-full -mb-1 left-1/2 -translate-x-1/2 border-b-0 border-r-0" :
                position === "left" ? "left-full -ml-1 top-1/2 -translate-y-1/2 border-l-0 border-b-0" :
                "right-full -mr-1 top-1/2 -translate-y-1/2 border-r-0 border-t-0"
              }`} />
            )}
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// Tooltip Component
interface DaisyUITooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
}

export function DaisyUITooltip({
  content,
  children,
  position = "top",
  className = "",
  delay = 0
}: DaisyUITooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (delay > 0) {
      const id = setTimeout(() => setIsVisible(true), delay);
      setTimeoutId(id);
    } else {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const getPositionClass = () => {
    switch (position) {
      case "top":
        return "bottom-full mb-2";
      case "bottom":
        return "top-full mt-2";
      case "left":
        return "right-full mr-2";
      case "right":
        return "left-full ml-2";
      default:
        return "bottom-full mb-2";
    }
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div className={`absolute z-50 ${getPositionClass()} left-1/2 -translate-x-1/2 ${className}`}>
          <div className="bg-base-content text-base-100 text-xs rounded py-1 px-2 whitespace-nowrap">
            {content}
            <div className={`absolute w-2 h-2 bg-base-content transform rotate-45 ${
              position === "top" ? "top-full -mt-1 left-1/2 -translate-x-1/2" :
              position === "bottom" ? "bottom-full -mb-1 left-1/2 -translate-x-1/2" :
              position === "left" ? "left-full -ml-1 top-1/2 -translate-y-1/2" :
              "right-full -mr-1 top-1/2 -translate-y-1/2"
            }`} />
          </div>
        </div>
      )}
    </div>
  );
}

// Dropdown Popover
interface DropdownPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function DropdownPopover({
  trigger,
  children,
  label,
  className = ""
}: DropdownPopoverProps) {
  return (
    <div className={`dropdown ${className}`}>
      <div tabIndex={0} role="button" className="cursor-pointer">
        {trigger}
      </div>
      <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-[1]">
        {children}
      </ul>
    </div>
  );
}

// Context Menu Popover
interface ContextMenuPopoverProps {
  children: React.ReactNode;
  menuItems: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
  }>;
  className?: string;
}

export function ContextMenuPopover({
  children,
  menuItems,
  className = ""
}: ContextMenuPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const contextRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setPosition({ x: event.clientX, y: event.clientY });
    setIsOpen(true);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={contextRef}
      onContextMenu={handleContextMenu}
      className={className}
    >
      {children}
      
      {isOpen && (
        <div
          className="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-48"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                setIsOpen(false);
              }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-base-200 disabled:opacity-50 disabled:cursor-not-allowed ${item.className || ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
