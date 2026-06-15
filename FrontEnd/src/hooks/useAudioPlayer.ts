import { useEffect, useRef, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { incrementPlayCount } from "../services/musicApi";

export type RepeatMode = "off" | "one" | "all";

export function useAudioPlayer(songs: { url: string; id?: number; title?: string; artist?: string; coverUrl?: string }[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);

  const { autoplay } = useSettings();

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

        const source = ctx.createMediaElementSource(audio);
        source.connect(bassFilter);
        bassFilter.connect(midFilter);
        midFilter.connect(trebleFilter);
        trebleFilter.connect(analyser);
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        bassFilterRef.current = bassFilter;
        midFilterRef.current = midFilter;
        trebleFilterRef.current = trebleFilter;
      } catch (e) {
        console.error("Audio Context Error:", e);
      }
    };

    setupContext();

    const handlePlay = () => { setPlaying(true); setAudioError(null); };
    const handlePause = () => setPlaying(false);
    const handleError = () => {
      setPlaying(false);
      setAudioError('Audio playback failed. The file may be corrupted or unsupported.');
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const val = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(val) ? 0 : val);

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
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

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
    if (!audio || !songs.length || !songs[index]) return;

    const targetUrl = songs[index].url;

    // Change source only if URL changes
    if (currentTrackUrlRef.current !== targetUrl) {
      currentTrackUrlRef.current = targetUrl;
      
      // Pause before switching source to prevent AbortError
      if (!audio.paused) {
        audio.pause();
      }
      
      audio.src = targetUrl;
      audio.load();
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

  return {
    index, playing, progress, volume, isMuted, currentTime, duration,
    shuffle, repeat, audioError, play, pause, next, prev, setVolume, toggleMute,
    seek, toggleShuffle: () => setShuffle(!shuffle),
    toggleRepeat: () => setRepeat(r => r === "off" ? "all" : r === "all" ? "one" : "off"),
    selectSong: (i: number) => { setIndex(i); setPlaying(true); setAudioError(null); },
    setSleepTimer,
    sleepTimer,
    analyser: analyserRef.current,
    eq,
    setBass,
    setMid,
    setTreble
  };
}
