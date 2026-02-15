import React from 'react';
import { LineChart, Line, YAxis, XAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
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
  
  // Choose theme colors based on mode
  const mainColor = isTactileMode ? '#ffaa00' : THEME.cyan;
  const limitColor = isTactileMode ? '#ffffff' : 'red';
  const labelText = isTactileMode ? 'OBJECT POSITION' : 'MAX LIMIT';

  return (
    <div className={`w-72 h-48 bg-black/60 border backdrop-blur-sm p-3 flex flex-col shadow-lg transition-colors duration-500
        ${isTactileMode ? 'border-orange-800' : 'border-cyan-800'}`}>
      
      <div className={`flex justify-between items-center border-b pb-2 mb-2 ${isTactileMode ? 'border-orange-900' : 'border-cyan-900'}`}>
        <div className="flex flex-col">
            <span className={`text-[10px] uppercase tracking-widest font-bold ${isTactileMode ? 'text-orange-600' : 'text-cyan-600'}`}>Live Telemetry</span>
            <span className={`text-xs ${isTactileMode ? 'text-orange-400' : 'text-cyan-400'}`}>
                {isTactileMode ? 'ARM POS VS OBSTACLE' : 'SERVO ANGLE VS LIMIT'}
            </span>
        </div>
        <div className="text-right">
             <div className="text-xl font-mono font-bold leading-none" style={{ color: isCritical ? THEME.red : mainColor }}>
                {data[data.length - 1]?.value.toFixed(1)}°
             </div>
             <div className="text-[9px] text-gray-500 uppercase">Current Pos</div>
        </div>
      </div>
      
      <div className="flex-grow w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={[0, 100]} hide />
            <XAxis dataKey="time" hide />
            
            {/* The Limit Line */}
            <ReferenceLine 
                y={threshold} 
                stroke={limitColor} 
                strokeDasharray={isTactileMode ? "0" : "3 3"} 
                strokeWidth={isTactileMode ? 2 : 1}
                label={{ value: labelText, position: 'insideBottomRight', fill: limitColor, fontSize: 10 }} 
            />
            
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={mainColor} 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={false} 
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Warning Overlay */}
        {isCritical && !isTactileMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 backdrop-blur-[1px]">
                <span className="text-red-500 font-bold tracking-widest text-xs border border-red-500 px-2 py-1 bg-black/80">LIMIT EXCEEDED</span>
            </div>
        )}
      </div>

      {/* Decorative Grid Lines Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: `linear-gradient(${mainColor} 1px, transparent 1px), linear-gradient(90deg, ${mainColor} 1px, transparent 1px)`, backgroundSize: '10px 10px' }}>
      </div>
    </div>
  );
};
