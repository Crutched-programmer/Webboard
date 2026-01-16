
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { audioService } from './services/audioService';
import { getPatchAnalysis, analyzeGestureFrame } from './services/geminiService';
import { SynthSettings, PatchInfo, PatchCategory, XYTarget, VisualizerMode, KeySlideTarget, ColorTheme, GestureState } from './types';
import { INITIAL_SETTINGS, PATCH_LIBRARY } from './constants';
import Knob from './components/Knob';
import Slider from './components/Slider';
import { Visualizer } from './components/Display';
import Keyboard from './components/Keyboard';
import PitchWheel from './components/PitchWheel';
import ModMatrix from './components/ModMatrix';
import XYPad from './components/XYPad';
import GestureControl from './components/GestureControl';

const THEME_DATA: Record<ColorTheme, { accent: string; glow: string; text: string; sub: string; bg: string; surface: string; board: string }> = {
  Classic: { accent: '#f97316', glow: 'rgba(249, 115, 22, 0.5)', text: '#10b981', sub: '#71717a', bg: '#09090b', surface: '#18181b', board: '#262626' },
  Cyberpunk: { accent: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)', text: '#22d3ee', sub: '#a855f7', bg: '#000000', surface: '#0f172a', board: '#1e1b4b' },
  Modern: { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', text: '#18181b', sub: '#71717a', bg: '#f4f4f5', surface: '#ffffff', board: '#e4e4e7' },
  Monochrome: { accent: '#ffffff', glow: 'rgba(255, 255, 255, 0.5)', text: '#d4d4d8', sub: '#52525b', bg: '#000000', surface: '#18181b', board: '#09090b' },
  Inverted: { accent: '#000000', glow: 'rgba(0, 0, 0, 0.2)', text: '#18181b', sub: '#a1a1aa', bg: '#ffffff', surface: '#f4f4f5', board: '#e4e4e7' },
  Retro: { accent: '#dc2626', glow: 'rgba(220, 38, 38, 0.5)', text: '#fed7aa', sub: '#78716c', bg: '#d6d3d1', surface: '#a8a29e', board: '#78716c' },
  Ancient: { accent: '#d97706', glow: 'rgba(217, 119, 6, 0.6)', text: '#f5f5f4', sub: '#44403c', bg: '#1c1917', surface: '#292524', board: '#44403c' },
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<SynthSettings>({ ...INITIAL_SETTINGS, gestureControlEnabled: false, sustain: false });
  const [activePage, setActivePage] = useState(1); 
  const [userPresets, setUserPresets] = useState<Record<string, SynthSettings>>({});
  const [newPresetName, setNewPresetName] = useState('');
  const [chordMode, setChordMode] = useState(false);
  const [scale, setScale] = useState(1);
  const [gestureData, setGestureData] = useState<GestureState | null>(null);
  const [patchInfo, setPatchInfo] = useState<PatchInfo | null>(null);
  const [isPatchLoading, setIsPatchLoading] = useState(false);

  // Scaling Logic
  useEffect(() => {
    const handleResize = () => {
      const designWidth = 1440;
      const currentWidth = window.innerWidth;
      const designHeight = 900;
      const currentHeight = window.innerHeight;
      
      const scaleW = currentWidth / designWidth;
      const scaleH = currentHeight / designHeight;
      const newScale = Math.min(scaleW, scaleH, 1.2);
      setScale(Math.max(0.4, newScale));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Patch Analysis Hook
  useEffect(() => {
    const analyze = async () => {
      setIsPatchLoading(true);
      try {
        const info = await getPatchAnalysis(settings);
        setPatchInfo(info);
      } catch (e) {
        console.error("Patch analysis failed", e);
      } finally {
        setIsPatchLoading(false);
      }
    };
    analyze();
  }, [settings.patch]);

  const updateSetting = useCallback((key: keyof SynthSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const selectPatch = useCallback((category: PatchCategory | 'User', patchName: string) => {
    if (category === 'User') {
      const preset = userPresets[patchName];
      if (preset) setSettings({ ...preset, patch: patchName });
    } else {
      setSettings(prev => ({ ...prev, patch: patchName, patchCategory: category as PatchCategory }));
    }
  }, [userPresets]);

  const handleXYChange = useCallback((axis: 'x' | 'y', val: number) => {
    const target = axis === 'x' ? settings.xyPadXTarget : settings.xyPadYTarget;
    setSettings(prev => {
      const next = { ...prev };
      next.xyPadValue = { ...prev.xyPadValue, [axis]: val };
      switch (target) {
        case 'Cutoff': next.cutoff = 50 + (val * 9950); break;
        case 'Resonance': next.resonance = 0.1 + (val * 9.9); break;
        case 'Reverb': next.reverb = val; break;
        case 'Delay': next.delayFeedback = val * 0.9; break;
        case 'LFO Rate': next.lfoRate = 0.1 + (val * 19.9); break;
      }
      return next;
    });
  }, [settings.xyPadXTarget, settings.xyPadYTarget]);

  // Apply Gestures to Synth (ABSOLUTE MAPPING + DISCRETE GESTURES)
  useEffect(() => {
    if (!gestureData || !settings.gestureControlEnabled) return;

    setSettings(prev => {
      let next = { ...prev };
      
      // Discrete gesture logic: Pincer = Sustain
      const isLHandSustaining = gestureData.leftHand.active && gestureData.leftHand.isPincer;
      const isRHandSustaining = gestureData.rightHand.active && gestureData.rightHand.isPincer;
      next.sustain = isLHandSustaining || isRHandSustaining;

      // Handle Matrix Modulations
      prev.modMatrix.forEach(route => {
        if (!route.source.startsWith('Gesture')) return;

        let sourceValue = 0;
        switch(route.source) {
          case 'Gesture_L_H': sourceValue = gestureData.leftHand.x; break;
          case 'Gesture_L_V': sourceValue = gestureData.leftHand.y; break;
          case 'Gesture_R_H': sourceValue = gestureData.rightHand.x; break;
          case 'Gesture_R_V': sourceValue = gestureData.rightHand.y; break;
          case 'Gesture_Dist': sourceValue = gestureData.distance; break;
        }

        // Apply absolute modulation
        const amt = sourceValue * route.amount;
        
        // Pose Multiplier: Closed hand intensifies modulation
        const poseMult = (gestureData.leftHand.isClosed || gestureData.rightHand.isClosed) ? 1.5 : 1.0;
        const finalAmt = amt * poseMult;

        switch(route.destination) {
          case 'Cutoff': 
            next.cutoff = Math.max(50, Math.min(10000, 2000 + finalAmt * 8000)); 
            break;
          case 'Resonance': 
            next.resonance = Math.max(0.1, Math.min(10, 1 + finalAmt * 9)); 
            break;
          case 'Reverb': 
            next.reverb = Math.max(0, Math.min(1, finalAmt)); 
            break;
          case 'Delay': 
            next.delayFeedback = Math.max(0, Math.min(0.9, finalAmt * 0.9)); 
            break;
        }
      });

      return next;
    });
  }, [gestureData, settings.gestureControlEnabled]);

  useEffect(() => { audioService.updateGlobalParams(settings); }, [settings]);

  const totalPages = 8; 
  const nextPage = () => setActivePage(p => (p + 1) % totalPages);
  const prevPage = () => setActivePage(p => (p - 1 + totalPages) % totalPages);

  const categories = [...Object.keys(PATCH_LIBRARY), 'User'];
  const theme = THEME_DATA[settings.theme];
  const dynamicStyles = {
    '--theme-accent': theme.accent,
    '--theme-glow': theme.glow,
    '--theme-text': theme.text,
    '--theme-sub': theme.sub,
    '--theme-bg': theme.bg,
    '--theme-surface': theme.surface,
    '--theme-board': theme.board,
  } as React.CSSProperties;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-0 overflow-hidden bg-black transition-all duration-700" style={dynamicStyles}>
      <div 
        className="relative transition-transform duration-300 ease-out origin-center"
        style={{ transform: `scale(${scale})`, width: '1440px', height: '900px' }}
      >
        <div className="w-full h-full flex flex-row rounded-xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-t border-white/10" style={{ backgroundColor: 'var(--theme-board)' }}>
          
          <div className={`hidden lg:block w-8 ${settings.theme === 'Ancient' ? 'bg-[#3b2a1a]' : 'wood-panel'} h-full border-r border-black`} />

          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="h-16 flex items-center justify-between px-8 bg-black/40 border-b border-black shrink-0 z-50">
              <div className="flex items-center gap-6">
                 <div className="flex flex-col shrink-0">
                    <h1 className="font-display text-xl tracking-tighter font-bold uppercase" style={{ color: 'var(--theme-accent)' }}>MODEL G-85</h1>
                    <span className="text-[9px] font-label -mt-1 tracking-widest" style={{ color: 'var(--theme-sub)' }}>Air-Wave Synthesis Engine</span>
                 </div>
                 <div className="h-8 w-[2px] bg-white/10" />
                 <button onClick={() => setActivePage(0)} className="flex items-center gap-2 hover:bg-white/10 px-3 py-1 rounded transition-all">
                    <div className={`w-2 h-2 rounded-full ${settings.gestureControlEnabled ? 'bg-cyan-500 shadow-[0_0_8px_cyan]' : 'bg-green-500 shadow-[0_0_8px_green]'}`} />
                    <span className="text-[9px] font-mono text-white/50 uppercase">SYS_STABLE: {settings.gestureControlEnabled ? 'VISION_ACTIVE' : 'READY'}</span>
                 </button>
              </div>

              <div className="bg-black/90 px-4 py-2 rounded border border-white/10 font-mono shadow-inner transition-all duration-500" style={{ color: 'var(--theme-text)' }}>
                  <span className="text-[10px] uppercase mr-2 font-bold tracking-widest" style={{ color: 'var(--theme-sub)' }}>Patch:</span>
                  <span className="text-xs font-bold">{settings.patch.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-black/10">
              <div 
                className="flex h-full transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1)" 
                style={{ transform: `translateX(-${activePage * 100}%)` }}
              >
                {/* PAGE 0: Global Settings */}
                <div className="min-w-full h-full flex items-center justify-center p-12">
                   <div className="w-full max-w-4xl bg-black/60 border border-white/10 rounded-2xl p-10">
                      <h2 className="text-xl font-display tracking-widest uppercase mb-8" style={{ color: 'var(--theme-accent)' }}>System_Matrix</h2>
                      <div className="grid grid-cols-2 gap-12">
                         <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-label tracking-widest" style={{ color: 'var(--theme-sub)' }}>Visual_Skin</label>
                            <div className="grid grid-cols-2 gap-2">
                               {['Classic', 'Cyberpunk', 'Modern', 'Monochrome', 'Inverted', 'Retro', 'Ancient'].map(t => (
                                 <button key={t} onClick={() => updateSetting('theme', t)} className={`px-4 py-3 text-[10px] uppercase border transition-all ${settings.theme === t ? 'border-white bg-white/10' : 'border-white/10'}`}>{t}</button>
                               ))}
                            </div>
                         </div>
                         <div className="flex flex-col gap-6">
                            <label className="text-[10px] font-label tracking-widest" style={{ color: 'var(--theme-sub)' }}>Voice_Mode</label>
                            <button onClick={() => updateSetting('monoMode', !settings.monoMode)} className="py-4 border text-[10px] uppercase" style={{ borderColor: 'var(--theme-accent)', color: settings.monoMode ? 'black' : 'var(--theme-sub)', backgroundColor: settings.monoMode ? 'var(--theme-accent)' : 'transparent' }}>
                              Mono: {settings.monoMode ? 'On' : 'Off'}
                            </button>
                         </div>
                      </div>
                   </div>
                </div>

                {/* PAGE 1: Dashboard */}
                <div className="min-w-full h-full flex items-center justify-center gap-8 p-6">
                  <div className="flex-1 max-w-[500px] aspect-square bg-black rounded-xl border-4 border-white/5 relative overflow-hidden shadow-2xl">
                     <Visualizer 
                        mode={settings.visualizerMode} 
                        onModeChange={(m) => updateSetting('visualizerMode', m)} 
                        patchName={settings.patch} 
                        themeColor={theme.accent} 
                        patchInfo={patchInfo}
                        isLoading={isPatchLoading}
                        gestureData={gestureData}
                      />
                  </div>
                  <div className="flex-1 max-w-[500px] aspect-square bg-black/40 border-4 border-white/5 rounded-xl shadow-2xl relative overflow-hidden">
                     <div className="flex-1 p-4 pt-10 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 gap-1">
                          {(settings.patchCategory === 'User' as any ? Object.keys(userPresets) : PATCH_LIBRARY[settings.patchCategory])?.map((pName) => (
                            <button key={pName} onClick={() => selectPatch(settings.patchCategory as any, pName)} className={`w-full flex justify-between items-center px-4 py-3 text-xs font-mono transition-all border ${settings.patch === pName ? 'border-white bg-white/5' : 'border-transparent'}`} style={{ color: settings.patch === pName ? 'var(--theme-text)' : 'var(--theme-sub)' }}>
                              <span className="uppercase font-bold">{pName}</span>
                              {settings.patch === pName && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', boxShadow: `0 0 10px var(--theme-glow)` }} />}
                            </button>
                          ))}
                        </div>
                     </div>
                     <div className="h-12 flex bg-black/80 border-t border-white/10 shrink-0">
                        {categories.map(cat => (
                          <button key={cat} onClick={() => updateSetting('patchCategory', cat as any)} className={`flex-1 h-full text-[10px] font-bold uppercase transition-all ${settings.patchCategory === cat ? 'bg-white/10' : ''}`} style={{ color: settings.patchCategory === cat ? 'var(--theme-accent)' : 'var(--theme-sub)' }}>{cat}</button>
                        ))}
                     </div>
                  </div>
                </div>

                {/* PAGE 2: Mod Matrix */}
                <div className="min-w-full h-full flex items-center justify-center p-12">
                   <div className="w-full max-w-4xl">
                      <ModMatrix routes={settings.modMatrix} onChange={(newRoutes) => updateSetting('modMatrix', newRoutes)} theme={{ accent: theme.accent, text: theme.text, sub: theme.sub }} />
                   </div>
                </div>

                {/* PAGE 3: XY Pad */}
                <div className="min-w-full h-full flex items-center justify-center gap-12 p-12">
                   <XYPad xTarget={settings.xyPadXTarget} yTarget={settings.xyPadYTarget} value={settings.xyPadValue} onValueChange={(val) => { handleXYChange('x', val.x); handleXYChange('y', val.y); }} onTargetChange={(axis, target) => updateSetting(axis === 'x' ? 'xyPadXTarget' : 'xyPadYTarget', target)} theme={{ accent: theme.accent, text: theme.text, glow: theme.glow }} />
                   <button onClick={() => setChordMode(!chordMode)} className="py-8 px-12 border font-label text-sm uppercase" style={{ borderColor: 'var(--theme-accent)', color: chordMode ? 'black' : 'var(--theme-sub)', backgroundColor: chordMode ? 'var(--theme-accent)' : 'transparent' }}>Chord_Eng: {chordMode ? 'On' : 'Off'}</button>
                </div>

                {/* PAGE 4 & 5: Engine Controls */}
                <div className="min-w-full h-full flex items-center justify-center gap-12 p-12">
                   <div className="grid grid-cols-2 gap-12 bg-black/20 p-12 border border-white/10 rounded-xl">
                      <Knob label="Filter" min={50} max={10000} value={settings.cutoff} onChange={(v) => updateSetting('cutoff', v)} accent={theme.accent} />
                      <Knob label="Resonance" min={0.1} max={10} value={settings.resonance} onChange={(v) => updateSetting('resonance', v)} accent={theme.accent} />
                      <Knob label="LFO Rate" min={0.1} max={20} value={settings.lfoRate} onChange={(v) => updateSetting('lfoRate', v)} accent={theme.accent} />
                      <Knob label="Glide" min={0} max={1} value={settings.glide} onChange={(v) => updateSetting('glide', v)} accent={theme.accent} />
                   </div>
                </div>

                <div className="min-w-full h-full flex items-center justify-center gap-12 p-12">
                   <div className="flex gap-12 items-end bg-black/20 p-12 border border-white/10 rounded-xl">
                      <Slider label="Attack" min={0.01} max={2} value={settings.attack} onChange={(v) => updateSetting('attack', v)} accent={theme.accent} />
                      <Slider label="Release" min={0.1} max={5} value={settings.release} onChange={(v) => updateSetting('release', v)} accent={theme.accent} />
                      <div className="w-[1px] h-full bg-white/5 mx-4" />
                      <Knob label="Reverb" min={0} max={1} value={settings.reverb} onChange={(v) => updateSetting('reverb', v)} accent={theme.accent} />
                      <Knob label="Delay" min={0} max={0.9} value={settings.delayFeedback} onChange={(v) => updateSetting('delayFeedback', v)} accent={theme.accent} />
                   </div>
                </div>

                {/* PAGE 6: Save */}
                <div className="min-w-full h-full flex items-center justify-center p-12">
                   <div className="bg-black/40 p-10 border border-white/10 rounded-xl w-full max-w-xl">
                      <h3 className="text-sm font-label mb-6" style={{ color: 'var(--theme-accent)' }}>Save_Preset</h3>
                      <div className="flex gap-4">
                        <input type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="NAME..." className="flex-1 bg-black font-mono text-sm px-4 border border-white/10 outline-none uppercase" style={{ color: 'var(--theme-accent)' }} />
                        <button onClick={() => {}} className="text-black text-xs font-bold px-8 py-3 rounded uppercase" style={{ backgroundColor: 'var(--theme-accent)' }}>Commit</button>
                      </div>
                   </div>
                </div>

                {/* PAGE 7: AirWave */}
                <div className="min-w-full h-full flex items-center justify-center p-12">
                  <GestureControl 
                    enabled={settings.gestureControlEnabled} 
                    onToggle={(val) => updateSetting('gestureControlEnabled', val)}
                    onGestureUpdate={setGestureData}
                    themeColor={theme.accent}
                    settings={settings}
                    gestureData={gestureData}
                  />
                </div>
              </div>
            </div>

            <div className="h-12 flex justify-center items-center gap-8 bg-black/60 border-t border-black shrink-0 z-50">
               <button onClick={prevPage} className="font-label text-white/30 text-[10px]">« PREV</button>
               <div className="flex gap-3">
                 {[...Array(totalPages)].map((_, i) => (
                   <button key={i} onClick={() => setActivePage(i)} className={`w-3 h-3 border border-black rounded-sm transition-all ${activePage === i ? 'scale-125' : 'opacity-40'}`} style={{ backgroundColor: activePage === i ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)' }} />
                 ))}
               </div>
               <button onClick={nextPage} className="font-label text-white/30 text-[10px]">NEXT »</button>
            </div>

            <div className="h-[350px] flex border-t-2 border-black bg-black shrink-0 z-50">
               <div className="w-32 bg-zinc-900 border-r-4 border-black flex flex-col items-center justify-around py-8 shrink-0">
                  <PitchWheel value={settings.pitchBend} onChange={(v) => updateSetting('pitchBend', v)} />
                  <button onClick={() => updateSetting('arpEnabled', !settings.arpEnabled)} className={`w-14 h-14 rounded border flex flex-col items-center justify-center ${settings.arpEnabled ? 'bg-white/5' : 'bg-white/2'}`} style={{ borderColor: settings.arpEnabled ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)' }}>
                    <span className="text-[8px] font-label text-white/40">ARP</span>
                    <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: settings.arpEnabled ? 'var(--theme-accent)' : '#111' }} />
                  </button>
                  <div className={`mt-2 text-[8px] font-mono transition-all duration-300 ${settings.sustain ? 'text-cyan-500 opacity-100' : 'text-zinc-800 opacity-20'}`}>
                    SUSTAIN
                  </div>
               </div>
               <div className="flex-1 overflow-hidden">
                  <Keyboard settings={settings} chordMode={chordMode} isLarge themeColor={theme.accent} accentColor={theme.accent} />
               </div>
            </div>
          </div>
          <div className={`hidden lg:block w-8 ${settings.theme === 'Ancient' ? 'bg-[#3b2a1a]' : 'wood-panel'} h-full border-l border-black`} />
        </div>
      </div>
    </div>
  );
};

export default App;
