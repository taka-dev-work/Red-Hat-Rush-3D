import React, { useEffect, useRef, useState, useCallback } from 'react';

interface MusicPlayerProps {
  isPlaying: boolean;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isPlaying }) => {
  const [muted, setMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const masterGainRef = useRef<GainNode | null>(null);

  // Sync ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    if (isPlaying) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      // Reset scheduler if starting fresh
      if (!timerIDRef.current) {
        nextNoteTimeRef.current = audioCtxRef.current?.currentTime || 0;
        scheduler();
      }
    } else {
      if (timerIDRef.current) {
        window.clearTimeout(timerIDRef.current);
        timerIDRef.current = null;
      }
      // Stop all sound immediately
      if (masterGainRef.current) {
         masterGainRef.current.gain.cancelScheduledValues(0);
         masterGainRef.current.gain.setValueAtTime(0, audioCtxRef.current?.currentTime || 0);
      }
    }
  }, [isPlaying]);

  // Handle Mute
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime;
        masterGainRef.current.gain.cancelScheduledValues(now);
        masterGainRef.current.gain.setTargetAtTime(muted || !isPlaying ? 0 : 0.3, now, 0.1);
    }
  }, [muted, isPlaying]);

  const initAudio = () => {
    if (audioCtxRef.current) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    nextNoteTimeRef.current = ctx.currentTime + 0.1;
  };

  // --- SYNTH INSTRUMENTS ---

  const playKick = (time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(masterGainRef.current);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

    osc.start(time);
    osc.stop(time + 0.5);
  };

  const playHiHat = (time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    // Create noise buffer
    const bufferSize = ctx.sampleRate * 0.1; // 0.1 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Bandpass filter for "crisp" sound
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 8000;

    const gain = ctx.createGain();
    
    noise.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(masterGainRef.current);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.start(time);
  };

  const playBass = (time: number, freq: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.linearRampToValueAtTime(0, time + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current);

    osc.start(time);
    osc.stop(time + 0.25);
  };

  const playLead = (time: number, freq: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

    osc.connect(gain);
    gain.connect(masterGainRef.current);

    osc.start(time);
    osc.stop(time + 0.4);
  };

  // --- SEQUENCER ---
  
  const scheduler = () => {
    if (!isPlayingRef.current) return;

    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // While there are notes that will need to play before the next interval, schedule them
    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      scheduleNote(beatCountRef.current, nextNoteTimeRef.current);
      nextNoteTimeRef.current += 0.125; // 8th notes at ~120bpm (0.125s is fast, let's adjust)
      // Actually 120BPM = 0.5s per beat. 8th note = 0.25s.
      // Let's do 140BPM = 0.428s per beat. 8th note = 0.214s.
      // Let's stick to a fixed time for stability.
      nextNoteTimeRef.current += 0.20; // 5 notes per second roughly
      beatCountRef.current++;
    }

    timerIDRef.current = window.setTimeout(scheduler, 25);
  };

  const scheduleNote = (beat: number, time: number) => {
    // 16 beat measure loop
    const measurePos = beat % 32;

    // --- DRUMS ---
    if (measurePos % 4 === 0) playKick(time); // Kick on 1, 5, 9, 13
    if (measurePos % 4 === 2) playHiHat(time); // Hat on off-beats roughly

    // --- BASS (C Minor / Pop progression: Cm - Ab - Fm - G) ---
    // Frequencies: C2=65.41, Ab1=51.91, F1=43.65, G1=49.00
    let bassNote = 0;
    if (measurePos < 8) bassNote = 65.41; // Cm
    else if (measurePos < 16) bassNote = 51.91; // Ab
    else if (measurePos < 24) bassNote = 43.65; // Fm
    else bassNote = 49.00; // G

    // Play bass on beats 0, 2, 4... (8th notes, so every other tick usually, but here every tick is 8th)
    if (measurePos % 2 === 0) playBass(time, bassNote);

    // --- LEAD MELODY (Arpeggios) ---
    // Simple Arp pattern
    const scale = [
        bassNote * 4, // Root (octave up)
        bassNote * 4 * 1.25, // Major 3rd approx (actually just use scale ratios)
        bassNote * 4 * 1.5, // 5th
        bassNote * 8 // Octave
    ];
    
    // Play melody randomly or patterned
    if (measurePos % 2 !== 0 || Math.random() > 0.3) {
        const noteIdx = Math.floor(measurePos / 2) % 4; // Simple Up pattern
        // Variation
        const finalNote = scale[noteIdx] * (measurePos % 7 === 0 ? 1.5 : 1);
        playLead(time, finalNote);
    }
  };

  // Init on mount or interaction, but don't play until isPlaying is true
  useEffect(() => {
    initAudio();
    return () => {
        if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
        if (audioCtxRef.current) audioCtxRef.current.close();
    }
  }, []);

  if (!isPlaying && !muted) return null; // Hide controls if not playing? No, maybe always show.

  return (
    <button 
        onClick={() => setMuted(!muted)}
        className="fixed top-4 right-4 z-50 bg-black/50 text-white p-3 rounded-full backdrop-blur-md hover:bg-white/20 transition-all border border-white/10"
        title={muted ? "Unmute Music" : "Mute Music"}
    >
        {muted ? "🔇" : "🔊"}
    </button>
  );
};

export default MusicPlayer;
