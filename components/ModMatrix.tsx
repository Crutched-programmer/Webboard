
import React from 'react';
import { ModSource, ModDestination, ModRoute } from '../types';

interface ModMatrixProps {
  routes: ModRoute[];
  onChange: (routes: ModRoute[]) => void;
  theme: { accent: string; text: string; sub: string };
}

const SOURCES: ModSource[] = ['LFO', 'ENV', 'Gesture_L_V', 'Gesture_R_V', 'Gesture_Dist'];
const DESTINATIONS: ModDestination[] = ['Cutoff', 'Resonance', 'Pitch', 'Gain', 'Reverb', 'Delay'];

const ModMatrix: React.FC<ModMatrixProps> = ({ routes, onChange, theme }) => {
  const getAmount = (src: ModSource, dst: ModDestination) => {
    return routes.find(r => r.source === src && r.destination === dst)?.amount || 0;
  };

  const handleCellChange = (src: ModSource, dst: ModDestination, amount: number) => {
    const existingIndex = routes.findIndex(r => r.source === src && r.destination === dst);
    const newRoutes = [...routes];
    
    if (amount === 0) {
      if (existingIndex > -1) newRoutes.splice(existingIndex, 1);
    } else {
      if (existingIndex > -1) {
        newRoutes[existingIndex] = { source: src, destination: dst, amount };
      } else {
        newRoutes.push({ source: src, destination: dst, amount });
      }
    }
    onChange(newRoutes);
  };

  return (
    <div className="bg-black/30 p-6 rounded-xl border border-zinc-800 flex flex-col gap-6 transition-colors duration-500 shadow-2xl">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Signal_Routing_Processor_v2</h3>
        <span className="text-[8px] font-mono text-zinc-700 uppercase">Input_Matrix: {SOURCES.length}x{DESTINATIONS.length}</span>
      </div>
      
      <div className="grid grid-cols-[100px_1fr] gap-4">
        <div />
        <div className="grid grid-cols-6 gap-2">
          {DESTINATIONS.map(dst => (
            <div key={dst} className="text-[8px] text-zinc-500 font-bold uppercase text-center truncate">{dst}</div>
          ))}
        </div>

        {SOURCES.map(src => (
          <React.Fragment key={src}>
            <div className={`text-[9px] font-bold uppercase py-2 self-center transition-colors`} style={{ color: src.startsWith('Gesture') ? 'cyan' : theme.sub }}>
              {src.replace('_', ' ')}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {DESTINATIONS.map(dst => {
                const amount = getAmount(src, dst);
                const isActive = Math.abs(amount) > 0.01;
                return (
                  <div 
                    key={dst} 
                    className={`relative h-12 rounded border transition-all flex flex-col items-center justify-center group overflow-hidden ${isActive ? 'bg-white/5 border-white/20' : 'bg-zinc-900/40 border-zinc-800'}`}
                  >
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => handleCellChange(src, dst, parseFloat(e.target.value))}
                      className="absolute inset-0 opacity-0 cursor-ns-resize z-20"
                    />
                    <div className="relative z-10 w-full px-2 flex flex-col items-center">
                       <div className="w-full h-1.5 bg-black rounded-full overflow-hidden relative border border-white/5">
                          <div 
                            className={`absolute h-full transition-all ${amount > 0 ? '' : 'bg-red-500/80'} ${amount > 0 ? 'left-1/2' : 'right-1/2'}`}
                            style={{ 
                                width: `${Math.abs(amount) * 50}%`,
                                backgroundColor: amount > 0 ? (src.startsWith('Gesture') ? 'cyan' : theme.accent) : 'red'
                            }}
                          />
                       </div>
                       <span className={`text-[8px] mt-1.5 font-mono transition-colors ${isActive ? 'text-white' : 'text-zinc-700'}`}>
                         {amount > 0 ? '+' : ''}{amount.toFixed(2)}
                       </span>
                    </div>
                    {/* Visual hint for Vision inputs */}
                    {src.startsWith('Gesture') && (
                        <div className="absolute top-0.5 right-1 text-[6px] opacity-20">AIR</div>
                    )}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between">
         <div className="flex gap-4">
            <div className="flex items-center gap-1">
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
               <span className="text-[7px] font-mono text-zinc-600 uppercase">Core_Mod</span>
            </div>
            <div className="flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-cyan-500" />
               <span className="text-[7px] font-mono text-zinc-600 uppercase">Vision_Mod</span>
            </div>
         </div>
         <span className="text-[7px] font-mono text-zinc-700 uppercase italic">Dynamic mapping adjusts in real-time based on vision analysis</span>
      </div>
    </div>
  );
};

export default ModMatrix;
