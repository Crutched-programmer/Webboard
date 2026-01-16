
import React, { useRef, useState, useEffect } from 'react';
import { XYTarget } from '../types';

interface XYPadProps {
  xTarget: XYTarget;
  yTarget: XYTarget;
  value: { x: number; y: number };
  onValueChange: (val: { x: number; y: number }) => void;
  onTargetChange: (axis: 'x' | 'y', target: XYTarget) => void;
  theme: { accent: string; text: string; glow: string };
}

const TARGETS: XYTarget[] = ['None', 'Cutoff', 'Resonance', 'Reverb', 'Delay', 'LFO Rate'];

const XYPad: React.FC<XYPadProps> = ({ xTarget, yTarget, value, onValueChange, onTargetChange, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    containerRef.current?.setPointerCapture(e.pointerId);
    updateValue(e);
  };

  const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
    if (!isDragging && (e as PointerEvent).buttons !== 1) return;
    updateValue(e);
  };

  const updateValue = (e: React.PointerEvent | PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    onValueChange({ x, y });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3 bg-black/40 p-2 sm:p-4 rounded-2xl border border-zinc-800 shadow-xl group w-full max-w-[320px] md:w-auto shrink-0">
      <div className="flex justify-between items-center px-1">
        <span className="text-[8px] sm:text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Vector Pad</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div 
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={isDragging ? handlePointerMove : undefined}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full aspect-square sm:w-40 sm:h-40 md:w-48 md:h-48 bg-zinc-950 rounded-lg border-2 border-zinc-800 overflow-hidden cursor-crosshair touch-none select-none shadow-inner"
        >
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none opacity-5">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="border border-zinc-500" />
            ))}
          </div>
          
          <div 
            className="absolute w-5 h-5 sm:w-6 sm:h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100 ease-out"
            style={{ left: `${value.x * 100}%`, top: `${(1 - value.y) * 100}%` }}
          >
            <div className={`w-full h-full rounded-full border border-${theme.accent} bg-${theme.accent}/10 shadow-[0_0_15px_${theme.glow}]`} />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-${theme.accent} rounded-full`} />
          </div>
        </div>

        <div className="flex flex-row sm:flex-col justify-between py-1 gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[7px] font-bold text-zinc-500 uppercase">X_DEST</label>
            <select 
              value={xTarget} 
              onChange={(e) => onTargetChange('x', e.target.value as XYTarget)}
              className={`bg-black text-${theme.accent} text-[8px] sm:text-[9px] font-mono border border-zinc-800 rounded px-1 py-1 focus:outline-none`}
            >
              {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[7px] font-bold text-zinc-500 uppercase">Y_DEST</label>
            <select 
              value={yTarget} 
              onChange={(e) => onTargetChange('y', e.target.value as XYTarget)}
              className={`bg-black text-${theme.accent} text-[8px] sm:text-[9px] font-mono border border-zinc-800 rounded px-1 py-1 focus:outline-none`}
            >
              {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XYPad;
