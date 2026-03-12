import React from 'react';
import { SystemStatus } from '../types';
import { Shield, CheckCircle, Zap, Cpu, Activity, AlertOctagon } from 'lucide-react';

interface StatusBannerProps {
    status: SystemStatus;
    isReflexActive: boolean;
    isTactileMode: boolean;
    isSerialConnected: boolean;
    heat?: number;
    vibration?: number;
    pressure?: number;
    manualPermissive?: boolean;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ 
    status, 
    isReflexActive, 
    isTactileMode, 
    isSerialConnected,
    heat = 0, 
    vibration = 0, 
    pressure = 0,
    manualPermissive = false
}) => {
    const isCritical = status === SystemStatus.CRITICAL;
    const isNominal = status === SystemStatus.NOMINAL;
    
    // Safety Logic States for Indicator Strip
    const sensorsSafe = heat <= 80 && vibration <= 80 && pressure <= 95;
    const operatorEnabled = manualPermissive;
    const driveActive = isNominal && sensorsSafe && operatorEnabled;

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-md transition-all duration-500 border-cyan-500/30 bg-black/80 flex items-center justify-between px-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)]`}>
            {/* Left: System Branding & Mode */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Cpu className="text-cyan-400" size={18} />
                        <span className="text-sm font-black tracking-[0.2em] text-white uppercase italic">EXO-CORE v2.0</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest border transition-colors ${isSerialConnected ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-cyan-500/10 border-cyan-500 text-cyan-400'}`}>
                            {isSerialConnected ? 'LIVE HARDWARE' : 'SIMULATION MODE'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Center: Persistent Status & 3-State Strip */}
            <div className="flex flex-col items-center flex-grow max-w-2xl px-8">
                <div className={`text-sm font-bold tracking-[0.3em] uppercase transition-colors mb-2 ${isCritical ? 'text-red-500' : 'text-cyan-400'}`}>
                    System Status: {status}
                </div>
                
                {/* 3-State Indicator Strip */}
                <div className="flex items-center w-full gap-1 h-2 relative">
                    <div className={`flex-1 flex items-center justify-center gap-2 border-t-2 transition-all duration-300 ${sensorsSafe ? 'border-green-500 text-green-400' : 'border-red-600 text-red-600 opacity-50'}`}>
                         <Shield size={10} />
                         <span className="text-[8px] font-black uppercase tracking-widest">Sensors Safe</span>
                    </div>
                    <div className="w-4 flex items-center justify-center text-gray-700">
                        <Activity size={10} />
                    </div>
                    <div className={`flex-1 flex items-center justify-center gap-2 border-t-2 transition-all duration-300 ${operatorEnabled ? 'border-green-500 text-green-400' : 'border-gray-700 text-gray-700'}`}>
                         <CheckCircle size={10} />
                         <span className="text-[8px] font-black uppercase tracking-widest">Operator Enabled</span>
                    </div>
                    <div className="w-4 flex items-center justify-center text-gray-700">
                        <Activity size={10} />
                    </div>
                    <div className={`flex-1 flex items-center justify-center gap-2 border-t-2 transition-all duration-300 ${driveActive ? 'border-green-500 text-green-400' : 'border-gray-700 text-gray-700'}`}>
                         <Zap size={10} />
                         <span className="text-[8px] font-black uppercase tracking-widest">Drive Active</span>
                    </div>
                    
                    {/* Animated Pulse for Drive Active */}
                    {driveActive && (
                        <div className="absolute inset-x-0 -top-1 h-0.5 bg-green-500/50 blur-[2px] animate-pulse"></div>
                    )}
                </div>
            </div>

            {/* Right: Emergency Stop & Faults */}
            <div className="flex items-center gap-6">
                {isCritical && (
                    <div className="flex items-center gap-2 text-red-500 animate-pulse">
                        <AlertOctagon size={20} />
                        <span className="text-xs font-bold tracking-widest uppercase">System Interlock Tripped</span>
                    </div>
                )}
                
                <div className="w-32 text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-mono">Operator ID</div>
                    <div className="text-xs text-cyan-600 font-mono tracking-wider truncate">ASHIT-DEEP-MIND-USER</div>
                </div>
            </div>
            
            {/* Top Scanning Line Effect */}
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </header>
    );
};
