
import React, { useRef, useEffect, useState } from 'react';
import { VisualizerMode, PatchInfo, GestureState } from '../types';
import { audioService } from '../services/audioService';

interface VisualizerProps {
  mode: VisualizerMode;
  onModeChange: (mode: VisualizerMode) => void;
  patchName: string;
  themeColor: string;
  patchInfo: PatchInfo | null;
  isLoading?: boolean;
  gestureData?: GestureState | null;
}

export const Visualizer: React.FC<VisualizerProps> = ({ mode, onModeChange, patchName, themeColor, patchInfo, isLoading, gestureData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modes: VisualizerMode[] = ['Waveform', 'Spectrum', 'Circle', 'Pulse'];

  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 2048;
    const timeData = new Uint8Array(bufferLength);

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      audioService.getAnalyserData(timeData);
      
      ctx.fillStyle = 'rgba(5, 10, 5, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Vision Overlay Logic
      if (gestureData) {
         ctx.save();
         
         // Helper function to draw hand indicator
         const drawHand = (hand: any, label: string) => {
            if (!hand.active) return;
            const hx = hand.x * canvas.width;
            const hy = (1 - hand.y) * canvas.height;
            
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = hand.isPincer ? '#00ffff' : hand.isClosed ? '#ff00ff' : '#00ff41';
            
            // Outer Ring
            ctx.beginPath();
            ctx.arc(hx, hy, 22 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
            ctx.stroke();

            // Status Text
            ctx.font = '7px "JetBrains Mono"';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(label, hx + 28, hy - 10);
            
            if (hand.isPincer) {
               ctx.font = 'bold 8px "JetBrains Mono"';
               ctx.fillText('[SUSTAIN]', hx + 28, hy + 5);
               // Draw pincer symbol
               ctx.beginPath();
               ctx.arc(hx, hy, 8, 0, Math.PI * 2);
               ctx.fill();
            } else if (hand.isClosed) {
               ctx.font = 'bold 8px "JetBrains Mono"';
               ctx.fillText('[CLOSED_MOD]', hx + 28, hy + 5);
               // Draw closed symbol (fist)
               ctx.fillRect(hx - 8, hy - 8, 16, 16);
            } else {
               ctx.fillText('OPEN_AIR', hx + 28, hy + 5);
            }

            // Tracking dot
            ctx.beginPath();
            ctx.arc(hx, hy, 3, 0, Math.PI * 2);
            ctx.fill();
         };

         drawHand(gestureData.leftHand, 'L_PROBE');
         drawHand(gestureData.rightHand, 'R_PROBE');

         // Distance Connection
         if (gestureData.leftHand.active && gestureData.rightHand.active) {
             ctx.beginPath();
             ctx.setLineDash([4, 4]);
             ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
             ctx.moveTo(gestureData.leftHand.x * canvas.width, (1 - gestureData.leftHand.y) * canvas.height);
             ctx.lineTo(gestureData.rightHand.x * canvas.width, (1 - gestureData.rightHand.y) * canvas.height);
             ctx.stroke();
             ctx.setLineDash([]);

             // Distance Label
             const mx = ((gestureData.leftHand.x + gestureData.rightHand.x) / 2) * canvas.width;
             const my = (( (1 - gestureData.leftHand.y) + (1 - gestureData.rightHand.y) ) / 2) * canvas.height;
             ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
             ctx.font = '6px "JetBrains Mono"';
             ctx.fillText(`DIST: ${gestureData.distance.toFixed(2)}`, mx + 10, my);
         }
         ctx.restore();
      }

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = themeColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = themeColor;

      if (mode === 'Waveform') {
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      } else if (mode === 'Spectrum') {
        const barCount = 64;
        const barWidth = (canvas.width / barCount);
        for (let i = 0; i < barCount; i++) {
          const v = timeData[i * 8] / 255.0;
          const barHeight = v * canvas.height * 0.8;
          ctx.fillStyle = themeColor;
          ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
        }
      } else if (mode === 'Circle') {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 80;
        ctx.beginPath();
        for (let i = 0; i < 360; i += 2) {
          const v = timeData[(i * 5) % bufferLength] / 128.0;
          const r = radius + (v * 30);
          const x = centerX + r * Math.cos((i * Math.PI) / 180);
          const y = centerY + r * Math.sin((i * Math.PI) / 180);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      } else if (mode === 'Pulse') {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const v = timeData[100] / 128.0;
        const size = (v * 100) + 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [mode, themeColor, gestureData]);

  return (
    <div className="w-full h-full bg-black relative flex flex-col overflow-hidden p-4">
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 z-30 pointer-events-none flex flex-col gap-1">
        <h2 className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase opacity-40" style={{ color: themeColor }}>
          SYSTEM_STATE: {gestureData ? 'AIRWAVE_LOCKED' : 'ACTIVE'}
        </h2>
        <div className="h-[2px] w-24 bg-white/10" />
      </div>

      <div className="absolute top-4 right-4 z-30 pointer-events-none flex flex-col items-end gap-1">
        <span className="text-[8px] font-mono uppercase opacity-30 text-white">Gemini_Neural_Engine_v3</span>
        <div className="flex gap-1">
           {[...Array(4)].map((_, i) => <div key={i} className={`w-1 h-1 rounded-full ${isLoading ? 'animate-pulse' : ''}`} style={{ backgroundColor: gestureData ? '#00ffff' : themeColor }} />)}
        </div>
      </div>

      {/* Main Analysis Visualizer Area */}
      <div className="flex-1 relative mt-10">
         <canvas ref={canvasRef} width={400} height={300} className="w-full h-[60%] opacity-80" />
         
         {/* Patch Info Panel */}
         <div className="absolute bottom-0 left-0 w-full h-[40%] bg-black/40 border-t border-white/5 p-3 flex flex-col gap-2 overflow-hidden backdrop-blur-sm">
            {isLoading ? (
               <div className="flex-1 flex items-center justify-center">
                  <span className="text-[10px] font-mono animate-pulse uppercase" style={{ color: themeColor }}>Decoding_Signal...</span>
               </div>
            ) : patchInfo ? (
              <>
                <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                  <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>{patchInfo.name || patchName}</span>
                  <span className="text-[8px] font-mono uppercase text-white/40">{patchInfo.mood}</span>
                </div>
                <p className="text-[9px] text-white/60 leading-tight line-clamp-2 italic">"{patchInfo.description}"</p>
                <div className="flex gap-2 mt-auto">
                   {patchInfo.usageTips?.slice(0, 2).map((tip, i) => (
                      <div key={i} className="flex-1 bg-white/5 px-2 py-1 rounded text-[7px] font-mono text-white/40 uppercase tracking-tighter">
                         {tip}
                      </div>
                   ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center opacity-20">
                 <span className="text-[8px] font-mono uppercase tracking-[0.5em]">No_Metadata</span>
              </div>
            )}
         </div>
      </div>
      
      {/* Aesthetic Grids */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 grid grid-cols-6 grid-rows-6 opacity-20">
        {[...Array(36)].map((_, i) => <div key={i} className="border-[0.5px] border-white/10" />)}
      </div>

      {/* Selector Buttons */}
      <div className="absolute bottom-1 left-0 w-full z-40 flex justify-center gap-1 px-4">
         {modes.map(m => (
           <button 
            key={m}
            onClick={() => onModeChange(m)}
            className={`flex-1 py-1 text-[7px] font-bold uppercase tracking-tighter transition-all border`}
            style={{ 
              backgroundColor: mode === m ? themeColor : 'rgba(0,0,0,0.8)',
              color: mode === m ? 'black' : themeColor,
              borderColor: `${themeColor}44`,
            }}
           >
             {m}
           </button>
         ))}
      </div>
    </div>
  );
};
