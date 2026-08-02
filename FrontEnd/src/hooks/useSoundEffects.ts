import { useCallback, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export function useSoundEffects() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const { soundEnabled } = useSettings();

    const initContext = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }
    }, []);

    const playHover = useCallback(() => {
        if (!soundEnabled) return;
        initContext();
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.02, ctx.currentTime); // Very quiet
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }, [initContext, soundEnabled]);

    const playClick = useCallback(() => {
        if (!soundEnabled) return;
        initContext();
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Mechanical click sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }, [initContext, soundEnabled]);

    const playScan = useCallback(() => {
        if (!soundEnabled) return;
        initContext();
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        // High-tech terminal typing/scan sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        // Randomize frequency slightly for a "data processing" feel
        const freq = 800 + Math.random() * 400;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    }, [initContext, soundEnabled]);

    const playStartup = useCallback(() => {
        if (!soundEnabled) return;
        initContext();
        const ctx = audioContextRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});

        // High Voltage / Energy Surge Sound (Electronic Flow)
        const duration = 2.5;

        // 1. The Energy Hum (Low frequency that pitches up and gets louder)
        const humOsc = ctx.createOscillator();
        humOsc.type = 'sawtooth';
        humOsc.frequency.setValueAtTime(40, ctx.currentTime);
        humOsc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + duration);

        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0, ctx.currentTime);
        humGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + duration * 0.8);
        humGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        humOsc.connect(humGain);
        humGain.connect(ctx.destination);
        humOsc.start();
        humOsc.stop(ctx.currentTime + duration);

        // 2. The Electric Flow / Data Stream (High speed electrical buzzing)
        const streamOsc = ctx.createOscillator();
        streamOsc.type = 'square';
        
        // Simulate fast electrical buzzing using an LFO modulating the frequency
        const lfo = ctx.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.setValueAtTime(30, ctx.currentTime); // 30Hz flutter
        lfo.frequency.linearRampToValueAtTime(80, ctx.currentTime + duration); // Gets faster

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 800; // Modulation depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(streamOsc.frequency);
        
        streamOsc.frequency.setValueAtTime(400, ctx.currentTime);
        streamOsc.frequency.linearRampToValueAtTime(2500, ctx.currentTime + duration * 0.8);

        const streamGain = ctx.createGain();
        streamGain.gain.setValueAtTime(0, ctx.currentTime);
        streamGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.1);
        streamGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + duration * 0.8);
        streamGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        // Use a bandpass filter to make it sound thin and electrical
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(5000, ctx.currentTime + duration);
        filter.Q.value = 8;

        streamOsc.connect(filter);
        filter.connect(streamGain);
        streamGain.connect(ctx.destination);

        lfo.start();
        streamOsc.start();
        lfo.stop(ctx.currentTime + duration);
        streamOsc.stop(ctx.currentTime + duration);
    }, [initContext, soundEnabled]);

    return { playHover, playClick, playStartup, playScan };
}
