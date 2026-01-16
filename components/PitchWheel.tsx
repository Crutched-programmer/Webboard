
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PitchWheelProps {
  value: number;
  onChange: (val: number) => void;
}

const PitchWheel: React.FC<PitchWheelProps> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    containerRef.current?.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging && (e as PointerEvent).buttons !== 1) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const deltaY = centerY - e.clientY;
    const maxDelta = rect.height / 2.2;
    let newValue = deltaY / maxDelta;
    newValue = Math.max(-1, Math.min(1, newValue));
    onChange(newValue);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onChange(0);
  };

  const wheelOffset = -value * (typeof window !== 'undefined' && window.innerWidth < 640 ? 25 : 40);

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 select-none shrink-0">
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={isDragging ? handlePointerMove : undefined}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-10 sm:w-14 h-24 sm:h-44 bg-[#0a0a0a] border-2 border-[#333] rounded shadow-inner overflow-hidden cursor-ns-resize touch-none"
      >
        {/* Pitch Wheel Body */}
        <div 
          className="absolute top-1/2 left-1/2 w-7 sm:w-10 h-12 sm:h-20 bg-zinc-800 -translate-x-1/2 -translate-y-1/2 rounded shadow-[0_0_20px_rgba(0,0,0,1)] border border-black transition-transform duration-75"
          style={{ transform: `translate(-50%, calc(-50% + ${wheelOffset}px))` }}
        >
          {/* Hardware Grips */}
          <div className="absolute inset-0 flex flex-col justify-around py-1 sm:py-3">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="h-[2px] sm:h-1 w-full bg-black/60 shadow-inner" />
             ))}
          </div>
          {/* Orange Center Indicator */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] sm:h-1 bg-orange-600 shadow-[0_0_10px_#ea580c]" />
        </div>
        
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex flex-col justify-between p-1 sm:p-2">
           {[...Array(8)].map((_, i) => <div key={i} className="h-[1px] w-full bg-white" />)}
        </div>
      </div>
      <span className="text-[7px] sm:text-[9px] font-label text-zinc-600 truncate uppercase">Pitch</span>
    </div>
  );
};

export default PitchWheel;
