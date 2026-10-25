import { Clock, Database, Cloud, Wifi, WifiOff, Shield } from 'lucide-react';
import type { WeatherDashboardData } from '../../types';

interface DataFreshnessProps {
  data: WeatherDashboardData | null;
}

export function DataFreshness({ data }: DataFreshnessProps) {
  if (!data) return null;

  const lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : new Date();
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  let freshnessLabel: string;
  let freshnessColor: string;
  let freshnessIcon: React.ReactNode;

  if (diffMins < 5) {
    freshnessLabel = 'Just now';
    freshnessColor = 'text-green-400';
    freshnessIcon = <Wifi className="w-4 h-4" />;
  } else if (diffMins < 15) {
    freshnessLabel = `${diffMins} minutes ago`;
    freshnessColor = 'text-green-400';
    freshnessIcon = <Wifi className="w-4 h-4" />;
  } else if (diffMins < 60) {
    freshnessLabel = `${diffMins} minutes ago`;
    freshnessColor = 'text-yellow-400';
    freshnessIcon = <Wifi className="w-4 h-4" />;
  } else if (diffHours < 6) {
    freshnessLabel = `${diffHours} hours ago`;
    freshnessColor = 'text-yellow-400';
    freshnessIcon = <Wifi className="w-4 h-4" />;
  } else if (diffHours < 24) {
    freshnessLabel = `${diffHours} hours ago`;
    freshnessColor = 'text-orange-400';
    freshnessIcon = <WifiOff className="w-4 h-4" />;
  } else {
    freshnessLabel = `${Math.floor(diffHours / 24)} days ago`;
    freshnessColor = 'text-red-400';
    freshnessIcon = <WifiOff className="w-4 h-4" />;
  }

  const sourceLabels: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    'open-meteo': {
      label: 'Open-Meteo',
      icon: <Cloud className="w-4 h-4" />,
      description: 'Weather model forecast',
    },
    'cassandra': {
      label: 'Cassandra',
      icon: <Database className="w-4 h-4" />,
      description: 'Historical observations',
    },
    'mixed': {
      label: 'Mixed Sources',
      icon: <Shield className="w-4 h-4" />,
      description: 'Combined model & observed data',
    },
  };

  const sourceInfo = sourceLabels[data.dataSource] || sourceLabels['open-meteo'];

  return (
    <div className="glass-card p-4 border-t border-neutral-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${freshnessColor}/20`}>
            {freshnessIcon}
          </div>
          <div>
            <p className="text-white font-medium text-sm">Data Freshness</p>
            <p className={`text-sm ${freshnessColor}`}>Last updated: {freshnessLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
            {sourceInfo.icon}
            <span className="font-medium text-white">{sourceInfo.label}</span>
          </div>
        </div>
      </div>
      <p className="text-neutral-500 text-xs mt-3 ml-12">{sourceInfo.description}</p>

      {/* Cache status */}
      <div className="mt-3 pt-3 border-t border-neutral-800/30 flex items-center justify-between text-xs text-neutral-500">
        <span>Next auto-refresh: ~{getNextRefreshMinutes(data.dataSource)} min</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Cached for {getCacheDuration(data.dataSource)} min
        </span>
      </div>
    </div>
  );
}

function getNextRefreshMinutes(source: string): number {
  switch (source) {
    case 'open-meteo': return 10;
    case 'cassandra': return 60;
    case 'mixed': return 10;
    default: return 10;
  }
}

function getCacheDuration(source: string): number {
  switch (source) {
    case 'open-meteo': return 10;
    case 'cassandra': return 60;
    case 'mixed': return 10;
    default: return 10;
  }
}

export default DataFreshness;