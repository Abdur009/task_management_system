import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsService } from '../services/api';
import { io } from 'socket.io-client';

const STATUS_COLORS = {
  Pending: '#f59e0b',
  'In Progress': '#3b82f6',
  Completed: '#10b981'
};

function PieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No tasks yet
      </div>
    );
  }

  const size = 160;
  const center = size / 2;
  const radius = 60;

  let cumulativeAngle = -90;
  const slices = data.map((item) => {
    const angle = (item.count / total) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...item,
      startAngle,
      angle,
      color: STATUS_COLORS[item.status] || '#94a3b8'
    };
  });

  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  };

  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', cx, cy,
      'L', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((slice, idx) => {
          if (slice.count === 0) return null;
          const path = slice.angle >= 360
            ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius} Z`
            : describeArc(center, center, radius, slice.startAngle, slice.startAngle + slice.angle);
          return (
            <path
              key={idx}
              d={path}
              fill={slice.color}
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}
        <circle cx={center} cy={center} r={radius * 0.5} fill="#fff" />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold fill-gray-800"
        >
          {total}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-gray-600">
              {slice.status}: {slice.count} ({slice.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ data, range }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No trend data available
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap((d) => [d.created, d.completed, d.overdue]),
    1
  );

  const chartWidth = 600;
  const chartHeight = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const barWidth = Math.min(innerWidth / data.length / 4, 20);
  const groupWidth = barWidth * 3 + 10;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return range === 'weekly'
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} className="mx-auto">
        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        {/* X-axis */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, idx) => {
          const y = padding.top + innerHeight * (1 - ratio);
          const value = Math.round(maxValue * ratio);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-500"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const x = padding.left + (idx * innerWidth) / data.length + 10;
          const createdHeight = (item.created / maxValue) * innerHeight;
          const completedHeight = (item.completed / maxValue) * innerHeight;
          const overdueHeight = (item.overdue / maxValue) * innerHeight;

          return (
            <g key={idx}>
              {/* Created bar */}
              <rect
                x={x}
                y={chartHeight - padding.bottom - createdHeight}
                width={barWidth}
                height={createdHeight}
                fill="#6366f1"
                rx="2"
              />
              {/* Completed bar */}
              <rect
                x={x + barWidth + 2}
                y={chartHeight - padding.bottom - completedHeight}
                width={barWidth}
                height={completedHeight}
                fill="#10b981"
                rx="2"
              />
              {/* Overdue bar */}
              <rect
                x={x + (barWidth + 2) * 2}
                y={chartHeight - padding.bottom - overdueHeight}
                width={barWidth}
                height={overdueHeight}
                fill="#ef4444"
                rx="2"
              />
              {/* X-axis label */}
              <text
                x={x + groupWidth / 2}
                y={chartHeight - padding.bottom + 16}
                textAnchor="middle"
                className="text-xs fill-gray-500"
              >
                {formatDate(item.date)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-500" />
          <span className="text-sm text-gray-600">Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-sm text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-sm text-gray-600">Overdue</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtext }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ onBack }) {
  const [summary, setSummary] = useState(null);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [trends, setTrends] = useState({ range: 'weekly', data: [] });
  const [trendRange, setTrendRange] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const [summaryData, breakdownData, trendsData] = await Promise.all([
        analyticsService.getSummary(),
        analyticsService.getStatusBreakdown(),
        analyticsService.getTrends(trendRange)
      ]);

      setSummary(summaryData);
      setStatusBreakdown(breakdownData);
      setTrends(trendsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [trendRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Socket connection for live updates
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    const socket = io('http://localhost:3000', {
      auth: { token }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Analytics socket connected');
    });

    // Listen for task-related notifications to refresh analytics
    socket.on('notification:new', (notification) => {
      if (
        notification.type === 'task_created' ||
        notification.type === 'task_updated' ||
        notification.type === 'task_deleted' ||
        notification.type === 'task_progress' ||
        notification.type === 'task_shared'
      ) {
        fetchAnalytics();
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [fetchAnalytics]);

  const handleTrendRangeChange = async (newRange) => {
    setTrendRange(newRange);
    try {
      const trendsData = await analyticsService.getTrends(newRange);
      setTrends(trendsData);
    } catch (err) {
      console.error('Error fetching trends:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </span>
              <button
                onClick={fetchAnalytics}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Tasks"
            value={summary?.totalTasks || 0}
            color="text-indigo-600"
            icon={
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            title="Completed"
            value={summary?.completedTasks || 0}
            color="text-green-600"
            subtext={summary?.totalTasks ? `${Math.round((summary.completedTasks / summary.totalTasks) * 100)}% completion rate` : null}
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="In Progress"
            value={summary?.inProgressTasks || 0}
            color="text-blue-600"
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <StatCard
            title="Overdue"
            value={summary?.overdueTasks || 0}
            color="text-red-600"
            icon={
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Weekly/Monthly Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-500">Created This Week</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{summary?.tasksCreatedThisWeek || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-500">Completed This Week</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary?.tasksCompletedThisWeek || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-500">Created This Month</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{summary?.tasksCreatedThisMonth || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-500">Completed This Month</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{summary?.tasksCompletedThisMonth || 0}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Breakdown Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
            <PieChart data={statusBreakdown} />
          </div>

          {/* Trends Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Task Trends</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTrendRangeChange('weekly')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    trendRange === 'weekly'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => handleTrendRangeChange('monthly')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    trendRange === 'monthly'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            <TrendChart data={trends.data} range={trendRange} />
          </div>
        </div>

        {/* Pending Tasks Indicator */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Tasks Overview</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                style={{
                  width: summary?.totalTasks
                    ? `${Math.round((summary.completedTasks / summary.totalTasks) * 100)}%`
                    : '0%'
                }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600 min-w-[80px]">
              {summary?.completedTasks || 0} / {summary?.totalTasks || 0}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-amber-500">{summary?.pendingTasks || 0}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{summary?.inProgressTasks || 0}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{summary?.completedTasks || 0}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
