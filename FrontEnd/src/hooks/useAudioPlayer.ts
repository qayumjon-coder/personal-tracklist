import { useEffect, useRef, useState, useCallback } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { incrementPlayCount } from "../services/musicApi";
import type { Song } from "../types/Song";

export type RepeatMode = "off" | "one" | "all";
export type AudioEffect = "none" | "underwater" | "radio" | "8d" | "bass-boost" | "echo";

export function useAudioPlayer(songs: { url: string; id?: number; title?: string; artist?: string; coverUrl?: string }[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(() => {
    const saved = localStorage.getItem('fronto_playback_rate');
    return saved ? parseFloat(saved) : 1;
  });
  // Queue: songs to play next (session-only, not persisted)
  const [queue, setQueue] = useState<Song[]>([]);

  const { autoplay, crossfade } = useSettings();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(70);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const countedSongIdRef = useRef<number | null>(null);

  // Equalizer State
  const [eq, setEq] = useState({ bass: 0, mid: 0, treble: 0 });
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);

  // FX State
  const [activeEffect, setActiveEffectState] = useState<AudioEffect>("none");
  const effectNodesRef = useRef<{
    underwater: BiquadFilterNode | null;
    radio: BiquadFilterNode | null;
    panner: StereoPannerNode | null;
    eightDLowpass: BiquadFilterNode | null;
    eightDReverb: DelayNode | null;
    eightDReverbGain: GainNode | null;
    bassBoost: BiquadFilterNode | null;
    echoDelay: DelayNode | null;
    echoGain: GainNode | null;
  }>({ underwater: null, radio: null, panner: null, eightDLowpass: null, eightDReverb: null, eightDReverbGain: null, bassBoost: null, echoDelay: null, echoGain: null });
  const pannerRafRef = useRef<number | null>(null);

  // 1. Initialize Audio Element and Context
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const setupContext = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 250;
        bassFilter.gain.value = 0;

        const midFilter = ctx.createBiquadFilter();
        midFilter.type = 'peaking';
        midFilter.frequency.value = 1000;
        midFilter.Q.value = 1;
        midFilter.gain.value = 0;

        const trebleFilter = ctx.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 4000;
        trebleFilter.gain.value = 0;

        // FX Nodes
        const underwater = ctx.createBiquadFilter();
        underwater.type = 'lowpass';
        underwater.frequency.value = 300;

        const radio = ctx.createBiquadFilter();
        radio.type = 'bandpass';
        radio.frequency.value = 1500;
        radio.Q.value = 1.5;

        const panner = ctx.createStereoPanner();
        const eightDLowpass = ctx.createBiquadFilter();
        eightDLowpass.type = 'lowpass';
        eightDLowpass.frequency.value = 20000;
        
        const eightDReverb = ctx.createDelay();
        eightDReverb.delayTime.value = 0.05; // 50ms room delay
        const eightDReverbGain = ctx.createGain();
        eightDReverbGain.gain.value = 0.3;
        eightDReverb.connect(eightDReverbGain);
        eightDReverbGain.connect(eightDReverb);
        
        const bassBoost = ctx.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.value = 150;
        bassBoost.gain.value = 15;

        const echoDelay = ctx.createDelay();
        echoDelay.delayTime.value = 0.3; // 300ms
        const echoGain = ctx.createGain();
        echoGain.gain.value = 0.4; // feedback amount

        const source = ctx.createMediaElementSource(audio);
        source.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(analyser); // Default route
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        bassFilterRef.current = bassFilter;
        midFilterRef.current = midFilter;
        trebleFilterRef.current = trebleFilter;
        effectNodesRef.current = { 
          underwater, radio, panner, eightDLowpass, eightDReverb, eightDReverbGain, 
          bassBoost, echoDelay, echoGain 
        };
      } catch (e) {
        console.error("Audio Context Error:", e);
      }
    };

    setupContext();

    const handlePlay = () => { setPlaying(true); setAudioError(null); };
    const handlePause = () => setPlaying(false);
    const handleError = () => {
      if (!audio.src || audio.src === window.location.href || audio.src.endsWith('/')) {
        return; // Ignore error caused by emptying the src
      }
      // Ignore Abort errors (code 1) which happen when switching tracks rapidly
      if (audio.error && audio.error.code === 1) {
        return;
      }
      // Retry logic for potential Chrome CORS cache bug or stale cached media
      if (audio.error && (audio.error.code === 3 || audio.error.code === 4)) {
        if (audio.src.startsWith('http') && !audio.src.includes('?cb=')) {
          console.warn("Retrying with cache buster due to error:", audio.error);
          const separator = audio.src.includes('?') ? '&' : '?';
          audio.src = audio.src + separator + 'cb=' + Date.now();
          audio.load();
          audio.play().catch(console.error);
          return;
        }
      }

      console.error("Audio Element Error:", audio.error);
      setPlaying(false);
      setAudioError('AUDIO PLAYBACK FAILED. THE FILE MAY BE CORRUPTED OR UNSUPPORTED.');
    };
    const handleTimeUpdate = () => {
      // 15 Second Tracking logic for Trends
      if (audio.currentTime >= 15 && songs[index]?.id && countedSongIdRef.current !== songs[index].id) {
        countedSongIdRef.current = songs[index].id as number;
        incrementPlayCount(countedSongIdRef.current).catch(console.error);
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
      audio.src = "";
      if (pannerRafRef.current) cancelAnimationFrame(pannerRafRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  // Apply playback rate changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  const setPlaybackRate = (rate: number) => {
    const clamped = Math.round(rate * 10) / 10; // round to 1 decimal
    setPlaybackRateState(clamped);
    localStorage.setItem('fronto_playback_rate', String(clamped));
    if (audioRef.current) audioRef.current.playbackRate = clamped;
  };

  // 2. Safety: Keep index in bounds and Reset tracker
  useEffect(() => {
    if (songs.length > 0 && index >= songs.length) {
      setIndex(songs.length - 1);
    }
    countedSongIdRef.current = null; // Reset tracker when song changes
  }, [songs.length, index]);

  const currentTrackUrlRef = useRef<string | null>(null);

  // 3. Handle Source / Playback state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (songs.length === 0) {
      if (!audio.paused) audio.pause();
      audio.src = "";
      setPlaying(false);
      currentTrackUrlRef.current = null;
      return;
    }

    if (!songs[index]) return;

    const targetUrl = songs[index].url;

    // Change source only if URL changes
    if (currentTrackUrlRef.current !== targetUrl) {
      currentTrackUrlRef.current = targetUrl;
      
      const targetVol = isMuted ? 0 : volume / 100;
      audio.src = targetUrl;
      audio.load();

      if (crossfade > 0 && playing) {
        audio.volume = 0;
        let fadeStep = 0;
        const fadeSteps = 10;
        const fadeInterval = (crossfade * 1000) / fadeSteps;
        const timer = setInterval(() => {
          fadeStep++;
          if (audioRef.current) {
            audioRef.current.volume = Math.min(targetVol, (fadeStep / fadeSteps) * targetVol);
          }
          if (fadeStep >= fadeSteps) clearInterval(timer);
        }, fadeInterval);
      } else {
        audio.volume = targetVol;
      }
    }

    // Handle play/pause state independently
    if (playing) {
      // Only attempt to play if it's currently paused
      if (audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Ignore AbortError caused by rapid track switching
            if (error.name !== 'AbortError') {
              console.warn("Playback prevented:", error);
              setPlaying(false);
            }
          });
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }

    // Media Session API - Update Metadata
    if ('mediaSession' in navigator && songs[index]) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songs[index].title,
        artist: songs[index].artist || 'Unknown Artist',
        album: 'Fronto OS',
        artwork: [
          { src: songs[index].coverUrl || '/default-cover.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }, [index, songs, playing]);

  // Media Session API - Action Handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        setIndex(prev => (prev === 0 ? songs.length - 1 : prev - 1));
        setPlaying(true);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        setIndex(prev => (prev + 1) % songs.length);
        setPlaying(true);
      });
    }
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [songs.length]);


  // 4. Handle End of Track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Use native looping for 'one' to avoid play/pause race conditions
    audio.loop = (repeat === 'one');

    const onEnded = () => {
      // If repeat is 'one', native loop handles it, but just in case:
      if (repeat === 'one') return;

      if (autoplay || repeat === 'all') {
        if (songs.length > 1 || repeat === 'all') {
          setIndex(prev => (prev + 1) % songs.length);
          setPlaying(true);
        } else {
          setPlaying(false);
        }
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [repeat, songs.length, autoplay]);

  // 5. Volume Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // 6. Sleep Timer countdown
  useEffect(() => {
    if (sleepTimer === null) return;
    
    if (sleepTimer <= 0) {
      pause();
      setSleepTimer(null);
      return;
    }

    const timer = setInterval(() => {
      setSleepTimer(prev => {
        if (prev === null || prev <= 1) {
          pause();
          return null;
        }
        return prev - 1;
      });
    }, 60000); // Decrement every minute

    return () => clearInterval(timer);
  }, [sleepTimer]);

  // Public Methods
  const play = async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    setPlaying(true);
  };

  const pause = () => setPlaying(false);

  const toggleMute = () => {
    if (isMuted) {
      setVolume(previousVolumeRef.current);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
    }
  };

  const setVolume = (val: number) => {
    const v = Math.max(0, Math.min(100, val));
    setVolumeState(v);
    if (v > 0) setIsMuted(false);
  };

  const seek = (val: number) => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = (val / 100) * audioRef.current.duration;
    }
  };

  const next = () => {
    if (songs.length === 0) return;
    // If there's something in the queue, play that first
    if (queue.length > 0) {
      const [nextSong, ...rest] = queue;
      setQueue(rest);
      // Find the song in the main songs array and jump to it
      const idx = songs.findIndex(s => s.id === nextSong.id);
      if (idx !== -1) {
        setIndex(idx);
      } else {
        // Song not in current playlist — just advance normally
        setIndex(prev => (prev + 1) % songs.length);
      }
      setPlaying(true);
      return;
    }
    setIndex(prev => (prev + 1) % songs.length);
    setPlaying(true);
  };

  const prev = () => {
    if (songs.length === 0) return;
    setIndex(prev => (prev - 1 + songs.length) % songs.length);
    setPlaying(true);
  };

  const setBass = (val: number) => {
    if (bassFilterRef.current) bassFilterRef.current.gain.value = val;
    setEq(prev => ({ ...prev, bass: val }));
  };
  const setMid = (val: number) => {
    if (midFilterRef.current) midFilterRef.current.gain.value = val;
    setEq(prev => ({ ...prev, mid: val }));
  };
  const setTreble = (val: number) => {
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = val;
    setEq(prev => ({ ...prev, treble: val }));
  };

  const setEffect = (effect: AudioEffect) => {
    setActiveEffectState(effect);
    const ctx = audioContextRef.current;
    const eqOut = trebleFilterRef.current;
    const analyser = analyserRef.current;
    const fx = effectNodesRef.current;

    if (!ctx || !eqOut || !analyser) return;

    // Disconnect eqOut from everything
    eqOut.disconnect();

    // Disconnect all fx nodes to clean up previous routes
    if (fx.underwater) fx.underwater.disconnect();
    if (fx.radio) fx.radio.disconnect();
    if (fx.panner) fx.panner.disconnect();
    if (fx.eightDLowpass) fx.eightDLowpass.disconnect();
    if (fx.eightDReverb) fx.eightDReverb.disconnect();
    if (fx.eightDReverbGain) fx.eightDReverbGain.disconnect();
    if (fx.bassBoost) fx.bassBoost.disconnect();
    if (fx.echoDelay) fx.echoDelay.disconnect();
    if (fx.echoGain) fx.echoGain.disconnect();
    
    // Stop 8D animation frame
    if (pannerRafRef.current) {
      cancelAnimationFrame(pannerRafRef.current);
      pannerRafRef.current = null;
    }

    // Route based on effect
    switch (effect) {
      case "none":
        eqOut.connect(analyser);
        break;
      case "underwater":
        eqOut.connect(fx.underwater!);
        fx.underwater!.connect(analyser);
        break;
      case "radio":
        eqOut.connect(fx.radio!);
        fx.radio!.connect(analyser);
        break;
      case "8d":
        eqOut.connect(fx.panner!);
        fx.panner!.connect(fx.eightDLowpass!);
        fx.eightDLowpass!.connect(analyser);
        
        // Add room reverb for 8D
        fx.eightDLowpass!.connect(fx.eightDReverb!);
        fx.eightDReverb!.connect(analyser);

        const startTime = ctx.currentTime;
        const panLoop = () => {
           if (fx.panner && fx.eightDLowpass && audioContextRef.current) {
             const elapsed = audioContextRef.current.currentTime - startTime;
             // Pan left to right
             fx.panner.pan.value = Math.sin(elapsed * Math.PI / 4); 
             
             // Depth (Front to Back). cos(t) > 0 is front, cos(t) < 0 is back.
             const depth = Math.cos(elapsed * Math.PI / 4);
             const minFreq = 2000;  // Muffled when behind
             const maxFreq = 20000; // Bright when in front
             fx.eightDLowpass.frequency.value = minFreq + ((depth + 1) / 2) * (maxFreq - minFreq);
           }
           pannerRafRef.current = requestAnimationFrame(panLoop);
        };
        panLoop();
        break;
      case "bass-boost":
        eqOut.connect(fx.bassBoost!);
        fx.bassBoost!.connect(analyser);
        break;
      case "echo":
        eqOut.connect(analyser); // Dry
        eqOut.connect(fx.echoDelay!); // Wet
        fx.echoDelay!.connect(fx.echoGain!);
        fx.echoGain!.connect(fx.echoDelay!); // Feedback
        fx.echoDelay!.connect(analyser);
        break;
    }
  };

  const addToQueue = useCallback((song: Song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  return {
    index, playing, volume, isMuted, duration,
    shuffle, repeat, audioError, play, pause, next, prev, setVolume, toggleMute,
    seek, toggleShuffle: () => setShuffle(!shuffle),
    toggleRepeat: () => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off"),
    selectSong: (i: number) => { setIndex(i); setPlaying(true); setAudioError(null); },
    setSleepTimer,
    sleepTimer,
    analyser: analyserRef.current,
    audioRef,
    eq,
    setBass,
    setMid,
    setTreble,
    activeEffect,
    setEffect,
    playbackRate,
    setPlaybackRate,
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
  };
}
