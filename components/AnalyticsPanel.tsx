import React from 'react';
import {
  LineChart,
  Line,
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

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ data, status, threshold, isTactileMode }) => {
  const isCritical = status === SystemStatus.CRITICAL;
  const currentVal = data[data.length - 1]?.value || 0;

  const mainColor = isTactileMode ? '#ffaa00' : THEME.cyan;
  const limitColor = isTactileMode ? '#ffffff' : '#ff003c';
  const labelText = isTactileMode ? 'OBSTACLE' : 'LIMIT';

  const delta = threshold - currentVal;
  const isApproaching = delta < 15 && delta > 0;

  return (
    <div className={`w-80 h-56 bg-black/80 border backdrop-blur-md p-4 flex flex-col shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 rounded-sm
        ${isTactileMode ? 'border-orange-500/30' : 'border-cyan-500/30'}
        ${isApproaching ? 'ring-1 ring-orange-500/50' : ''}`}>

      {/* Header with improved typography */}
      <div className={`flex justify-between items-start border-b pb-3 mb-3 ${isTactileMode ? 'border-orange-950' : 'border-cyan-950'}`}>
        <div className="flex flex-col gap-1">
          <span className={`text-[9px] uppercase tracking-[0.2em] font-black ${isTactileMode ? 'text-orange-500' : 'text-cyan-500'}`}>
            Telemetry Flow
          </span>
          <span className={`text-[10px] font-bold tracking-tight text-white uppercase`}>
            {isTactileMode ? 'Collision Physics' : 'Drive Angle Delta'}
          </span>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="text-2xl font-mono font-black italic tracking-tighter leading-none" style={{ color: isCritical ? THEME.red : (isApproaching ? '#ffaa00' : mainColor) }}>
            {currentVal.toFixed(1)}°
          </div>
          <div className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded ${delta < 0 ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-400'}`}>
            {delta >= 0 ? `+${delta.toFixed(1)}° TO ${labelText}` : `${Math.abs(delta).toFixed(1)}° OVER`}
          </div>
        </div>
      </div>

      {/* Chart Area with Shaded Safe Zone */}
      <div className="flex-grow w-full relative mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={mainColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={mainColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, 200]} hide />
            <XAxis dataKey="time" hide />

            {/* Shaded Safe Zone */}
            <ReferenceArea
              y1={0}
              y2={threshold}
              fill={mainColor}
              fillOpacity={0.05}
            />

            {/* The Limit Line */}
            <ReferenceLine
              y={threshold}
              stroke={limitColor}
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: labelText,
                position: 'insideTopRight',
                fill: limitColor,
                fontSize: 9,
                fontWeight: 'bold',
                offset: 10
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={mainColor}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorVal)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Warning Overlay */}
        {isCritical && !isTactileMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-[2px] animate-pulse">
            <span className="text-red-500 font-black tracking-[0.3em] text-[10px] border-2 border-red-500 px-3 py-1 bg-black shadow-[0_0_20px_rgba(255,0,0,0.5)]">
              CRITICAL LIMIT EXCEEDED
            </span>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex justify-between items-center opacity-40">
        <div className="text-[8px] font-mono tracking-widest text-white uppercase">Buffer: {data.length}ms</div>
        <div className="flex gap-1">
          <div className={`w-1 h-1 rounded-full ${isCritical ? 'bg-red-500' : 'bg-green-500'}`}></div>
          <div className="w-1 h-1 rounded-full bg-white/20"></div>
          <div className="w-1 h-1 rounded-full bg-white/20"></div>
        </div>
      </div>
    </div>
  );
};
