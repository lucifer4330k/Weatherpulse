import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronDown, ChevronUp, Thermometer, CloudRain, Wind, Gauge, Sun } from 'lucide-react';
import { useState } from 'react';
import type { WeatherDashboardData, WeatherAlert } from '../../types';

interface AlertsProps {
  data: WeatherDashboardData | null;
}

const SEVERITY_CONFIG: Record<WeatherAlert['severity'], { color: string; borderAccent: string; icon: React.ReactNode; label: string }> = {
  info: { 
    color: 'text-[#7899B8]', 
    borderAccent: 'border-l-[#7899B8]', 
    icon: <Info className="w-4 h-4 text-[#7899B8]" />, 
    label: 'Advisory' 
  },
  warning: { 
    color: 'text-[#E7B75A]', 
    borderAccent: 'border-l-[#E7B75A]', 
    icon: <AlertTriangle className="w-4 h-4 text-[#E7B75A]" />, 
    label: 'Warning' 
  },
  severe: { 
    color: 'text-[#E07A5F]', 
    borderAccent: 'border-l-[#E07A5F]', 
    icon: <AlertCircle className="w-4 h-4 text-[#E07A5F]" />, 
    label: 'Severe' 
  },
  extreme: { 
    color: 'text-[#D9534F]', 
    borderAccent: 'border-l-[#D9534F]', 
    icon: <AlertTriangle className="w-4 h-4 text-[#D9534F]" />, 
    label: 'Extreme' 
  },
};

const TYPE_ICONS: Record<WeatherAlert['type'], React.ReactNode> = {
  temperature: <Thermometer className="w-3.5 h-3.5 text-[#E07A5F]" />,
  precipitation: <CloudRain className="w-3.5 h-3.5 text-[#7899B8]" />,
  wind: <Wind className="w-3.5 h-3.5 text-[#E7B75A]" />,
  pressure: <Gauge className="w-3.5 h-3.5 text-[#A3A3A3]" />,
  uv: <Sun className="w-3.5 h-3.5 text-[#E7B75A]" />,
};

export function Alerts({ data }: AlertsProps) {
  const alerts = data?.alerts || [];
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  if (alerts.length === 0) {
    return (
      <div className="bg-[#101010] border border-[#2A2A2A] rounded p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-[#3EA874]" />
        </div>
        <h3 className="text-[#F5F5F5] font-mono text-sm font-medium">No Active Meteorological Alerts</h3>
        <p className="text-[#737373] text-xs mt-1">All monitored parameters are within nominal thresholds</p>
      </div>
    );
  }

  // Sort by severity
  const severityOrder = { extreme: 4, severe: 3, warning: 2, info: 1 };
  const sortedAlerts = [...alerts].sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[#F5F5F5] text-xs font-mono uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-[#E7B75A]" />
          Active Bulletins ({alerts.length})
        </h4>
        <span className="text-[#737373] text-[11px] font-mono">
          {alerts.filter(a => a.severity === 'extreme').length} Extreme
          {' • '}
          {alerts.filter(a => a.severity === 'severe').length} Severe
          {' • '}
          {alerts.filter(a => a.severity === 'warning').length} Warning
        </span>
      </div>

      <div className="space-y-2">
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
    <div className={`bg-[#101010] border border-[#2A2A2A] border-l-2 ${config.borderAccent} rounded overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full p-3.5 flex items-start gap-3 text-left hover:bg-[#141414] transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-xs text-[#F5F5F5]">
              {TYPE_ICONS[alert.type]}
              {alert.title}
            </span>
            <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase tracking-wider font-semibold ${config.color} bg-[#171717] border border-[#2A2A2A]`}>
              {config.label}
            </span>
            <span className="text-[#737373] text-[10px] font-mono ml-auto">
              {formatTimeRange(alert.startTime, alert.endTime)}
            </span>
          </div>
          <p className="text-[#A3A3A3] text-xs leading-relaxed">{alert.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-[#737373] flex-wrap">
            <span>Threshold: {alert.threshold}{alert.unit}</span>
            <span>Current: <strong className="text-[#F5F5F5]">{alert.currentValue}{alert.unit}</strong></span>
            {alert.regions.length > 0 && (
              <span>Regions: {alert.regions.join(', ')}</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-[#737373] mt-1">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#2A2A2A] px-3.5 py-3 bg-[#141414] font-mono text-xs">
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="text-[#737373]">Category</p>
              <p className="text-[#F5F5F5] capitalize">{alert.type}</p>
            </div>
            <div>
              <p className="text-[#737373]">Severity Rating</p>
              <p className={config.color}>{config.label}</p>
            </div>
            <div>
              <p className="text-[#737373]">Effective Since</p>
              <p className="text-[#F5F5F5]">{formatDateTime(alert.startTime)}</p>
            </div>
            <div>
              <p className="text-[#737373]">Expiry</p>
              <p className="text-[#F5F5F5]">{alert.endTime ? formatDateTime(alert.endTime) : 'Continuous Monitoring'}</p>
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
  if (!end) return `Active since ${startStr}`;
  const endDate = new Date(end);
  const endStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default Alerts;