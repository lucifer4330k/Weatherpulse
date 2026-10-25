import { AlertTriangle, AlertCircle, Info, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { WeatherDashboardData, WeatherAlert } from '../../types';

interface AlertsProps {
  data: WeatherDashboardData | null;
}

const SEVERITY_CONFIG: Record<WeatherAlert['severity'], { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: <Info className="w-5 h-5" />, label: 'Info' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: <AlertTriangle className="w-5 h-5" />, label: 'Warning' },
  severe: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: <AlertCircle className="w-5 h-5" />, label: 'Severe' },
  extreme: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: <AlertTriangle className="w-5 h-5" />, label: 'Extreme' },
};

const TYPE_ICONS: Record<WeatherAlert['type'], React.ReactNode> = {
  temperature: <span className="text-red-400">🌡️</span>,
  precipitation: <span className="text-blue-400">🌧️</span>,
  wind: <span className="text-green-400">💨</span>,
  pressure: <span className="text-yellow-400">📊</span>,
  uv: <span className="text-purple-400">☀️</span>,
};

export function Alerts({ data }: AlertsProps) {
  const alerts = data?.alerts || [];
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  if (alerts.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-neutral-300 font-medium">No Active Alerts</h3>
        <p className="text-neutral-500 text-sm mt-1">No weather alerts for this location at this time</p>
      </div>
    );
  }

  // Sort by severity
  const severityOrder = { extreme: 4, severe: 3, warning: 2, info: 1 };
  const sortedAlerts = [...alerts].sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-neutral-200 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Weather Alerts ({alerts.length})
        </h4>
        <span className="text-neutral-500 text-xs">
          {alerts.filter(a => a.severity === 'extreme').length} Extreme
          {' • '}
          {alerts.filter(a => a.severity === 'severe').length} Severe
          {' • '}
          {alerts.filter(a => a.severity === 'warning').length} Warning
        </span>
      </div>

      <div className="space-y-3">
        {sortedAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            isExpanded={expandedAlerts.has(alert.id)}
            onToggle={() => {
              const newSet = new Set(expandedAlerts);
              if (newSet.has(alert.id)) {
                newSet.delete(alert.id);
              } else {
                newSet.add(alert.id);
              }
              setExpandedAlerts(newSet);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert, isExpanded, onToggle }: { alert: WeatherAlert; isExpanded: boolean; onToggle: () => void }) {
  const config = SEVERITY_CONFIG[alert.severity];

  return (
    <div className={`glass-card border ${config.bg}`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">{TYPE_ICONS[alert.type]}{alert.title}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color} bg-opacity-20`}>
              {config.label}
            </span>
            <span className="text-neutral-500 text-xs ml-auto">
              {formatTimeRange(alert.startTime, alert.endTime)}
            </span>
          </div>
          <p className="text-neutral-300 text-sm">{alert.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-current" />
              Threshold: {alert.threshold}{alert.unit}
            </span>
            <span className="flex items-center gap-1">
              Current: <span className="font-medium text-white">{alert.currentValue}{alert.unit}</span>
            </span>
            {alert.regions.length > 0 && (
              <span className="flex items-center gap-1">
                Regions: <span className="font-medium text-white">{alert.regions.join(', ')}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-neutral-500">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-neutral-800/50 px-4 pb-4 bg-neutral-800/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-neutral-500">Alert Type</p>
              <p className="text-white capitalize">{alert.type}</p>
            </div>
            <div>
              <p className="text-neutral-500">Severity</p>
              <p className={`font-medium ${config.color}`}>{config.label}</p>
            </div>
            <div>
              <p className="text-neutral-500">Started</p>
              <p className="text-white">{formatDateTime(alert.startTime)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Expires</p>
              <p className="text-white">{alert.endTime ? formatDateTime(alert.endTime) : 'Ongoing'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeRange(start: string, end?: string): string {
  const startDate = new Date(start);
  const startStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (!end) return `Since ${startStr}`;
  const endDate = new Date(end);
  const endStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default Alerts;