
import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import { KEY_MAP, FREQUENCIES } from '../constants';
import { audioService } from '../services/audioService';
import { SynthSettings } from '../types';

interface KeyboardProps {
  settings: SynthSettings;
  chordMode: boolean;
  isLarge?: boolean;
  themeColor: string;
  accentColor: string;
}

interface KeyProps {
  note: string;
  isActive: boolean;
  onStart: (note: string, slide: number) => void;
  onEnd: (note: string) => void;
  isBlack?: boolean;
  leftOffset?: string;
  themeColor: string;
  accentColor: string;
}

const Key = memo(({ note, isActive, onStart, onEnd, isBlack, leftOffset, themeColor, accentColor }: KeyProps) => {
  const [slide, setSlide] = useState(0.5);
  const ref = useRef<HTMLDivElement>(null);

  const updateSlide = useCallback((clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const newSlide = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    setSlide(newSlide);
    audioService.updateNoteSlide(note, newSlide);
  }, [note]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const initialSlide = 1 - (e.clientY - rect.top) / rect.height;
    setSlide(initialSlide);
    onStart(note, initialSlide);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive) return;
    updateSlide(e.clientY);
  };

  // Modern flat key styles
  const baseClasses = isBlack 
    ? `absolute top-0 w-[28px] sm:w-[36px] md:w-[46px] h-[60%] border-x border-b border-black select-none touch-none -translate-x-1/2 cursor-crosshair`
    : `relative flex-1 h-full border-r border-zinc-800 select-none touch-none cursor-crosshair`;

  // Updated Z-Index logic: Black keys (base 20) are always above White keys (base 10)
  const zIndex = isBlack ? (isActive ? 22 : 21) : (isActive ? 11 : 10);

  const keyStyle: React.CSSProperties = {
    backgroundColor: isActive ? themeColor : (isBlack ? '#1a1a1a' : '#fcfcfc'),
    boxShadow: isActive ? `0 0 30px ${themeColor}aa, inset 0 0 10px rgba(255,255,255,0.5)` : 'none',
    zIndex: zIndex,
  };

  return (
    <div
      ref={ref}
      style={{ 
        ...(isBlack ? { left: leftOffset } : {}),
        ...keyStyle
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => onEnd(note)}
      onPointerCancel={() => onEnd(note)}
      className={baseClasses}
    >
      {/* Vertical Modulation Indicator (Subtle line) */}
      {isActive && (
        <div 
          className="absolute left-0 w-full pointer-events-none"
          style={{ 
            bottom: 0,
            height: `${slide * 100}%`, 
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderTop: '2px solid rgba(255,255,255,0.8)'
          }}
        />
      )}

      {/* Note Label */}
      <span 
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 font-mono font-bold text-[9px] uppercase tracking-tighter pointer-events-none transition-colors duration-100 ${isActive ? 'text-black' : (isBlack ? 'text-zinc-600' : 'text-zinc-400')}`}
      >
        {note}
      </span>
      
      {/* Indicator Dot */}
      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full border border-black/20"
        style={{ backgroundColor: isActive ? 'white' : (isBlack ? '#000' : '#ddd') }}
      />
    </div>
  );
});

const Keyboard: React.FC<KeyboardProps> = ({ settings, chordMode, themeColor, accentColor }) => {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const activeNotesRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const getChordNotes = useCallback((rootNote: string) => {
    if (!chordMode) return [rootNote];
    const notesArray = Object.keys(FREQUENCIES);
    const rootIndex = notesArray.indexOf(rootNote);
    if (rootIndex === -1) return [rootNote];
    const third = notesArray[rootIndex + 4] || rootNote;
    const fifth = notesArray[rootIndex + 7] || rootNote;
    return [rootNote, third, fifth];
  }, [chordMode]);

  const handleNoteStart = useCallback((note: string, slide: number) => {
    const notesToPlay = getChordNotes(note);
    setActiveNotes(prev => {
      const next = new Set(prev);
      notesToPlay.forEach(n => {
        next.add(n);
        if (!settings.arpEnabled) audioService.playNote(n, settings, 0.4, slide);
      });
      return next;
    });
  }, [getChordNotes, settings]);

  const handleNoteEnd = useCallback((note: string) => {
    const notesToStop = getChordNotes(note);
    setActiveNotes(prev => {
      const next = new Set(prev);
      notesToStop.forEach(n => {
        next.delete(n);
        if (!settings.arpEnabled) audioService.stopNote(n, settings);
      });
      return next;
    });
  }, [getChordNotes, settings]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note && !activeNotesRef.current.has(note)) handleNoteStart(note, 0.5);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const note = KEY_MAP[e.key.toLowerCase()];
      if (note) handleNoteEnd(note);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleNoteStart, handleNoteEnd]);

  useEffect(() => { activeNotesRef.current = activeNotes; }, [activeNotes]);

  const whiteNotes: string[] = [];
  const blackNotes: { note: string, whiteIndex: number }[] = [];
  const notePattern = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let whiteCounter = 0;
  for (let octave = 3; octave <= 4; octave++) {
    notePattern.forEach((note) => {
      const fullNote = `${note}${octave}`;
      if (!note.includes('#')) {
        whiteNotes.push(fullNote);
        whiteCounter++;
      } else {
        blackNotes.push({ note: fullNote, whiteIndex: whiteCounter });
      }
    });
  }
  whiteNotes.push('C5');

  return (
    <div className="relative w-full h-full bg-zinc-950 flex flex-col">
      <div 
        ref={containerRef}
        className="relative flex-1 flex touch-none overflow-hidden select-none"
      >
        <div className="flex-1 flex relative w-full">
          {whiteNotes.map((note) => (
            <Key 
              key={note}
              note={note}
              isActive={activeNotes.has(note)}
              onStart={handleNoteStart}
              onEnd={handleNoteEnd}
              themeColor={themeColor}
              accentColor={accentColor}
            />
          ))}
          {blackNotes.map((bn) => {
            const totalWhite = whiteNotes.length;
            const leftOffset = `${(bn.whiteIndex / totalWhite) * 100}%`;
            return (
              <Key 
                key={bn.note}
                note={bn.note}
                isActive={activeNotes.has(bn.note)}
                onStart={handleNoteStart}
                onEnd={handleNoteEnd}
                isBlack
                leftOffset={leftOffset}
                themeColor={themeColor}
                accentColor={accentColor}
              />
            );
          })}
        </div>
      </div>
      
      {/* Legend Footer */}
      <div className="h-6 flex items-center justify-between px-4 border-t border-zinc-900 bg-black/40 pointer-events-none">
         <span className="text-[7px] font-mono text-zinc-700">SOLID_STATE_MODULATION</span>
         <div className="flex gap-4">
           <span className="text-[7px] font-mono text-zinc-700">MPE_READY</span>
           <span className="text-[7px] font-mono text-zinc-700 uppercase">MODEL_G85_SYSTEMS</span>
         </div>
      </div>
    </div>
  );
};

export default Keyboard;
