
import { SynthSettings, ModRoute } from '../types';
import { FREQUENCIES } from '../constants';

interface ActiveOscillator {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  envSource: ConstantSourceNode; 
  slideSource: ConstantSourceNode; 
  modGains: GainNode[]; 
  baseFreq: number;
  released: boolean;
}

class AudioService {
  private ctx: AudioContext | null = null;
  private reverbNode: ConvolverNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackNode: GainNode | null = null;
  private mainGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeOscillators: Map<string, ActiveOscillator> = new Map();
  private arpTimer: number | null = null;
  private activeNotesForArp: string[] = [];
  private currentArpIndex: number = 0;
  private currentPitchBend: number = 0;
  private lastFrequency: number | null = null;
  private currentSustain: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: 'interactive' });
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.value = 0.5;

    this.reverbNode = this.ctx.createConvolver();
    await this.createImpulseResponse();

    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedbackNode = this.ctx.createGain();
    
    this.delayNode.connect(this.delayFeedbackNode);
    this.delayFeedbackNode.connect(this.delayNode);

    this.mainGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.mainGain.connect(this.reverbNode);
    this.reverbNode.connect(this.analyser);

    this.mainGain.connect(this.delayNode);
    this.delayNode.connect(this.analyser);
  }

  private async createImpulseResponse() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    for (let i = 0; i < 2; i++) {
      const channelData = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 2.5);
      }
    }
    if (this.reverbNode) this.reverbNode.buffer = impulse;
  }

  public getAnalyserData(dataArray: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(dataArray);
    }
  }

  private getBentFrequency(baseFreq: number): number {
    const bendRange = 2;
    return baseFreq * Math.pow(2, (this.currentPitchBend * bendRange) / 12);
  }

  public setPitchBend(value: number) {
    this.currentPitchBend = value;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    this.activeOscillators.forEach((entry) => {
      const bentFreq = this.getBentFrequency(entry.baseFreq);
      entry.osc1.frequency.setTargetAtTime(bentFreq, now, 0.03);
      entry.osc2.frequency.setTargetAtTime(bentFreq, now, 0.03);
    });
  }

  public updateNoteSlide(note: string, slide: number) {
    const entry = this.activeOscillators.get(note);
    if (!entry || !this.ctx) return;
    const now = this.ctx.currentTime;
    entry.slideSource.offset.setTargetAtTime(slide, now, 0.01);
  }

  public playNote(note: string, settings: SynthSettings, velocity: number = 0.4, initialSlide: number = 0.5) {
    if (!this.ctx || !this.mainGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const noteParts = note.match(/([A-G#]+)(\d+)/);
    let shiftedNote = note;
    if (noteParts) {
      const octave = parseInt(noteParts[2]) + settings.octave;
      shiftedNote = `${noteParts[1]}${octave}`;
    }

    const baseFreq = FREQUENCIES[shiftedNote];
    if (!baseFreq) return;

    const now = this.ctx.currentTime;
    const targetFreq = this.getBentFrequency(baseFreq);

    if (settings.monoMode && this.activeOscillators.size > 0) {
      const [existingNote, entry] = this.activeOscillators.entries().next().value;
      entry.osc1.frequency.cancelScheduledValues(now);
      entry.osc2.frequency.cancelScheduledValues(now);
      if (settings.glide > 0) {
        entry.osc1.frequency.exponentialRampToValueAtTime(targetFreq, now + settings.glide);
        entry.osc2.frequency.exponentialRampToValueAtTime(targetFreq, now + settings.glide);
      } else {
        entry.osc1.frequency.setValueAtTime(targetFreq, now);
        entry.osc2.frequency.setValueAtTime(targetFreq, now);
      }
      entry.baseFreq = baseFreq;
      entry.released = false;
      if (existingNote !== note) {
        this.activeOscillators.delete(existingNote);
        this.activeOscillators.set(note, entry);
      }
      this.lastFrequency = targetFreq;
      this.updateNoteSlide(note, initialSlide);
      return;
    }

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const envSource = this.ctx.createConstantSource();
    const slideSource = this.ctx.createConstantSource();
    const noteGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    switch (settings.patchCategory) {
      case 'Lead': 
        osc1.type = 'sawtooth'; osc2.type = 'square'; 
        osc2.detune.setValueAtTime(settings.detune + 12, now); 
        break;
      case 'Pad': 
        osc1.type = 'sine'; osc2.type = 'sawtooth'; 
        osc2.detune.setValueAtTime(settings.detune + 7, now); 
        break;
      case 'Bass': 
        osc1.type = 'square'; osc2.type = 'sawtooth'; 
        osc2.detune.setValueAtTime(-1200, now); 
        break;
      case 'Keys': 
        osc1.type = 'sine'; osc2.type = 'sine'; 
        osc2.detune.setValueAtTime(1200, now); 
        break;
      case 'Strings': 
        osc1.type = 'sawtooth'; osc2.type = 'sawtooth'; 
        osc2.detune.setValueAtTime(settings.detune + 5, now); 
        break;
    }

    const startFreq = (settings.glide > 0 && this.lastFrequency) ? this.lastFrequency : targetFreq;
    osc1.frequency.setValueAtTime(startFreq, now);
    osc2.frequency.setValueAtTime(startFreq, now);
    if (settings.glide > 0 && this.lastFrequency) {
      osc1.frequency.exponentialRampToValueAtTime(targetFreq, now + settings.glide);
      osc2.frequency.exponentialRampToValueAtTime(targetFreq, now + settings.glide);
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(settings.cutoff, now);
    filter.Q.setValueAtTime(settings.resonance * 8, now);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(settings.lfoRate, now);
    lfo.start();

    envSource.offset.setValueAtTime(0, now);
    envSource.offset.linearRampToValueAtTime(1, now + Math.max(0.005, settings.attack));
    envSource.start();

    slideSource.offset.setValueAtTime(initialSlide, now);
    slideSource.start();

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(velocity, now + Math.max(0.005, settings.attack));

    const modGains: GainNode[] = [];
    
    settings.modMatrix.forEach(route => {
      const modGain = this.ctx!.createGain();
      let scale = 1;
      let target: AudioParam | null = null;
      switch(route.destination) {
        case 'Cutoff': scale = 6000; target = filter.frequency; break;
        case 'Resonance': scale = 15; target = filter.Q; break;
        case 'Pitch': scale = 800; target = osc1.frequency; break;
        case 'Gain': scale = 0.5; target = noteGain.gain; break;
      }
      if (target) {
        modGain.gain.setValueAtTime(route.amount * scale, now);
        if (route.source === 'LFO') lfo.connect(modGain);
        else if (route.source === 'ENV') envSource.connect(modGain);
        modGain.connect(target);
        modGains.push(modGain);
      }
    });

    const expressionGain = this.ctx.createGain();
    let eScale = 0;
    let eTarget: AudioParam | null = null;
    switch(settings.keySlideTarget) {
      case 'Cutoff': eScale = 12000; eTarget = filter.frequency; break;
      case 'Resonance': eScale = 30; eTarget = filter.Q; break;
      case 'Pitch': eScale = 2400; eTarget = osc1.frequency; break;
      case 'Vibrato': eScale = 20; eTarget = lfo.frequency; break;
    }
    if (eTarget) {
      expressionGain.gain.setValueAtTime(eScale, now);
      slideSource.connect(expressionGain);
      expressionGain.connect(eTarget);
      modGains.push(expressionGain);
    }

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(this.mainGain);

    osc1.start(now);
    osc2.start(now);

    this.activeOscillators.set(note, { osc1, osc2, gain: noteGain, filter, lfo, envSource, slideSource, modGains, baseFreq, released: false });
    this.lastFrequency = targetFreq;
  }

  public stopNote(note: string, settings: SynthSettings, immediate: boolean = false) {
    const entry = this.activeOscillators.get(note);
    if (!entry || !this.ctx) return;

    // Sustain logic
    if (this.currentSustain && !immediate) {
      entry.released = true;
      return;
    }

    const { osc1, osc2, gain, lfo, envSource, slideSource, modGains } = entry;
    const now = this.ctx.currentTime;
    
    const releaseTime = immediate ? 0.01 : settings.release;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);

    envSource.offset.cancelScheduledValues(now);
    envSource.offset.setValueAtTime(envSource.offset.value, now);
    envSource.offset.exponentialRampToValueAtTime(0.001, now + releaseTime);

    osc1.stop(now + releaseTime + 0.1);
    osc2.stop(now + releaseTime + 0.1);
    lfo.stop(now + releaseTime + 0.1);
    envSource.stop(now + releaseTime + 0.1);
    slideSource.stop(now + releaseTime + 0.1);

    setTimeout(() => {
      osc1.disconnect(); osc2.disconnect(); gain.disconnect(); lfo.disconnect(); envSource.disconnect(); slideSource.disconnect();
      modGains.forEach(mg => mg.disconnect());
      if (this.activeOscillators.get(note) === entry) {
        this.activeOscillators.delete(note);
      }
    }, (releaseTime + 0.2) * 1000);
  }

  public updateGlobalParams(settings: SynthSettings) {
    if (!this.ctx || !this.delayNode || !this.delayFeedbackNode) return;
    const now = this.ctx.currentTime;
    
    // Check for sustain release
    if (this.currentSustain && !settings.sustain) {
      this.currentSustain = false;
      this.activeOscillators.forEach((entry, note) => {
        if (entry.released) this.stopNote(note, settings);
      });
    }
    this.currentSustain = settings.sustain;

    this.delayNode.delayTime.setTargetAtTime(settings.delayTime, now, 0.1);
    this.delayFeedbackNode.gain.setTargetAtTime(settings.delayFeedback, now, 0.1);

    this.activeOscillators.forEach((entry) => {
      entry.filter.frequency.setTargetAtTime(settings.cutoff, now, 0.05);
      entry.filter.Q.setTargetAtTime(settings.resonance * 8, now, 0.05);
      entry.lfo.frequency.setTargetAtTime(settings.lfoRate, now, 0.05);
    });
    
    if (settings.pitchBend !== this.currentPitchBend) {
      this.setPitchBend(settings.pitchBend);
    }
  }

  public startArp(notes: string[], settings: SynthSettings) {
    this.activeNotesForArp = [...notes].sort();
    if (this.arpTimer) return;
    const tick = () => {
      if (this.activeNotesForArp.length === 0) { this.stopArp(); return; }
      const note = this.activeNotesForArp[this.currentArpIndex];
      this.playNote(note, settings, 0.3);
      const duration = (60 / settings.arpRate) * 0.8;
      setTimeout(() => this.stopNote(note, settings), duration * 1000);
      this.currentArpIndex = (this.currentArpIndex + 1) % this.activeNotesForArp.length;
      this.arpTimer = window.setTimeout(tick, (60 / settings.arpRate) * 1000);
    };
    tick();
  }

  public stopArp() {
    if (this.arpTimer) { clearTimeout(this.arpTimer); this.arpTimer = null; }
    this.currentArpIndex = 0;
  }
}

export const audioService = new AudioService();
