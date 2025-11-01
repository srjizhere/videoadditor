import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity, 
  Users, 
  Eye, 
  Heart, 
  Share2, 
  Download,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

// Enhanced Stats Component
interface EnhancedStatItem {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  trend?: 'up' | 'down' | 'stable';
  description?: string;
}

interface EnhancedStatsProps {
  stats: EnhancedStatItem[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  className?: string;
}

export function EnhancedStats({ 
  stats, 
  layout = 'horizontal', 
  className = '' 
}: EnhancedStatsProps) {
  const getLayoutClass = () => {
    switch (layout) {
      case 'vertical': return 'stats-vertical';
      case 'grid': return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
      default: return 'stats shadow';
    }
  };

  return (
    <div className={`${getLayoutClass()} ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="stat">
          <div className={`stat-figure text-${stat.color || 'primary'}`}>
            {stat.icon}
          </div>
          <div className="stat-title">{stat.label}</div>
          <div className={`stat-value text-${stat.color || 'primary'}`}>
            {stat.value}
          </div>
          {stat.change !== undefined && (
            <div className={`stat-desc ${
              stat.changeType === 'increase' ? 'text-success' :
              stat.changeType === 'decrease' ? 'text-error' :
              'text-base-content/70'
            }`}>
              <div className="flex items-center gap-1">
                {stat.changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : stat.changeType === 'decrease' ? (
                  <TrendingDown className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4" />
                )}
                {stat.change > 0 ? '+' : ''}{stat.change}%
              </div>
            </div>
          )}
          {stat.description && (
            <div className="stat-desc text-base-content/70">
              {stat.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Comparison Table Component
interface ComparisonItem {
  label: string;
  current: number | string;
  previous: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'currency' | 'percentage';
}

interface ComparisonTableProps {
  title: string;
  items: ComparisonItem[];
  className?: string;
}

export function ComparisonTable({ 
  title, 
  items, 
  className = '' 
}: ComparisonTableProps) {
  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value);
      case 'percentage':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="text-center">Current</th>
                <th className="text-center">Previous</th>
                <th className="text-center">Change</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="font-medium">{item.label}</td>
                  <td className="text-center font-semibold">
                    {formatValue(item.current, item.format)}
                  </td>
                  <td className="text-center text-base-content/70">
                    {formatValue(item.previous, item.format)}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${
                      item.changeType === 'increase' ? 'badge-success' :
                      item.changeType === 'decrease' ? 'badge-error' :
                      'badge-neutral'
                    }`}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  trend,
  className = ''
}: MetricCardProps) {
  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-base-content/70">{title}</h3>
            <p className="text-2xl font-bold text-base-content">{value}</p>
            {subtitle && (
              <p className="text-sm text-base-content/70">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`text-${color}`}>
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === 'up' ? (
              <TrendingUp className="w-4 h-4 text-success" />
            ) : trend.direction === 'down' ? (
              <TrendingDown className="w-4 h-4 text-error" />
            ) : (
              <Activity className="w-4 h-4 text-base-content/50" />
            )}
            <span className={`text-sm ${
              trend.direction === 'up' ? 'text-success' :
              trend.direction === 'down' ? 'text-error' :
              'text-base-content/70'
            }`}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Progress Metrics Component
interface ProgressMetricProps {
  label: string;
  value: number;
  max: number;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  showPercentage?: boolean;
  className?: string;
}

export function ProgressMetric({
  label,
  value,
  max,
  color = 'primary',
  showPercentage = true,
  className = ''
}: ProgressMetricProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        {showPercentage && (
          <span className="text-sm text-base-content/70">{percentage}%</span>
        )}
      </div>
      <progress 
        className={`progress progress-${color} w-full`} 
        value={value} 
        max={max}
      ></progress>
    </div>
  );
}

// Data List Component
interface DataListItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    className?: string;
  }>;
}

interface DataListProps {
  items: DataListItem[];
  className?: string;
  onItemClick?: (item: DataListItem) => void;
}

export function DataList({ 
  items, 
  className = '', 
  onItemClick 
}: DataListProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`card bg-base-100 shadow-sm hover:shadow-md transition-shadow ${
            onItemClick ? 'cursor-pointer' : ''
          }`}
          onClick={() => onItemClick?.(item)}
        >
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.icon && (
                  <div className="text-primary">
                    {item.icon}
                  </div>
                )}
                <div>
                  <h3 className="font-medium">{item.title}</h3>
                  {item.subtitle && (
                    <p className="text-sm text-base-content/70">{item.subtitle}</p>
                  )}
                  {item.description && (
                    <p className="text-sm text-base-content/50 mt-1">{item.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span className={`badge badge-sm badge-${item.badgeColor || 'primary'}`}>
                    {item.badge}
                  </span>
                )}
                {item.actions && (
                  <div className="flex items-center gap-1">
                    {item.actions.map((action, index) => (
                      <button
                        key={index}
                        className={`btn btn-sm btn-ghost ${action.className || ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        title={action.label}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// KPI Dashboard Component
interface KPIDashboardProps {
  title: string;
  kpis: Array<{
    label: string;
    value: string | number;
    target?: string | number;
    status: 'on-track' | 'behind' | 'ahead' | 'at-risk';
    trend?: {
      value: number;
      direction: 'up' | 'down' | 'stable';
    };
  }>;
  className?: string;
}

export function KPIDashboard({ 
  title, 
  kpis, 
  className = '' 
}: KPIDashboardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-success';
      case 'behind': return 'text-error';
      case 'ahead': return 'text-info';
      case 'at-risk': return 'text-warning';
      default: return 'text-base-content';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track': return <CheckCircle className="w-5 h-5" />;
      case 'behind': return <AlertCircle className="w-5 h-5" />;
      case 'ahead': return <TrendingUp className="w-5 h-5" />;
      case 'at-risk': return <Info className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, index) => (
            <div key={index} className="stat bg-base-200 rounded-lg">
              <div className="stat-title">{kpi.label}</div>
              <div className="stat-value text-primary">{kpi.value}</div>
              {kpi.target && (
                <div className="stat-desc text-base-content/70">
                  Target: {kpi.target}
                </div>
              )}
              <div className={`stat-desc ${getStatusColor(kpi.status)} flex items-center gap-1`}>
                {getStatusIcon(kpi.status)}
                <span className="capitalize">{kpi.status.replace('-', ' ')}</span>
              </div>
              {kpi.trend && (
                <div className="stat-desc flex items-center gap-1">
                  {kpi.trend.direction === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : kpi.trend.direction === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-error" />
                  ) : (
                    <Activity className="w-4 h-4 text-base-content/50" />
                  )}
                  <span className={
                    kpi.trend.direction === 'up' ? 'text-success' :
                    kpi.trend.direction === 'down' ? 'text-error' :
                    'text-base-content/70'
                  }>
                    {kpi.trend.value > 0 ? '+' : ''}{kpi.trend.value}%
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  className = ''
}: SummaryCardProps) {
  return (
    <div className={`card bg-base-100 shadow-lg ${className}`}>
      <div className="card-body text-center">
        {icon && (
          <div className={`text-${color} mb-2`}>
            {icon}
          </div>
        )}
        <h3 className="text-sm font-medium text-base-content/70">{title}</h3>
        <p className="text-3xl font-bold text-base-content">{value}</p>
        {subtitle && (
          <p className="text-sm text-base-content/70">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
