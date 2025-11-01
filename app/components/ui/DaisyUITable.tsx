import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download, Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;
type TableSize = 'xs' | 'sm' | 'md' | 'lg';
type TableVariant = 'default' | 'striped' | 'hover' | 'zebra';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DaisyUITableProps<T> {
  data: T[];
  columns: Column<T>[];
  size?: TableSize;
  variant?: TableVariant;
  className?: string;
  searchable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  onRowSelect?: (selectedRows: T[]) => void;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    className?: string;
  }>;
  emptyMessage?: string;
  loading?: boolean;
}

export default function DaisyUITable<T extends Record<string, unknown>>({
  data,
  columns,
  size = 'md',
  variant = 'default',
  className = '',
  searchable = false,
  sortable = true,
  filterable = false,
  pagination = false,
  pageSize = 10,
  onRowClick,
  onRowSelect,
  actions = [],
  emptyMessage = 'No data available',
  loading = false
}: DaisyUITableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row =>
      columns.some(column => {
        const value = row[column.key as keyof T];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn as keyof T];
      const bValue = b[sortColumn as keyof T];

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (columnKey: string) => {
    if (!sortable) return;
    
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleRowSelect = (row: T, checked: boolean) => {
    if (!onRowSelect) return;
    
    const newSelectedRows = checked
      ? [...selectedRows, row]
      : selectedRows.filter(r => r !== row);
    
    setSelectedRows(newSelectedRows);
    onRowSelect(newSelectedRows);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onRowSelect) return;
    
    const newSelectedRows = checked ? [...paginatedData] : [];
    setSelectedRows(newSelectedRows);
    onRowSelect(newSelectedRows);
  };

  const getTableClass = () => {
    const baseClass = 'table';
    const sizeClass = `table-${size}`;
    const variantClass = variant === 'default' ? '' : `table-${variant}`;
    
    return `${baseClass} ${sizeClass} ${variantClass} ${className}`.trim();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-wrap gap-4 mb-4">
          {searchable && (
            <div className="form-control">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Search..."
                  className="input input-bordered"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button className="btn btn-square">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {filterable && (
            <div className="dropdown">
              <div tabIndex={0} role="button" className="btn btn-outline">
                <Filter className="w-4 h-4" />
                Filters
              </div>
              <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><a>Filter 1</a></li>
                <li><a>Filter 2</a></li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={getTableClass()}>
          <thead>
            <tr>
              {onRowSelect && (
                <th>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={`${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'} ${
                    column.sortable !== false && sortable ? 'cursor-pointer hover:bg-base-200' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key as string)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable !== false && sortable && sortColumn === column.key && (
                      <span className="text-primary">
                        {sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : null}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onRowSelect ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="text-center py-8">
                  <div className="text-base-content/50">
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-base-200' : ''} ${
                    selectedRows.includes(row) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {onRowSelect && (
                    <td>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedRows.includes(row)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(row, e.target.checked);
                        }}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key as string}
                      className={`${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {column.render
                        ? column.render(row[column.key as keyof T], row)
                        : row[column.key as keyof T]?.toString() || '-'}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td>
                      <div className="flex items-center gap-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            className={`btn btn-sm btn-ghost ${action.className || ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row);
                            }}
                            title={action.label}
                          >
                            {action.icon || <MoreHorizontal className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`join-item btn btn-sm ${currentPage === page ? 'btn-active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            
            <button
              className="join-item btn btn-sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Data Grid Component
interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  cardComponent: (item: T) => React.ReactNode;
  viewMode?: 'table' | 'grid' | 'list';
  onViewModeChange?: (mode: 'table' | 'grid' | 'list') => void;
  className?: string;
}

export function DataGrid<T extends Record<string, unknown>>({
  data,
  columns,
  cardComponent,
  viewMode = 'grid',
  onViewModeChange,
  className = ''
}: DataGridProps<T>) {
  return (
    <div className={`w-full ${className}`}>
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex justify-end mb-4">
          <div className="btn-group">
            <button
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-active' : ''}`}
              onClick={() => onViewModeChange('table')}
            >
              Table
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-active' : ''}`}
              onClick={() => onViewModeChange('grid')}
            >
              Grid
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
              onClick={() => onViewModeChange('list')}
            >
              List
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        <DaisyUITable data={data} columns={columns} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((item, index) => (
            <div key={index}>
              {cardComponent(item)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="card bg-base-100 shadow-sm">
              {cardComponent(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Stats Component
interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
}

interface StatsProps {
  stats: StatItem[];
  className?: string;
}

export function Stats({ stats, className = '' }: StatsProps) {
  return (
    <div className={`stats shadow ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="stat">
          <div className="stat-figure text-primary">
            {stat.icon}
          </div>
          <div className="stat-title">{stat.label}</div>
          <div className="stat-value text-primary">{stat.value}</div>
          {stat.change !== undefined && (
            <div className={`stat-desc ${
              stat.changeType === 'increase' ? 'text-success' :
              stat.changeType === 'decrease' ? 'text-error' :
              'text-base-content/70'
            }`}>
              {stat.change > 0 ? '+' : ''}{stat.change}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Timeline Component
interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  status?: 'completed' | 'current' | 'pending' | 'error';
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className = '' }: TimelineProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'current': return 'text-primary';
      case 'error': return 'text-error';
      case 'pending': return 'text-base-content/50';
      default: return 'text-base-content';
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'current': return 'bg-primary';
      case 'error': return 'bg-error';
      case 'pending': return 'bg-base-300';
      default: return 'bg-base-300';
    }
  };

  return (
    <div className={`timeline ${className}`}>
      {items.map((item, index) => (
        <div key={item.id} className="timeline-item">
          <div className={`timeline-start ${getStatusBg(item.status)} text-white rounded-full w-4 h-4 flex items-center justify-center`}>
            {item.icon}
          </div>
          <div className="timeline-middle">
            <div className={`timeline-line ${getStatusBg(item.status)}`}></div>
          </div>
          <div className="timeline-end timeline-box">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-semibold ${getStatusColor(item.status)}`}>
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-sm text-base-content/70 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="text-xs text-base-content/50">
                {item.timestamp.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
