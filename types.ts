
export type PatchCategory = 'Lead' | 'Pad' | 'Bass' | 'Keys' | 'Strings';

export type ModSource = 'LFO' | 'ENV' | 'Gesture_L_H' | 'Gesture_L_V' | 'Gesture_R_H' | 'Gesture_R_V' | 'Gesture_Dist';
export type ModDestination = 'Cutoff' | 'Resonance' | 'Pitch' | 'Gain' | 'Reverb' | 'Delay';

export type XYTarget = 'None' | 'Cutoff' | 'Resonance' | 'Reverb' | 'Delay' | 'LFO Rate';
export type KeySlideTarget = 'Cutoff' | 'Resonance' | 'Pitch' | 'Vibrato';

export type VisualizerMode = 'Waveform' | 'Spectrum' | 'Circle' | 'Pulse' | 'Gesture_Map';
export type ColorTheme = 'Classic' | 'Cyberpunk' | 'Modern' | 'Monochrome' | 'Inverted' | 'Retro' | 'Ancient';

export interface ModRoute {
  source: ModSource;
  destination: ModDestination;
  amount: number; // -1 to 1 range
}

export interface HandGesture {
  x: number;
  y: number;
  active: boolean;
  gesture: string;
  isPincer: boolean;
  isClosed: boolean;
}

export interface GestureState {
  leftHand: HandGesture;
  rightHand: HandGesture;
  distance: number;
}

export interface SynthSettings {
  patch: string;
  patchCategory: PatchCategory;
  cutoff: number;
  resonance: number;
  reverb: number;
  attack: number;
  release: number;
  detune: number;
  theme: ColorTheme;
  // Modulation & FX
  lfoRate: number;
  lfoDepth: number;
  delayTime: number;
  delayFeedback: number;
  arpEnabled: boolean;
  arpRate: number;
  octave: number;
  // Performance
  pitchBend: number;
  glide: number;
  monoMode: boolean;
  // Modulation Matrix
  modMatrix: ModRoute[];
  // XY Pad
  xyPadXTarget: XYTarget;
  xyPadYTarget: XYTarget;
  xyPadValue: { x: number; y: number }; // 0 to 1
  visualizerMode: VisualizerMode;
  // Key Slide (MPE-style)
  keySlideTarget: KeySlideTarget;
  // Gesture Control
  gestureControlEnabled: boolean;
  sustain: boolean;
}

export interface PatchInfo {
  name: string;
  description: string;
  mood: string;
  usageTips: string[];
}
