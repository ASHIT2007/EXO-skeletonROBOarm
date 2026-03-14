import React, { useState, useRef, useEffect } from 'react';

interface GestureMirrorProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isTracking: boolean;
}

export const GestureMirrorSystem: React.FC<GestureMirrorProps> = ({ canvasRef, videoRef, isTracking }) => {
  // Move feed back to the left side as requested
  const [position, setPosition] = useState({ x: 20, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - offset.current.x;
      const newY = e.clientY - offset.current.y;
      
      const boundedX = Math.max(0, Math.min(newX, window.innerWidth - 300));
      const boundedY = Math.max(0, Math.min(newY, window.innerHeight - 200));
      
      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      className="fixed z-[999] transition-shadow duration-300 pointer-events-auto"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        boxShadow: isDragging ? '0 20px 40px rgba(0,0,0,0.6)' : '0 10px 20px rgba(0,0,0,0.4)'
      }}
    >
      <div 
        onMouseDown={handleMouseDown}
        className={`mb-1 text-[10px] font-black font-mono tracking-widest uppercase bg-black/90 px-3 py-1.5 border-l-2 rounded-sm w-fit flex items-center gap-2 select-none
          ${isDragging ? 'border-cyan-400 text-cyan-400 cursor-grabbing' : 'border-cyan-500/60 text-cyan-500/80 cursor-grab hover:text-cyan-400 hover:border-cyan-400'}`}
      >
        <div className="flex gap-0.5">
          <div className="w-0.5 h-2 bg-current opacity-40" />
          <div className="w-0.5 h-2 bg-current opacity-40" />
          <div className="w-0.5 h-2 bg-current opacity-40" />
        </div>
        GESTURE_FEED_LINK
      </div>
      
      <div className={`relative w-[280px] h-[210px] bg-black border rounded overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-colors duration-300
        ${isDragging ? 'border-cyan-400' : 'border-cyan-500/30'}`}>
        
        {/* Hidden Video Source with ID mapping */}
        <video 
          id="gesture-video-source"
          ref={(el) => {
            if (videoRef) {
              (videoRef as any).current = el;
            }
          }}
          className="hidden" 
          playsInline 
          muted 
        />
        
        {/* Visible Drawing Canvas */}
        <canvas 
          ref={canvasRef} 
          width={280} 
          height={210} 
          className="w-full h-full object-contain"
        />

        {/* Offline / Connection Warning */}
        {!isTracking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
             <div className="text-[10px] font-black text-red-500 tracking-[0.3em] mb-2 animate-pulse">SYSTEM_FEED_OFFLINE</div>
             <div className="text-[8px] text-gray-500 text-center px-4 leading-relaxed">
               CHECK BROWSER PERMISSIONS<br/>OR HARDWARE CONNECTION
             </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-50">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
        </div>

        {/* Scanline Effect Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] z-[60]" />
      </div>
    </div>
  );
};
