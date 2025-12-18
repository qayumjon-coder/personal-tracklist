import React, { useState, useEffect, useRef } from 'react';
import { useFetchSongs } from "../hooks/useFetchSongs";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { formatTime } from "../utils/formatTime";
import { TerminalVisualizer } from "./TerminalVisualizer";

interface LogEntry {
  id: string;
  text: React.ReactNode;
  type: 'command' | 'response' | 'error' | 'info';
}

export function TerminalPlayer() {
  const { songs, loading } = useFetchSongs();
  const player = useAudioPlayer(songs);
  
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  
  // Command History Navigation
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Focus input on click
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (!loading && songs.length > 0 && history.length === 0) {
       addLog(
          <div>
            System initialized. {songs.length} songs loaded.
            <br/>
            Type <span className="text-white font-bold">'help'</span> for a list of commands.
          </div>
       );
    }
  }, [loading, songs]);

  const addLog = (text: React.ReactNode, type: LogEntry['type'] = 'info') => {
    setHistory(prev => [...prev, { id: Math.random().toString(36), text, type }]);
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to command history
    setCmdHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1); // Reset history pointer

    addLog(trimmed, 'command');

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const argsString = args.join(' ');

    switch (command) {
      case 'help':
        addLog(
          <div className="pl-4 border-l-2 border-gray-700">
            <div>Available commands:</div>
            <div className="grid grid-cols-[140px_1fr] gap-2 mt-2 text-sm">
              <span className="text-white">play [n]</span><span>Play current or specific song index</span>
              <span className="text-white">pause</span><span>Pause playback</span>
              <span className="text-white">next / prev</span><span>Skip track</span>
              <span className="text-white">search [text]</span><span>Find songs by title/artist</span>
              <span className="text-white">seek [sec]</span><span>Jump to specific second</span>
              <span className="text-white">forward [sec]</span><span>Jump forward (alias: ff)</span>
              <span className="text-white">rewind [sec]</span><span>Jump backward (alias: rw)</span>
              <span className="text-white">list / ls</span><span>List all songs</span>
              <span className="text-white">status</span><span>Show playback info</span>
              <span className="text-white">vol [0-100]</span><span>Set volume</span>
              <span className="text-white">mute / unmute</span><span>Toggle sound</span>
              <span className="text-white">info</span><span>Track details</span>
              <span className="text-white">time</span><span>Show system time</span>
              <span className="text-white">whoami</span><span>Identify user</span>
              <span className="text-white">clear / cls</span><span>Clear screen</span>
            </div>
          </div>
        );
        break;
      
      case 'clear':
      case 'cls':
        setHistory([]);
        break;

      case 'whoami':
        addLog("root");
        break;

      case 'time':
        addLog(new Date().toString());
        break;

      case 'search':
      case 'find':
        if (!argsString) {
          addLog("Usage: search <query>", 'error');
          break;
        }
        const matches = songs.map((s, i) => ({ s, i })).filter(item => 
            item.s.title.toLowerCase().includes(argsString.toLowerCase()) || 
            item.s.artist.toLowerCase().includes(argsString.toLowerCase())
        );
        
        if (matches.length === 0) {
            addLog(`No matches found for '${argsString}'`, 'info');
        } else {
            addLog(
                <div className="grid grid-cols-1 gap-1 pl-2">
                    <div className="mb-1 text-white underline">Search Results:</div>
                    {matches.map(({s, i}) => (
                         <div key={i} className="text-[#00aaaa]">
                            [{i}] {s.artist} - {s.title}
                         </div>
                    ))}
                </div>
            );
        }
        break;

      case 'list':
      case 'ls':
        if (loading) {
            addLog("System is loading resources...", 'error');
            break;
        }
        if (songs.length === 0) {
            addLog("No songs found in library.", 'info');
            break;
        }
        addLog(
          <div className="grid grid-cols-1 gap-1 pl-2">
            {songs.map((s, i) => (
              <div key={i} className={i === player.index ? "text-white font-bold bg-[#00aaaa]/20" : "text-[#00aaaa]"}>
                [{i.toString().padStart(2, '0')}] {s.artist} - {s.title} {i === player.index ? " <ACTIVE>" : ""}
              </div>
            ))}
          </div>
        );
        break;

      case 'play':
        if (args.length > 0) {
            const index = parseInt(args[0]);
            if (!isNaN(index) && index >= 0 && index < songs.length) {
                player.selectSong(index);
                addLog(`> Executing: Play song #${index}`);
            } else {
                addLog(`Error: Invalid song index '${args[0]}'`, 'error');
            }
        } else {
            player.play();
            addLog("> Playback resumed.");
        }
        break;

      case 'pause':
      case 'stop':
        player.pause();
        addLog("> Playback paused.");
        break;

      case 'next':
        player.next();
        addLog("> Skipping forward...");
        break;
      
      case 'prev':
        player.prev();
        addLog("> Skipping backward...");
        break;

      case 'vol':
      case 'volume':
        if (args.length > 0) {
            const v = parseInt(args[0]);
            if (!isNaN(v) && v >= 0 && v <= 100) {
                player.setVolume(v);
                addLog(`> Volume set to ${v}%`);
            } else {
                addLog(`Error: Invalid volume level '${args[0]}'`, 'error');
            }
        } else {
            addLog(`Current volume: ${player.volume}%`);
        }
        break;
      
      case 'mute':
        if (!player.isMuted) player.toggleMute();
        addLog("> Audio muted.");
        break;
      
      case 'unmute':
        if (player.isMuted) player.toggleMute();
        addLog("> Audio unmuted.");
        break;

      case 'seek':
      case 'jump':
        if (args.length > 0 && player.duration > 0) {
            const sec = parseInt(args[0]);
            if (!isNaN(sec) && sec >= 0 && sec <= player.duration) {
                const pct = (sec / player.duration) * 100;
                player.seek(pct);
                addLog(`> Seeked to ${formatTime(sec)}`);
            } else {
                addLog(`Error: Invalid time. Max duration is ${Math.floor(player.duration)}s`, 'error');
            }
        } else {
            addLog("Usage: seek <seconds>", 'error');
        }
        break;
        
      case 'forward':
      case 'ff':
        if (player.duration > 0) {
             const skip = args.length > 0 ? parseInt(args[0]) : 10;
             const target = Math.min(player.currentTime + skip, player.duration);
             const pct = (target / player.duration) * 100;
             player.seek(pct);
             addLog(`> Forward ${skip}s`);
        }
        break;

      case 'rewind':
      case 'rw':
         if (player.duration > 0) {
             const skip = args.length > 0 ? parseInt(args[0]) : 10;
             const target = Math.max(player.currentTime - skip, 0);
             const pct = (target / player.duration) * 100;
             player.seek(pct);
             addLog(`> Rewind ${skip}s`);
        }
        break;

      case 'status':
      case 'nowplaying':
        if (songs.length === 0) {
            addLog("No media loaded.");
        } else {
            const currentSong = songs[player.index];
            const progressBarLength = 30;
            const progress = Math.floor((player.progress / 100) * progressBarLength);
            const bar = "█".repeat(progress) + "░".repeat(progressBarLength - progress);
            
            addLog(
                <div className="border border-[#00FFFF] p-2 max-w-lg mt-2 mb-2 bg-[#001111]">
                   <div className="text-white font-bold">NOW PLAYING:</div>
                   <div className="pl-2">
                       <div>TRACK:  {currentSong.title}</div>
                       <div>ARTIST: {currentSong.artist}</div>
                       <div className="mt-1">[{bar}] {formatTime(player.currentTime)} / {formatTime(player.duration)}</div>
                       <div className="mt-1 flex gap-4 text-xs text-[#00aaaa] uppercase">
                         <span>State: {player.playing ? "PLAYING" : "PAUSED"}</span>
                         <span>Vol: {player.volume}% {player.isMuted ? "(MUTED)" : ""}</span>
                         <span>Shuffle: {player.shuffle ? "ON" : "OFF"}</span>
                         <span>Repeat: {player.repeat}</span>
                       </div>
                   </div>
                </div>
            );
        }
        break;

      case 'info':
        if (songs.length > 0) {
            const s = songs[player.index];
            addLog(
                <div className="flex gap-4 mt-2 p-2 border border-[#00aaaa]">
                    {s.coverUrl && <img src={s.coverUrl} alt="cover" className="w-24 h-24 border border-[#00FFFF] grayscale hover:grayscale-0 transition-all"/>}
                    <div>
                        <div className="text-xl font-bold text-white">{s.title}</div>
                        <div className="text-lg">{s.artist}</div>
                        <div className="text-xs text-[#00aaaa] mt-2">ID: {s.id}</div>
                        <div className="text-xs text-[#00aaaa]">SRC: {s.url}</div>
                        <div className="text-xs text-[#00aaaa]">DUR: {formatTime(s.duration)}</div>
                    </div>
                </div>
            );
        }
        break;
        
      case 'shuffle':
        player.toggleShuffle();
        addLog(`Shuffle mode: ${!player.shuffle ? "ON" : "OFF"}`); // State updates on next render so logic is inverted visually
        break;
      
      case 'repeat':
        player.toggleRepeat();
        // Since react state is async, we can't show immediate new state perfectly simply without separate lookup, but user will see it in status
        addLog("Toggled repeat mode. Check 'status'.");
        break;

      default:
        addLog(`Unknown command: '${command}'. Type 'help' for assistance.`, 'error');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (cmdHistory.length > 0) {
            const newIndex = historyIndex + 1;
            if (newIndex < cmdHistory.length) {
                setHistoryIndex(newIndex);
                setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setInput(cmdHistory[cmdHistory.length - 1 - newIndex]);
        } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setInput('');
        }
    }
  };

  return (
    <div className="w-full h-screen bg-[#000000] p-4 md:p-8 font-mono flex flex-col overflow-hidden text-sm md:text-base relative selection:bg-[#00FFFF] selection:text-black">
      
      {/* Loading overlay if initial load */}
      {loading && !songs.length && (
         <div className="absolute inset-0 flex items-center justify-center bg-black z-50">
            <span className="animate-pulse">INITIALIZING SYSTEM...</span>
         </div>
      )}

      {/* Output Area */}
      <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
        <div className="mb-6 text-[#00FFFF]">
<pre className="text-xs md:text-sm leading-none mb-4 font-bold">
{`
 __  __           _         _____                               _             _ 
|  \\/  |         (_)       |  __ \\                             | |           | |
| \\  / |_   _ ___ _  ___   | |__) |__ _ __ _ __ ___  _ __   ___| | ___ _ __  | |
| |\\/| | | | / __| |/ __|  |  ___/ _ \\ '__| '_ ' _ \\| '_ \\ / _ \\ |/ _ \\ '__| | |
| |  | | |_| \\__ \\ | (__   | |  |  __/ |  | | | | | | | | |  __/ |  __/ |    |_|
|_|  |_|\\__,_|___/_|\\___|  |_|   \\___|_|  |_| |_| |_|_| |_|\\___|_|\\___|_|    (_)
                                                                                
`}
</pre>
            <div className="border-b border-[#00FFFF] pb-2 mb-2 w-full max-w-2xl">
                TERMINAL UI v2.1 (UPDATED) - ACCESS GRANTED
            </div>
        </div>
        
        {history.map((entry) => (
            <div key={entry.id} className={`mb-1 break-words ${entry.type === 'error' ? 'text-red-500' : ''} ${entry.type === 'command' ? 'text-white mt-3 font-bold' : 'text-[#00FFFF]'}`}>
                {entry.type === 'command' && <span className="mr-2 text-[#00aaaa]">{`user@music:~$`}</span>}
                {entry.text}
            </div>
        ))}
        <div ref={bottomRef} className="h-4"/>
      </div>

      {/* Input Area */}
      <div className="flex items-center border-t border-[#00FFFF] pt-2 bg-black">
        <span className="mr-2 text-[#00FFFF] font-bold">user@music:~$</span>
        <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[#00FFFF] placeholder-[#004444] terminal-input"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder="Type 'help' for commands..."
        />
        <div className="w-2 h-5 bg-[#00FFFF] ml-1 animate-pulse"></div>
      </div>
      
      {/* Terminal Visualizer (Bottom Right) */}
      <div className="absolute bottom-14 right-8 pointer-events-none z-10 hidden md:block">
        <TerminalVisualizer playing={player.playing} />
      </div>
    </div>
  );
}
