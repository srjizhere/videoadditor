"use client";

import React from 'react';
import DaisyUIThemeController, { 
  ThemeDemo, 
  ThemePreview, 
  ThemeCustomizer 
} from '../components/ui/DaisyUIThemeController';
import { 
  EnhancedStats, 
  ComparisonTable, 
  MetricCard, 
  DataList,
  KPIDashboard 
} from '../components/ui/DaisyUIDataDisplay';
import { 
  Video, 
  Image as ImageIcon, 
  Users, 
  Eye, 
  Heart, 
  Share2, 
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Star,
  Calendar,
  BarChart3,
  Activity,
  Info
} from 'lucide-react';

export default function ThemeDemoPage() {
  const statsData = [
    {
      label: 'Total Videos',
      value: '1,234',
      change: 12.5,
      changeType: 'increase' as const,
      icon: <Video className="w-6 h-6" />,
      color: 'primary' as const,
      description: 'Videos uploaded this month'
    },
    {
      label: 'Total Images',
      value: '5,678',
      change: 8.2,
      changeType: 'increase' as const,
      icon: <ImageIcon className="w-6 h-6" />,
      color: 'secondary' as const,
      description: 'Images processed'
    },
    {
      label: 'Active Users',
      value: '2.5K',
      change: 15.3,
      changeType: 'increase' as const,
      icon: <Users className="w-6 h-6" />,
      color: 'accent' as const,
      description: 'Monthly active users'
    },
    {
      label: 'Total Views',
      value: '1.2M',
      change: 22.1,
      changeType: 'increase' as const,
      icon: <Eye className="w-6 h-6" />,
      color: 'success' as const,
      description: 'Content views this month'
    }
  ];

  const comparisonData = [
    {
      label: 'Video Views',
      current: 125000,
      previous: 110000,
      change: 13.6,
      changeType: 'increase' as const,
      format: 'number' as const
    },
    {
      label: 'Image Views',
      current: 89000,
      previous: 95000,
      change: -6.3,
      changeType: 'decrease' as const,
      format: 'number' as const
    },
    {
      label: 'User Engagement',
      current: 78.5,
      previous: 72.1,
      change: 8.9,
      changeType: 'increase' as const,
      format: 'percentage' as const
    },
    {
      label: 'Revenue',
      current: 12500,
      previous: 11200,
      change: 11.6,
      changeType: 'increase' as const,
      format: 'currency' as const
    }
  ];

  const kpiData = [
    {
      label: 'Content Quality Score',
      value: '8.7/10',
      target: '9.0/10',
      status: 'on-track' as const,
      trend: {
        value: 5.2,
        direction: 'up' as const
      }
    },
    {
      label: 'User Satisfaction',
      value: '94%',
      target: '95%',
      status: 'ahead' as const,
      trend: {
        value: 2.1,
        direction: 'up' as const
      }
    },
    {
      label: 'System Uptime',
      value: '99.8%',
      target: '99.9%',
      status: 'at-risk' as const,
      trend: {
        value: -0.1,
        direction: 'down' as const
      }
    }
  ];

  const listData = [
    {
      id: '1',
      title: 'Video Processing Complete',
      subtitle: 'Amazing Nature Documentary',
      description: 'Your video has been successfully processed and is ready for viewing.',
      icon: <CheckCircle className="w-5 h-5" />,
      badge: 'Completed',
      badgeColor: 'success' as const,
      actions: [
        {
          label: 'View',
          icon: <Eye className="w-4 h-4" />,
          onClick: () => console.log('View video'),
          className: 'btn-primary'
        },
        {
          label: 'Download',
          icon: <Download className="w-4 h-4" />,
          onClick: () => console.log('Download video'),
          className: 'btn-secondary'
        }
      ]
    },
    {
      id: '2',
      title: 'Image Upload Failed',
      subtitle: 'Sunset Landscape.jpg',
      description: 'The image upload failed due to file size exceeding the limit.',
      icon: <AlertCircle className="w-5 h-5" />,
      badge: 'Error',
      badgeColor: 'error' as const,
      actions: [
        {
          label: 'Retry',
          icon: <Activity className="w-4 h-4" />,
          onClick: () => console.log('Retry upload'),
          className: 'btn-warning'
        }
      ]
    },
    {
      id: '3',
      title: 'New User Registration',
      subtitle: 'john.doe@example.com',
      description: 'A new user has registered and is awaiting verification.',
      icon: <Users className="w-5 h-5" />,
      badge: 'Pending',
      badgeColor: 'warning' as const,
      actions: [
        {
          label: 'Approve',
          icon: <CheckCircle className="w-4 h-4" />,
          onClick: () => console.log('Approve user'),
          className: 'btn-success'
        },
        {
          label: 'Review',
          icon: <Eye className="w-4 h-4" />,
          onClick: () => console.log('Review user'),
          className: 'btn-info'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200 shadow-lg">
        <div className="navbar-start">
          <h1 className="text-xl font-bold">Theme Demo</h1>
        </div>
        <div className="navbar-end">
          <DaisyUIThemeController showPreview={true} showSystemTheme={true} />
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-8">
        {/* Theme Controller Section */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Theme Controller</h2>
            <p className="text-base-content/70 mb-4">
              Switch between different DaisyUI themes and see how components adapt.
            </p>
            <div className="flex justify-center">
              <DaisyUIThemeController showPreview={true} showSystemTheme={true} />
            </div>
          </div>
        </section>

        {/* Theme Previews */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Theme Previews</h2>
            <p className="text-base-content/70 mb-4">
              See how different themes look with sample components.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ThemePreview theme="light" />
              <ThemePreview theme="dark" />
              <ThemePreview theme="cupcake" />
              <ThemePreview theme="synthwave" />
              <ThemePreview theme="forest" />
              <ThemePreview theme="luxury" />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Enhanced Statistics</h2>
            <p className="text-base-content/70 mb-4">
              Statistics components that adapt to the current theme.
            </p>
            <EnhancedStats 
              stats={statsData}
              layout="horizontal"
            />
          </div>
        </section>

        {/* Comparison Table */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Performance Comparison</h2>
            <p className="text-base-content/70 mb-4">
              Comparison table showing metrics across different periods.
            </p>
            <ComparisonTable 
              title="Monthly Performance"
              items={comparisonData}
            />
          </div>
        </section>

        {/* KPI Dashboard */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">KPI Dashboard</h2>
            <p className="text-base-content/70 mb-4">
              Key performance indicators with status tracking.
            </p>
            <KPIDashboard 
              title="Key Performance Indicators"
              kpis={kpiData}
            />
          </div>
        </section>

        {/* Metric Cards */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Metric Cards</h2>
            <p className="text-base-content/70 mb-4">
              Individual metric cards with trend indicators.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Views"
                value="1.2M"
                subtitle="This month"
                icon={<Eye className="w-6 h-6" />}
                color="primary"
                trend={{
                  value: 12.5,
                  direction: 'up'
                }}
              />
              <MetricCard
                title="User Engagement"
                value="78.5%"
                subtitle="Average"
                icon={<Users className="w-6 h-6" />}
                color="success"
                trend={{
                  value: 8.2,
                  direction: 'up'
                }}
              />
              <MetricCard
                title="Content Quality"
                value="8.7/10"
                subtitle="Rating"
                icon={<Star className="w-6 h-6" />}
                color="warning"
                trend={{
                  value: -2.1,
                  direction: 'down'
                }}
              />
              <MetricCard
                title="System Health"
                value="99.8%"
                subtitle="Uptime"
                icon={<Activity className="w-6 h-6" />}
                color="info"
                trend={{
                  value: 0.5,
                  direction: 'up'
                }}
              />
            </div>
          </div>
        </section>

        {/* Data List */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Activity Feed</h2>
            <p className="text-base-content/70 mb-4">
              Recent activities and notifications with actions.
            </p>
            <DataList 
              items={listData}
              onItemClick={(item) => console.log('Item clicked:', item)}
            />
          </div>
        </section>

        {/* Custom Theme Builder */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Custom Theme Builder</h2>
            <p className="text-base-content/70 mb-4">
              Create and customize your own theme colors.
            </p>
            <ThemeCustomizer />
          </div>
        </section>

        {/* Component Showcase */}
        <section className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h2 className="card-title">Component Showcase</h2>
            <p className="text-base-content/70 mb-4">
              Various DaisyUI components in the current theme.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Buttons */}
              <div className="space-y-2">
                <h3 className="font-semibold">Buttons</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">Primary</button>
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-accent">Accent</button>
                  <button className="btn btn-ghost">Ghost</button>
                </div>
              </div>

              {/* Badges */}
              <div className="space-y-2">
                <h3 className="font-semibold">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-primary">Primary</span>
                  <span className="badge badge-secondary">Secondary</span>
                  <span className="badge badge-accent">Accent</span>
                  <span className="badge badge-success">Success</span>
                </div>
              </div>

              {/* Alerts */}
              <div className="space-y-2">
                <h3 className="font-semibold">Alerts</h3>
                <div className="space-y-2">
                  <div className="alert alert-info">
                    <Info className="w-4 h-4" />
                    <span>Info alert</span>
                  </div>
                  <div className="alert alert-success">
                    <CheckCircle className="w-4 h-4" />
                    <span>Success alert</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <h3 className="font-semibold">Progress</h3>
                <div className="space-y-2">
                  <progress className="progress progress-primary w-full" value="70" max="100"></progress>
                  <progress className="progress progress-secondary w-full" value="50" max="100"></progress>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                <h3 className="font-semibold">Cards</h3>
                <div className="card bg-base-200 shadow-sm">
                  <div className="card-body p-3">
                    <h4 className="card-title text-sm">Sample Card</h4>
                    <p className="text-xs">Card content</p>
                  </div>
                </div>
              </div>

              {/* Forms */}
              <div className="space-y-2">
                <h3 className="font-semibold">Forms</h3>
                <div className="space-y-2">
                  <input type="text" placeholder="Input" className="input input-bordered input-sm w-full" />
                  <select className="select select-bordered select-sm w-full">
                    <option>Select option</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
