import React from 'react';
import {
  YAxis,
  XAxis,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ReferenceArea
} from 'recharts';
import { SystemStatus } from '../types';
import { THEME } from '../constants';

interface AnalyticsPanelProps {
  data: { time: number; value: number }[];
  status: SystemStatus;
  threshold: number;
  isTactileMode: boolean;
}

export const AnalyticsPanel = React.memo<AnalyticsPanelProps>(({ data, status, threshold, isTactileMode }) => {
  const isCritical = status === SystemStatus.CRITICAL;
  const currentVal = data[data.length - 1]?.value || 0;

  const mainColor = isTactileMode ? '#fbbf24' : THEME.cyan; // Amber or Cyan
  const limitColor = isTactileMode ? '#ffffff' : '#ff003c';
  const labelText = isTactileMode ? 'OBSTACLE_WARN' : 'SAFETY_LIMIT';

  const delta = threshold - currentVal;
  const isApproaching = delta < 20 && delta > 0;

  return (
    <div className={`relative w-80 bg-black/40 border backdrop-blur-2xl p-5 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-700 rounded-sm overflow-hidden
        ${isTactileMode ? 'border-orange-500/40' : 'border-cyan-500/40'}
        ${isApproaching ? 'ring-1 ring-orange-500/30' : ''}`}>
      
      {/* Decorative Corner Element */}
      <div className={`absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 opacity-50 ${isTactileMode ? 'border-orange-500' : 'border-cyan-500'}`} />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full animate-pulse ${isCritical ? 'bg-red-500 shadow-[0_0_8px_#ff003c]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`} />
            <span className={`text-[8px] uppercase tracking-[0.3em] font-black ${isTactileMode ? 'text-orange-500/70' : 'text-cyan-500/70'}`}>
              Live Telemetry Stream
            </span>
          </div>
          <span className="text-sm font-black text-white/90 tracking-tighter uppercase font-mono">
            {isTactileMode ? 'Collision_Vector_X' : 'Differential_Angle_Σ'}
          </span>
        </div>

        <div className="text-right">
          <div className={`text-3xl font-mono font-black tracking-tighter tabular-nums leading-none ${isCritical ? 'text-red-500' : (isApproaching ? 'text-orange-400' : 'text-white')}`}>
            {currentVal.toFixed(1)}°
          </div>
          <div className={`text-[9px] font-mono font-bold mt-2 uppercase tracking-tight ${delta < 0 ? 'text-red-400' : 'text-white/40'}`}>
             Δ {delta.toFixed(1)}° {delta >= 0 ? 'Headroom' : 'Overrun'}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-28 w-full relative group">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mainColor} stopOpacity={0.4} />
                <stop offset="60%" stopColor={mainColor} stopOpacity={0.1} />
                <stop offset="100%" stopColor={mainColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <YAxis domain={[0, 200]} hide />
            <XAxis dataKey="time" hide />

            <ReferenceLine
              y={threshold}
              stroke={limitColor}
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={mainColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVal)"
              isAnimationActive={false}
              baseLine={0}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* HUD-style Label Overlay */}
        <div className="absolute top-0 left-0 text-[7px] font-mono text-white/20 uppercase tracking-widest vertical-text select-none">
          Data_Scale: 0-200deg
        </div>
        
        {isCritical && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 backdrop-blur-sm pointer-events-none border border-red-500/50">
            <span className="text-[10px] font-black text-white bg-red-600 px-3 py-1 animate-bounce shadow-2xl">
              SYSTEM_FAULT: LIMIT_EXCEEDED
            </span>
          </div>
        )}
      </div>

      {/* Numerical Data Strip */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
        <div className="flex flex-col">
          <span className="text-[7px] text-white/30 uppercase font-black tracking-wide">Min</span>
          <span className="text-[10px] font-mono text-white/70">{(Math.min(...data.map(d => d.value)) ?? 0).toFixed(1)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] text-white/30 uppercase font-black tracking-wide">Max</span>
          <span className="text-[10px] font-mono text-white/70">{(Math.max(...data.map(d => d.value)) ?? 0).toFixed(1)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] text-white/30 uppercase font-black tracking-wide">Avg</span>
          <span className="text-[10px] font-mono text-white/70">
            {(data.reduce((acc, d) => acc + d.value, 0) / (data.length || 1)).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
           <div className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-cyan-500 shadow-[0_0_5px_cyan]'}`} />
           <span className="text-[8px] font-mono tracking-widest text-white/30 uppercase">Node_Active: telemetry_ch_01</span>
        </div>
        <div className="text-[8px] font-mono text-white/20 uppercase">
          {data.length > 0 ? new Date(data[data.length-1].time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '00:00:00'}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data.length === nextProps.data.length &&
    prevProps.status === nextProps.status &&
    prevProps.threshold === nextProps.threshold &&
    prevProps.isTactileMode === nextProps.isTactileMode
  );
});
