
import React, { useRef, useState, useEffect } from 'react';
import { analyzeGestureFrame } from '../services/geminiService';
import { GestureState, SynthSettings, ModSource } from '../types';

interface GestureControlProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onGestureUpdate: (state: GestureState) => void;
  themeColor: string;
  settings: SynthSettings;
  gestureData: GestureState | null;
}

const GestureControl: React.FC<GestureControlProps> = ({ enabled, onToggle, onGestureUpdate, themeColor, settings, gestureData }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisTimeoutRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (analysisTimeoutRef.current) {
      window.clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
    setIsStreaming(false);
    setIsAnalyzing(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true);
            setError(null);
          });
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied or unavailable. Please check permissions.");
      onToggle(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [enabled]);

  // Recursive analysis loop to prevent request stacking
  useEffect(() => {
    if (!enabled || !isStreaming) return;

    const runAnalysis = async () => {
      if (!canvasRef.current || !videoRef.current || !enabled) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      setIsAnalyzing(true);
      try {
        // Draw current frame
        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6).split(',')[1];
        
        const gesture = await analyzeGestureFrame(base64);
        if (gesture && enabled) {
          onGestureUpdate(gesture);
        }
      } catch (err) {
        console.warn("Analysis cycle failed", err);
      } finally {
        setIsAnalyzing(false);
        // Schedule next analysis only after current one finishes
        if (enabled) {
          analysisTimeoutRef.current = window.setTimeout(runAnalysis, 400);
        }
      }
    };

    analysisTimeoutRef.current = window.setTimeout(runAnalysis, 1000); // Initial delay

    return () => {
      if (analysisTimeoutRef.current) window.clearTimeout(analysisTimeoutRef.current);
    };
  }, [enabled, isStreaming]);

  const getModulations = (source: ModSource) => {
    return settings.modMatrix.filter(m => m.source === source);
  };

  const Meter = ({ label, value, source }: { label: string; value: number; source: ModSource }) => {
    const activeMods = getModulations(source);
    return (
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex justify-between items-center text-[8px] font-mono">
          <span className="text-zinc-500 uppercase">{label}</span>
          <span className="text-cyan-500">{(value * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-cyan-500 transition-all duration-300" 
            style={{ width: `${value * 100}%`, boxShadow: '0 0 10px cyan' }} 
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {activeMods.map((m, i) => (
            <span key={i} className="text-[6px] px-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded uppercase">
              → {m.destination}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const PoseIndicator = ({ label, active, color }: { label: string; active: boolean; color: string }) => (
    <div 
      className={`flex-1 flex flex-col items-center justify-center p-2 border rounded-lg transition-all duration-300 ${active ? 'bg-white/5' : 'opacity-20'}`}
      style={{ borderColor: active ? color : 'rgba(255,255,255,0.05)' }}
    >
      <div className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: active ? color : '#333', boxShadow: active ? `0 0 10px ${color}` : 'none' }} />
      <span className="text-[7px] font-bold uppercase tracking-tighter" style={{ color: active ? color : '#555' }}>{label}</span>
    </div>
  );

  return (
    <div className="w-full max-w-5xl flex flex-col gap-6 bg-black/60 p-8 border border-white/10 rounded-2xl backdrop-blur-xl">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
           <h2 className="text-xl font-display tracking-[0.2em] uppercase" style={{ color: themeColor }}>Airwave_Telemetry_v1.2</h2>
           <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">Vision-Neural Mapping & Pose Analytics</p>
        </div>
        <div className="flex gap-4">
          {error && <span className="text-red-500 text-[10px] font-mono self-center uppercase animate-pulse">{error}</span>}
          <button 
            onClick={() => onToggle(!enabled)}
            className="px-8 py-3 font-bold border rounded-lg transition-all uppercase text-xs hover:scale-105 active:scale-95"
            style={{ 
              borderColor: themeColor, 
              backgroundColor: enabled ? themeColor : 'transparent',
              color: enabled ? 'black' : themeColor,
              boxShadow: enabled ? `0 0 25px ${themeColor}44` : 'none'
            }}
          >
            {enabled ? 'System Offline' : 'Engage Airwave'}
          </button>
        </div>
      </div>

      <div className="flex gap-8 h-[380px]">
        <div className="flex flex-col gap-4 w-[340px]">
          <div className="relative aspect-[4/3] bg-black rounded-xl border-2 border-zinc-800 overflow-hidden shadow-2xl group">
            <video 
              ref={videoRef} 
              autoPlay 
              muted
              playsInline 
              className={`w-full h-full object-cover grayscale brightness-90 contrast-125 transition-opacity duration-700 ${isStreaming ? 'opacity-100' : 'opacity-0'}`} 
            />
            <canvas ref={canvasRef} width={320} height={240} className="hidden" />
            
            {!isStreaming && enabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 font-mono text-[10px] uppercase text-center px-8 gap-4">
                <div className="w-12 h-12 border-2 border-dashed border-zinc-800 rounded-full animate-spin" />
                Initializing Optical Sensors...
              </div>
            )}

            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-500/50 animate-scan" />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded border border-cyan-500/30">
                  <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-red-500' : 'bg-cyan-500'} animate-pulse`} />
                  <span className="text-[7px] font-mono text-cyan-500 uppercase">{isAnalyzing ? 'Neural_Busy' : 'Live_Feed'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 flex-1">
             <PoseIndicator label="L_Pincer" active={!!gestureData?.leftHand.isPincer} color="#00ffff" />
             <PoseIndicator label="R_Pincer" active={!!gestureData?.rightHand.isPincer} color="#00ffff" />
             <PoseIndicator label="Distance" active={!!gestureData && gestureData.distance > 0.1} color="#f0f" />
             <PoseIndicator label="L_Closed" active={!!gestureData?.leftHand.isClosed} color="#ff00ff" />
             <PoseIndicator label="R_Closed" active={!!gestureData?.rightHand.isClosed} color="#ff00ff" />
             <PoseIndicator label="Tracking" active={isStreaming && !!gestureData} color="#00ff41" />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 bg-black/40 p-6 rounded-xl border border-white/5 overflow-y-auto">
          <h3 className="text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Realtime_Modulation_Meters</h3>
          
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 mb-3 uppercase tracking-widest font-bold">L_Hand_Telemetry</span>
              <Meter label="Vertical_Ax" value={gestureData?.leftHand.y || 0} source="Gesture_L_V" />
              <Meter label="Horiz_Ax" value={gestureData?.leftHand.x || 0} source="Gesture_L_H" />
            </div>

            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 mb-3 uppercase tracking-widest font-bold">R_Hand_Telemetry</span>
              <Meter label="Vertical_Ax" value={gestureData?.rightHand.y || 0} source="Gesture_R_V" />
              <Meter label="Horiz_Ax" value={gestureData?.rightHand.x || 0} source="Gesture_R_H" />
            </div>
          </div>

          <div className="mt-4">
             <span className="text-[8px] text-zinc-600 mb-3 uppercase tracking-widest font-bold">Spatial_Global</span>
             <Meter label="Inter-Hand Distance" value={gestureData?.distance || 0} source="Gesture_Dist" />
          </div>

          <div className="mt-auto pt-4 border-t border-white/5 text-[8px] text-zinc-600 uppercase leading-relaxed font-mono">
            Optical sensors detected. Absolute Y mapping to filter cutoff and resonance. Distance mapped to reverb dry/wet.
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan { animation: scan 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default GestureControl;
