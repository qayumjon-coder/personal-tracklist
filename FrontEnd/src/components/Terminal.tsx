import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';

type ThemeType = "aqua" | "green" | "amber" | "pink" | "red" | "neon" | "toxic" | "sunset" | "matrix";
type VisualizerMode = "bars" | "wave" | "multiwave" | "fade" | "scale" | "aurora" | "off";

interface TerminalProps {
  isVisible: boolean;
  player: any;
  songs: any[];
  onClose: () => void;
  onSystemCrash: () => void;
}

interface HistoryItem {
  id: string;
  type: 'command' | 'response' | 'error' | 'system';
  text: string;
}

export function Terminal({ isVisible, player, songs, onClose, onSystemCrash }: TerminalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: 'init-0', type: 'system', text: '███████╗██████╗  ██████╗ ███╗   ██╗████████╗ ██████╗ ' },
    { id: 'init-1', type: 'system', text: '██╔════╝██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔═══██╗' },
    { id: 'init-2', type: 'system', text: '█████╗  ██████╔╝██║   ██║██╔██╗ ██║   ██║   ██║   ██║' },
    { id: 'init-3', type: 'system', text: '██╔══╝  ██╔══██╗██║   ██║██║╚██╗██║   ██║   ██║   ██║' },
    { id: 'init-4', type: 'system', text: '██║     ██║  ██║╚██████╔╝██║ ╚████║   ██║   ╚██████╔╝' },
    { id: 'init-5', type: 'system', text: '╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ' },
    { id: 'init-6', type: 'system', text: ' ' },
    { id: 'init-7', type: 'system', text: 'Fronto Music Terminal v1.0.0. Type "help" for a list of available commands.' }
  ]);
  const [input, setInput] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setTheme, setVisualizerMode, zenMode, setZenMode, matrixBg, setMatrixBg } = useSettings();

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 50);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isVisible, history]);

  const addHistory = (type: HistoryItem['type'], text: string) => {
    setHistory(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), type, text }]);
  };

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) return;

    addHistory('command', `dev@fronto:~$ ${trimmedCmd}`);
    setCommandHistory(prev => [trimmedCmd, ...prev]);
    setHistoryIndex(-1);

    const parts = trimmedCmd.split(' ');
    const mainCommand = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (mainCommand) {
      case 'help':
        addHistory('response', 'Available commands:');
        addHistory('response', '  play            - Resume playback');
        addHistory('response', '  pause           - Pause playback');
        addHistory('response', '  next            - Skip to next track');
        addHistory('response', '  prev            - Skip to previous track');
        addHistory('response', '  vol <0-100>     - Set volume level');
        addHistory('response', '  theme <name>    - Change theme (aqua, green, amber, pink, red, neon, toxic, sunset, matrix)');
        addHistory('response', '  vis <mode>      - Change visualizer (bars, wave, multiwave, aurora, stars, fade, scale, off)');
        addHistory('response', '  zen             - Toggle Zen Mode (Focus Mode)');
        addHistory('response', '  matrix          - Toggle Matrix background rain');
        addHistory('response', '  ls / list       - List all songs in the current playlist');
        addHistory('response', '  nowplaying / np - Show current playing track info');
        addHistory('response', '  clear           - Clear terminal history');
        addHistory('response', '  exit / quit     - Close terminal');
        addHistory('system',   ' ');
        addHistory('system',   '  [!] WARNING: Root privileges are active. Do NOT use destructive commands');
        addHistory('system',   '               like "sudo rm -rf /" - system crash is imminent.');
        addHistory('system',   '  [!] NOTICE: Admin panel login requires SSH ("ssh admin").');
        break;

      case 'play':
        player.play();
        addHistory('response', '▶ Playback resumed.');
        break;

      case 'pause':
        player.pause();
        addHistory('response', '⏸ Playback paused.');
        break;

      case 'next':
        player.next();
        addHistory('response', '⏭ Skipped to next track.');
        break;

      case 'prev':
        player.prev();
        addHistory('response', '⏮ Skipped to previous track.');
        break;

      case 'vol':
      case 'volume':
        if (args.length === 0) {
          addHistory('response', `Current volume: ${player.volume}%`);
        } else {
          const v = parseInt(args[0], 10);
          if (isNaN(v) || v < 0 || v > 100) {
            addHistory('error', 'Invalid volume. Use a number between 0 and 100.');
          } else {
            player.setVolume(v);
            addHistory('response', `Volume set to ${v}%`);
          }
        }
        break;

      case 'theme':
        if (args.length === 0) {
          addHistory('error', 'Please specify a theme name.');
        } else {
          const validThemes = ["aqua", "green", "amber", "pink", "red", "neon", "toxic", "sunset", "matrix"];
          if (validThemes.includes(args[0].toLowerCase())) {
            setTheme(args[0].toLowerCase() as ThemeType);
            addHistory('response', `Theme changed to '${args[0].toLowerCase()}'.`);
          } else {
            addHistory('error', `Invalid theme. Available: ${validThemes.join(', ')}`);
          }
        }
        break;

      case 'vis':
      case 'visualizer':
        if (args.length === 0) {
          addHistory('error', 'Please specify a visualizer mode.');
        } else {
          const validVis = ["bars", "wave", "multiwave", "fade", "scale", "aurora", "stars", "off"];
          if (validVis.includes(args[0].toLowerCase())) {
            setVisualizerMode(args[0].toLowerCase() as VisualizerMode);
            addHistory('response', `Visualizer mode changed to '${args[0].toLowerCase()}'.`);
          } else {
            addHistory('error', `Invalid visualizer. Available: ${validVis.join(', ')}`);
          }
        }
        break;

      case 'matrix':
        setMatrixBg(!matrixBg);
        addHistory('response', `Matrix Rain Background ${!matrixBg ? 'ACTIVATED' : 'DEACTIVATED'}.`);
        break;

      case 'zen':
        setZenMode(!zenMode);
        addHistory('response', `Zen Mode ${!zenMode ? 'ACTIVATED' : 'DEACTIVATED'}.`);
        break;

      case 'ls':
      case 'list':
        if (songs.length === 0) {
          addHistory('response', 'Playlist is empty.');
        } else {
          addHistory('response', `Playlist (${songs.length} tracks):`);
          songs.forEach((song, i) => {
            const isPlaying = player.index === i ? '* ' : '  ';
            addHistory('response', `${isPlaying}${(i + 1).toString().padStart(3, '0')}. ${song.title} - ${song.artist}`);
          });
        }
        break;

      case 'nowplaying':
      case 'np':
        if (songs.length === 0 || !songs[player.index]) {
          addHistory('response', 'Nothing is currently playing.');
        } else {
          const song = songs[player.index];
          addHistory('response', `Currently Playing: ${song.title} by ${song.artist}`);
          addHistory('response', `Status: ${player.playing ? 'Playing' : 'Paused'}`);
        }
        break;

      case 'clear':
        setHistory([]);
        break;

      case 'exit':
      case 'quit':
        onClose();
        break;

      case 'sudo':
        if (args.join(' ') === 'rm -rf /') {
          addHistory('error', 'FATAL ERROR: ROOT DIRECTORY DELETION INITIATED...');
          setTimeout(() => {
            onSystemCrash();
            onClose();
          }, 1000);
        } else {
          addHistory('error', 'Permission denied.');
        }
        break;

      case 'ssh':
      case 'hack':
      case 'login':
        const target = args[0] || 'admin@fronto-server';
        addHistory('response', `Initiating secure connection to ${target}...`);
        
        setTimeout(() => addHistory('system', 'Bypassing Node-1 firewall [||||      ] 42%'), 1000);
        setTimeout(() => addHistory('system', 'Bypassing Node-1 firewall [||||||||||] 100%'), 2200);
        setTimeout(() => addHistory('system', `Attempting Dictionary Attack on ${target}...`), 3000);
        setTimeout(() => addHistory('error', 'ACCESS DENIED: Unauthorized Intrusion Detected.'), 4800);
        setTimeout(() => addHistory('error', 'SECURITY COUNTERMEASURES ACTIVATED. IP Logged.'), 5500);
        break;

      default:
        addHistory('error', `Command not found: ${mainCommand}. Type "help" for available commands.`);
        break;
    }
  };

  const playKeystroke = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(100 + Math.random() * 50, audioCtx.currentTime); // Slight randomization for realism
      oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    } catch(e) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Play sound on any normal key or specific actions
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      playKeystroke();
    }

    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      onClose();
    } else if (e.key === ' ') {
      const commands = ['play', 'pause', 'next', 'prev', 'vol', 'theme', 'vis', 'zen', 'matrix', 'ls', 'list', 'nowplaying', 'np', 'clear', 'exit', 'quit', 'sudo rm -rf /'];
      const themes = ["aqua", "green", "amber", "pink", "red", "neon", "toxic", "sunset", "matrix"];
      const visModes = ["bars", "wave", "multiwave", "fade", "scale", "aurora", "off"];
      
      const parts = input.split(' ');
      if (parts.length === 1) {
        // Only autocomplete if input is not empty and not an exact match already
        if (input.length > 0 && !commands.includes(input.toLowerCase())) {
          const match = commands.find(c => c.startsWith(input.toLowerCase()));
          if (match) {
            e.preventDefault();
            setInput(match + ' ');
            setTimeout(() => setCursorPos(match.length + 1), 0);
          }
        }
      } else if (parts.length === 2) {
        const cmd = parts[0].toLowerCase();
        let match = undefined;
        if (cmd === 'theme') {
          match = themes.find(t => t.startsWith(parts[1].toLowerCase()));
        } else if (cmd === 'vis' || cmd === 'visualizer') {
          match = visModes.find(v => v.startsWith(parts[1].toLowerCase()));
        }
        
        if (match && parts[1].length > 0 && match !== parts[1].toLowerCase()) {
          e.preventDefault();
          const newVal = cmd + ' ' + match + ' ';
          setInput(newVal);
          setTimeout(() => setCursorPos(newVal.length), 0);
        }
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursorPos(e.currentTarget.selectionStart || 0);
  };

  return (
    <div 
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl h-[75vh] bg-black/50 backdrop-blur-md z-[9999] border-2 border-[var(--accent)] rounded-xl font-mono text-sm overflow-hidden flex flex-col transition-all duration-300 ease-out shadow-[0_0_50px_rgba(var(--accent-rgb),0.5)] ${
        isVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col justify-end">
        <div>
          {history.map((item) => (
            <div 
              key={item.id} 
              className={`mb-1 whitespace-pre-wrap break-words animate-[fadeIn_0.2s_ease-out_forwards] ${
                item.type === 'error' ? 'text-red-500' : 
                item.type === 'command' ? 'text-white font-bold' : 
                item.type === 'system' ? 'text-gray-400' :
                'text-[var(--accent)] drop-shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]'
              }`}
            >
              {item.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="p-4 border-t border-[rgba(var(--accent-rgb),0.2)] bg-black/20 flex items-center gap-2 relative">
        <span className="text-[var(--accent)] font-bold drop-shadow-[0_0_5px_rgba(var(--accent-rgb),0.8)] whitespace-nowrap">dev@fronto:~$</span>
        <div className="flex-1 relative h-[1.5em] flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInput}
            onSelect={handleSelect}
            onKeyUp={handleSelect}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            className="absolute inset-0 w-full bg-transparent outline-none border-none text-[var(--accent)] focus:ring-0 p-0 font-bold caret-transparent drop-shadow-[0_0_5px_rgba(var(--accent-rgb),0.5)] z-10"
            spellCheck="false"
            autoComplete="off"
            disabled={!isVisible}
          />
          {/* Smooth custom cursor block */}
          <div 
            className="absolute h-[1.2em] w-[1ch] bg-[var(--accent)] opacity-60 transition-all duration-100 ease-out shadow-[0_0_10px_var(--accent)] pointer-events-none"
            style={{ left: `${cursorPos}ch` }}
          />
        </div>
      </div>
    </div>
  );
}
