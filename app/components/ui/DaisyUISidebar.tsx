"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Upload, 
  Video, 
  Image as ImageIcon, 
  Settings, 
  User, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: SidebarItem[];
}

interface DaisyUISidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export default function DaisyUISidebar({ 
  isOpen, 
  onToggle, 
  className = "" 
}: DaisyUISidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const sidebarItems: SidebarItem[] = [
    {
      label: "Home",
      href: "/",
      icon: <Home className="w-5 h-5" />
    },
    {
      label: "Upload",
      href: "/upload",
      icon: <Upload className="w-5 h-5" />,
      children: [
        {
          label: "Upload Video",
          href: "/upload",
          icon: <Video className="w-4 h-4" />
        },
        {
          label: "Upload Image",
          href: "/upload?type=image",
          icon: <ImageIcon className="w-4 h-4" />
        }
      ]
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings className="w-5 h-5" />
    }
  ];

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.label);
    const active = isActive(item.href);

    return (
      <li key={item.label}>
        {hasChildren ? (
          <>
            <button
              onClick={() => toggleExpanded(item.label)}
              className={`flex items-center justify-between w-full p-2 rounded-lg hover:bg-base-200 transition-colors ${
                active ? 'bg-primary text-primary-content' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`} 
              />
            </button>
            {isExpanded && item.children && (
              <ul className="menu menu-sm ml-4 mt-1">
                {item.children.map(child => renderSidebarItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : (
          <Link
            href={item.href}
            className={`flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors ${
              active ? 'bg-primary text-primary-content' : ''
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
            {item.badge && (
              <span className="badge badge-sm badge-primary ml-auto">
                {item.badge}
              </span>
            )}
          </Link>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`drawer-side z-50 ${className}`}>
        <label 
          htmlFor="sidebar-toggle" 
          className="drawer-overlay"
          onClick={onToggle}
        />
        <aside className={`min-h-full w-64 bg-base-100 border-r border-base-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}>
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">MediaEditor</span>
              </div>
              <button
                onClick={onToggle}
                className="btn btn-ghost btn-sm btn-circle lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation */}
            <ul className="menu menu-vertical w-full">
              {sidebarItems.map(item => renderSidebarItem(item))}
            </ul>

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-base-300">
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs opacity-70">john@example.com</p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm w-full justify-start gap-3 mt-2 text-error hover:bg-error hover:text-error-content">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

// Sidebar Toggle Button Component
export function SidebarToggle({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="btn btn-ghost btn-square lg:hidden"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

// Layout with Sidebar
export function SidebarLayout({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`drawer lg:drawer-open ${className}`}>
      <input 
        id="sidebar-toggle" 
        type="checkbox" 
        className="drawer-toggle" 
        checked={sidebarOpen}
        onChange={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="drawer-content flex flex-col">
        {/* Top Navigation */}
        <div className="navbar bg-base-100 shadow-lg">
          <div className="navbar-start">
            <SidebarToggle onToggle={() => setSidebarOpen(!sidebarOpen)} />
            <Link href="/" className="btn btn-ghost text-xl">
              MediaEditor Pro
            </Link>
          </div>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
      
      {/* Sidebar */}
      <DaisyUISidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
    </div>
  );
}
