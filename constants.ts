
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const KEY_MAP: Record<string, string> = {
  'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3', 'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3',
  'a': 'C4', 'w': 'C#4', 'e': 'D4', 'r': 'D#4', 't': 'E4', 'y': 'F4', 'u': 'F#4', 'i': 'G4', 'o': 'G#4', 'p': 'A4', '[': 'A#4', ']': 'B4',
};

const generateFrequencies = () => {
  const freqs: Record<string, number> = {};
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  for (let octave = 0; octave <= 8; octave++) {
    notes.forEach((note, i) => {
      const key = `${note}${octave}`;
      const a4 = 440;
      const semiFromA4 = (octave - 4) * 12 + (i - 9);
      freqs[key] = a4 * Math.pow(2, semiFromA4 / 12);
    });
  }
  return freqs;
};

export const FREQUENCIES = generateFrequencies();

export const PATCH_LIBRARY: Record<string, string[]> = {
  Lead: ['Neon Saw', 'Square Solo', 'Phase Lead', 'Acid Line'],
  Pad: ['Cloudscape', 'Deep Space', 'Velvet Silk', 'Glass Voices'],
  Bass: ['Sub Punch', 'Growl Bass', 'Fat Moog', 'Reso Pulse'],
  Keys: ['Tine EP', 'Digital Bell', 'Wurly Drive', 'Crystal Tines'],
  Strings: ['Solina Era', 'Orchestral Synth', 'Frozen Strings', 'Bow Echo'],
};

export const INITIAL_SETTINGS = {
  patch: 'Neon Saw',
  patchCategory: 'Lead' as const,
  cutoff: 2000,
  resonance: 1,
  reverb: 0.3,
  attack: 0.1,
  release: 0.5,
  detune: 0,
  theme: 'Classic' as const,
  lfoRate: 5,
  lfoDepth: 0,
  delayTime: 0.3,
  delayFeedback: 0.4,
  arpEnabled: false,
  arpRate: 120,
  octave: 0,
  pitchBend: 0,
  glide: 0.1,
  monoMode: false,
  visualizerMode: 'Waveform' as const,
  keySlideTarget: 'Cutoff' as const,
  modMatrix: [
    { source: 'LFO' as const, destination: 'Cutoff' as const, amount: 0.2 },
    { source: 'ENV' as const, destination: 'Cutoff' as const, amount: 0.5 },
  ],
  xyPadXTarget: 'Cutoff' as const,
  xyPadYTarget: 'Resonance' as const,
  xyPadValue: { x: 0.5, y: 0.5 },
};
