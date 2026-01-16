
import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  accent?: string;
}

const Slider: React.FC<SliderProps> = ({ label, min, max, value, onChange, step = 0.01, accent }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 h-full select-none shrink-0">
      <div className="relative h-full w-8 sm:w-12 bg-[#1a1a1a] rounded-sm border-2 border-black flex items-center justify-center shadow-inner group">
        
        {/* Mechanical Track Slit */}
        <div className="absolute inset-y-2 sm:inset-y-4 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 bg-black rounded-full shadow-inner border border-zinc-800" />
        
        {/* Hidden Input for handling interaction */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ appearance: 'slider-vertical' as any }}
        />

        {/* Custom Fader Cap */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-6 sm:w-8 h-8 sm:h-12 bg-zinc-700 border-2 border-black rounded shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none transition-all duration-100 ease-out"
          style={{ bottom: `calc(${percentage}% * 0.85 + 5%)` }}
        >
          {/* Fader Cap Ridges */}
          <div className="absolute inset-x-1 top-1.5 sm:top-2 h-[1px] sm:h-[2px] bg-black/40" />
          <div className="absolute inset-x-1 top-3 sm:top-4 h-[1px] sm:h-[2px] bg-black/40" />
          <div className="absolute inset-x-1 top-4.5 sm:top-6 h-[1px] sm:h-[2px] bg-black/40" />
          {/* Indicator Line */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] sm:h-[2px] shadow-[0_0_8px_currentcolor] transition-colors" style={{ backgroundColor: accent || '#f97316' }} />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-[7px] sm:text-[9px] font-label text-zinc-500">{label}</span>
        <span className="text-[8px] sm:text-[10px] text-zinc-400 font-mono">{value.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default Slider;
