
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface KnobProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  isMini?: boolean;
  accent?: string;
}

const Knob: React.FC<KnobProps> = ({ label, min, max, value, onChange, isMini, accent }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startValue = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent | React.PointerEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    (e.target as HTMLElement).setPointerCapture((e as any).pointerId);
  };

  const handleMouseMove = useCallback((e: MouseEvent | PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY;
    const range = max - min;
    const sensitivity = 0.005; 
    let newValue = startValue.current + (deltaY * range * sensitivity);
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  }, [isDragging, max, min, onChange]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handleMouseMove);
      window.addEventListener('pointerup', handleMouseUp);
    } else {
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const percentage = ((value - min) / (max - min)) * 100;
  const rotation = (percentage / 100) * 270 - 135; // -135 to 135 degrees

  const sizeClass = isMini ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12 sm:w-16 sm:h-16';

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 select-none shrink-0">
      <div 
        className={`relative ${sizeClass} rounded-full bg-[#151515] border-2 border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_1px_3px_rgba(255,255,255,0.05)] cursor-ns-resize touch-none`}
        onPointerDown={handleMouseDown}
      >
        <div className="absolute inset-2 rounded-full border border-white/5 opacity-20 pointer-events-none" />
        
        {/* Value Pointer */}
        <div 
          className="absolute top-1/2 left-1/2 w-[2px] sm:w-[3px] h-5 sm:h-7 -translate-x-1/2 -translate-y-full origin-bottom rounded-full transition-transform duration-100 ease-out"
          style={{ 
            transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
            backgroundColor: accent || '#fff',
            boxShadow: `0 0 8px ${accent || '#fff'}66`
          }}
        />
        
        {/* Center Cap */}
        <div className="absolute inset-3 sm:inset-5 rounded-full bg-gradient-to-br from-white/10 to-black border border-black" />
      </div>
      
      <div className="flex flex-col items-center">
        <span className="text-[7px] sm:text-[9px] font-label text-white/30 uppercase truncate max-w-full">{label}</span>
        <span className="text-[8px] sm:text-[10px] font-mono font-bold" style={{ color: accent || '#fff' }}>{value.toFixed(1)}</span>
      </div>
    </div>
  );
};

export default Knob;
