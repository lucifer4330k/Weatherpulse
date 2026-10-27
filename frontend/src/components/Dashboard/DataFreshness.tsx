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
    freshnessLabel = 'Nominal (live)';
    freshnessColor = 'text-[#3EA874]';
    freshnessIcon = <Wifi className="w-3.5 h-3.5 text-[#3EA874]" />;
  } else if (diffMins < 15) {
    freshnessLabel = `${diffMins}m ago`;
    freshnessColor = 'text-[#3EA874]';
    freshnessIcon = <Wifi className="w-3.5 h-3.5 text-[#3EA874]" />;
  } else if (diffMins < 60) {
    freshnessLabel = `${diffMins}m ago`;
    freshnessColor = 'text-[#E7B75A]';
    freshnessIcon = <Wifi className="w-3.5 h-3.5 text-[#E7B75A]" />;
  } else if (diffHours < 6) {
    freshnessLabel = `${diffHours}h ago`;
    freshnessColor = 'text-[#E7B75A]';
    freshnessIcon = <Wifi className="w-3.5 h-3.5 text-[#E7B75A]" />;
  } else if (diffHours < 24) {
    freshnessLabel = `${diffHours}h ago (stale)`;
    freshnessColor = 'text-[#E07A5F]';
    freshnessIcon = <WifiOff className="w-3.5 h-3.5 text-[#E07A5F]" />;
  } else {
    freshnessLabel = `${Math.floor(diffHours / 24)}d ago (archive)`;
    freshnessColor = 'text-[#D9534F]';
    freshnessIcon = <WifiOff className="w-3.5 h-3.5 text-[#D9534F]" />;
  }

  const sourceLabels: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    'open-meteo': {
      label: 'Open-Meteo Model',
      icon: <Cloud className="w-3.5 h-3.5 text-[#E7B75A]" />,
      description: 'Numerical Weather Prediction (NWP) model',
    },
    'cassandra': {
      label: 'Cassandra Storage',
      icon: <Database className="w-3.5 h-3.5 text-[#3EA874]" />,
      description: 'Real-time telemetry ingested via Spark / Kafka pipeline',
    },
    'mixed': {
      label: 'Hybrid Pipeline',
      icon: <Shield className="w-3.5 h-3.5 text-[#7899B8]" />,
      description: 'Ensemble stream of observed station records and model forecast',
    },
  };

  const sourceInfo = sourceLabels[data.dataSource] || sourceLabels['open-meteo'];

  return (
    <div className="bg-[#101010] border border-[#2A2A2A] rounded p-3.5 text-xs font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#171717] border border-[#2A2A2A] flex items-center justify-center">
            {freshnessIcon}
          </div>
          <div>
            <p className="text-[#F5F5F5] font-medium text-xs">Pipeline Ingest Status</p>
            <p className={`text-[11px] ${freshnessColor}`}>Updated: {freshnessLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#171717] border border-[#2A2A2A] text-[11px] text-[#A3A3A3]">
          {sourceInfo.icon}
          <span>{sourceInfo.label}</span>
        </div>
      </div>
      <p className="text-[#737373] text-[10px] mt-2 pl-9">{sourceInfo.description}</p>

      {/* Cache & refresh status */}
      <div className="mt-2.5 pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] text-[#737373]">
        <span>{data.dataSource === 'open-meteo' ? 'On-demand model reading' : 'Scheduled collection: ~30 min'}</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#E7B75A]" />
          Client stale after 10 min
        </span>
      </div>
    </div>
  );
}

export default DataFreshness;
