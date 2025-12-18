import { useEffect, useRef, useState } from "react";

import { useSettings } from "../contexts/SettingsContext";

export type RepeatMode = "off" | "one" | "all";

export function useAudioPlayer(songs: { url: string }[]) {
  // 1. State Hooks
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");

  // Settings
  const { autoplay } = useSettings();

  // 2. Ref Hooks
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousVolumeRef = useRef(70);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize Audio Logic & Context
  useEffect(() => {
    // Create fresh audio instance to avoid "MediaElementSource already connected" error in StrictMode
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // Web Audio API Setup
    const initAudioContext = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch (e) {
        console.error("Audio Context Setup Error:", e);
      }
    };
    initAudioContext();

    // Event Handlers
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const progressVal = (audio.currentTime / audio.duration) * 100;
      setProgress(Number.isNaN(progressVal) ? 0 : progressVal);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    // Attach listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      // Cleanup
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);

      audio.pause();
      audio.src = "";
      audioRef.current = null;

      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      audioContextRef.current = null;
      analyserRef.current = null;
    };
  }, []); // Run once on mount

  // Sync Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Handle Song Source Changes
  useEffect(() => {
    if (!songs.length || !audioRef.current) return;
    const audio = audioRef.current;

    const currentSongUrl = songs[index].url;

    // If src changed
    if (audio.src !== currentSongUrl) {
      audio.src = currentSongUrl;
      audio.load();

      // Only attempt to play if we are currently in a 'playing' state
      if (playing) {
        const attemptPlay = async () => {
          // Resume context if needed
          if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          try {
            await audio.play();
          } catch (e) {
            console.log("Autoplay prevented or failed", e);
            setPlaying(false);
          }
        };
        attemptPlay();
      }
    }
  }, [index, songs, playing]);

  // Handle Repeats / Song End logic
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (autoplay || repeat === 'all') {
        // If autoplay enabled OR repeat all enabled, we move next
        // (Repeat All implicitly implies continuous play)
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


  // Controls
  const play = async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (audioContextRef.current?.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
      } catch (e) {
        console.warn("Audio Context resume failed", e);
      }
    }
    audio.play().catch(e => {
      console.error("Play failed", e);
      setPlaying(false);
    });
    setPlaying(true);
  };

  const pause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setPlaying(false);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (isMuted) {
      audio.volume = previousVolumeRef.current / 100;
      setVolumeState(previousVolumeRef.current);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      audio.volume = 0;
      setVolumeState(0);
      setIsMuted(true);
    }
  };

  const setVolume = (val: number) => {
    if (!audioRef.current) return;
    // Update state first
    const v = Math.max(0, Math.min(100, val));
    setVolumeState(v);

    // Update audio
    audioRef.current.volume = v / 100;
    if (v > 0 && isMuted) setIsMuted(false);
  };

  const seek = (val: number) => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (val / 100) * audio.duration;
      setProgress(val);
    }
  };

  const next = () => {
    setIndex(prev => (prev + 1) % songs.length);
    setPlaying(true);
  };

  const prev = () => {
    setIndex(prev => (prev - 1 + songs.length) % songs.length);
    setPlaying(true);
  };

  const toggleShuffle = () => setShuffle(s => !s);
  const toggleRepeat = () => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off");

  const selectSong = (i: number) => {
    setIndex(i);
    setPlaying(true);
  };

  return {
    index,
    playing,
    progress,
    volume,
    isMuted,
    currentTime,
    duration,
    shuffle,
    repeat,
    play,
    pause,
    next,
    prev,
    setVolume,
    toggleMute,
    seek,
    toggleShuffle,
    toggleRepeat,
    selectSong,
    analyser: analyserRef.current
  };
}
