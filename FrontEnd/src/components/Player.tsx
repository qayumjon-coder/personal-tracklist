import type { Song } from "../types/Song";

import { useSettings } from "../contexts/SettingsContext";
import { Heart, Mic2, X, Mail, Send, Upload, Search, Plus, Minus, Loader2, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { updateSong, searchSongs } from "../services/musicApi";

import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { Playlist } from "./Playlist";
import { ProgressBar } from "./ProgressBar";
import { PlaybackControls } from "./PlaybackControls";
import { VolumeControl } from "./VolumeControl";
import { Visualizer, FadeVisualizer, useBeatScale, AmbientBackground } from "./Visualizer";
import { formatTime } from "../utils/formatTime";
import { useState, useEffect } from "react";


import { useSoundEffects } from "../hooks/useSoundEffects";

interface PlayerProps {
  songs: Song[];
  loading: boolean;
  player: ReturnType<typeof useAudioPlayer>;
  onOpenSettings: () => void;
  onAddToPlaylist: (song: Song) => Promise<{ success: boolean; message: string }>;
  onRemoveFromPlaylist: (id: number) => void;
}

export function Player({ songs, loading, player, onOpenSettings, onAddToPlaylist, onRemoveFromPlaylist }: PlayerProps) {
  const { playClick, playHover } = useSoundEffects();
  const { visualizerMode } = useSettings(); // Get visualizer mode
  const beatScale = useBeatScale(player.playing, player.analyser); // Get beat scale
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showLyrics, setShowLyrics] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());

  // Sync liked status from songs prop
  useEffect(() => {
    setLikedIds(new Set(songs.filter(s => s.liked).map(s => s.id)));
  }, [songs]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = songs[player.index];
    const newLiked = !likedIds.has(current.id);
    
    // Optimistic update
    const newSet = new Set(likedIds);
    if (newLiked) newSet.add(current.id);
    else newSet.delete(current.id);
    setLikedIds(newSet);

    try {
      await updateSong(current.id, { liked: newLiked });
    } catch (err) {
      console.error("Failed to toggle like", err);
      // Revert if failed
      setLikedIds(prev => {
        const reverted = new Set(prev);
        if (newLiked) reverted.delete(current.id);
        else reverted.add(current.id);
        return reverted;
      });
    }
  };

  // Search Logic
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchMsg(null);
    try {
        const results = await searchSongs(searchQuery);
        setSearchResults(results);
    } catch(err) {
        console.error(err);
    } finally {
        setIsSearching(false);
    }
  };

  const handleAddSong = async (song: Song) => {
      // Check if already in playlist (locally)
      if (songs.some(s => s.id === song.id)) {
        setSearchMsg({ type: 'error', text: 'Song already in playlist' });
        setTimeout(() => setSearchMsg(null), 2000);
        return;
      }
      
      const res = await onAddToPlaylist(song);
      setSearchMsg({ type: res.success ? 'success' : 'error', text: res.message });
      setTimeout(() => setSearchMsg(null), 2000);
  };

  const categories = ["All", ...Array.from(new Set(songs.map(s => s.category || "General")))];
  const filteredSongs = selectedCategory === "All" ? songs : songs.filter(s => (s.category || "General") === selectedCategory);

  if (loading) return <div className="text-[var(--text-primary)] text-center mt-20 text-lg animate-pulse font-mono">Loading library...</div>;
  if (!songs.length) return <div className="text-[var(--text-secondary)] text-center mt-20 font-mono">No songs found in library</div>;

  const current: Song = songs[player.index];

  return (
    <>
    {/* Global Atmospheric Background */}
    <AmbientBackground playing={player.playing} analyser={player.analyser} />

    {/* Settings component moved to App.tsx */}
    
    {/* Responsive Page Wrapper */}
    <div className="w-full max-w-6xl mx-auto px-3 md:px-6 py-3 md:py-8 flex flex-col gap-8 md:gap-12 items-center">
      
      {/* Main Player Display */}
      <div className="flex-1 w-full">
        <div className="relative w-full flex flex-col md:flex-row overflow-hidden min-h-[500px] md:min-h-[560px] lg:min-h-[600px] border border-[var(--text-secondary)] bg-[var(--bg-main)] shadow-[0_0_40px_rgba(0,255,255,0.1)] text-base md:text-lg">
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--accent)] z-20"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--accent)] z-20"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--accent)] z-20"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--accent)] z-20"></div>

          {/* Top Toolbar - Global */}
          <div className="absolute top-0 left-0 right-0 h-10 border-b border-[var(--text-secondary)]/30 flex items-center justify-between px-4 bg-[var(--bg-main)]/80 backdrop-blur-md z-30">
            {/* Status Status */}
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${player.playing ? 'bg-[var(--accent)] animate-pulse shadow-[0_0_8px_var(--accent)]' : 'bg-[var(--text-secondary)]/30'}`}></div>
              <span className="text-[9px] font-mono text-[var(--accent)] tracking-[0.2em] font-bold uppercase">SYS.LINK_ACTIVE</span>
              <div className="hidden sm:block h-3 w-px bg-[var(--text-secondary)]/20 mx-1"></div>
              <span className="hidden sm:inline text-[9px] font-mono text-[var(--text-secondary)]/50 tracking-widest uppercase">STP_FLTR: ON</span>
            </div>
            
            {/* Tech Labels */}
            <div className="hidden lg:flex gap-6 text-[9px] text-[var(--text-secondary)]/40 font-mono tracking-[0.3em] uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">BUFR:</span>
                  <span>100%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">RATE:</span>
                  <span>44.1KHZ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--accent)]/30">BITD:</span>
                  <span>24-BIT</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => { playClick(); onOpenSettings(); }}
                  onMouseEnter={playHover}
                  className="text-[var(--text-secondary)] hover:text-[var(--accent)] font-mono text-[9px] tracking-widest border border-[var(--text-secondary)]/30 hover:border-[var(--accent)] px-3 py-1 transition-all bg-black/50 uppercase group"
                >
                  <span className="opacity-60 group-hover:opacity-100">[</span>
                  <span className="mx-1">Config</span>
                  <span className="opacity-60 group-hover:opacity-100">]</span>
                </button>

                <button 
                  onClick={() => { playClick(); setIsSearchOpen(true); }}
                  onMouseEnter={playHover}
                  className="text-[var(--text-secondary)] hover:text-[var(--accent)] font-mono text-[9px] tracking-widest border border-[var(--text-secondary)]/30 hover:border-[var(--accent)] px-3 py-1 transition-all bg-black/50 uppercase group flex items-center gap-2"
                >
                  <Search size={10} />
                  <span>Search</span>
                </button>
            </div>
          </div>
            
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col md:flex-row mt-6 md:mt-10 min-h-0">
            
            {/* LEFT COLUMN: Player (60%) */}
            <div className="flex-[3] relative flex flex-col p-3 md:p-5 lg:p-6 border-b md:border-b-0 md:border-r border-[var(--text-secondary)]/30 overflow-hidden">
              
                {/* Fade Visualizer Overlay (Player Box Only) */}
                {visualizerMode === 'fade' && (
                  <FadeVisualizer playing={player.playing} analyser={player.analyser} />
                )}

              {/* Background Visuals */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* Dynamic Visualizer Background */}
                  <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20 pointer-events-none mix-blend-screen">
                    <Visualizer playing={player.playing} analyser={player.analyser} />
                  </div>
              </div>

              {/* Cover Art Section - Flexible height */}
              <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2 md:py-4 min-h-0">
                  {/* Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[var(--accent)] opacity-10 blur-[80px] rounded-full pointer-events-none" />
                  
              {/* Cover */}
              <div className="relative group/cover">
                {/* Rotating Inner Glow */}
                <div className="absolute -inset-4 bg-[var(--accent)]/10 rounded-full blur-2xl animate-pulse opacity-0 group-hover/cover:opacity-100 transition-opacity duration-700"></div>
                
                <div className="relative w-48 h-48 md:w-60 md:h-60 lg:w-64 lg:h-64 aspect-square border border-[var(--text-secondary)]/30 p-1 bg-black/40 backdrop-blur-sm animate-in zoom-in-95 duration-500 shrink-0">
                  {/* Decorative corner accents for cover */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[var(--accent)]"></div>
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[var(--accent)]"></div>
                  
                  <img 
                    src={current.coverUrl} 
                    alt={current.title} 
                    className="w-full h-full object-cover transition-transform duration-75"
                    style={{
                      transform: visualizerMode === 'scale' ? `scale(${beatScale})` : 'none'
                    }}
                  />
                </div>
              </div>
              </div>

              {/* Track Info & Controls Section - Compact */}
              <div className="w-full max-w-lg mx-auto space-y-4 md:space-y-5 relative z-10 pt-3 md:pt-4 pb-2">
                  {/* Title & Artist & Actions Combined */}
                  <div className="text-center space-y-0.5 md:space-y-1">
                    <div className="flex items-start justify-center gap-2 md:gap-3">
                      {/* Like Button - Always visible */}
                      <button 
                        onClick={toggleLike}
                        className={`transition-all duration-300 transform hover:scale-110 active:scale-95 shrink-0 mt-1 ${likedIds.has(current.id) ? 'text-[var(--accent)] drop-shadow-[0_0_10px_var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                      >
                        <Heart size={16} fill={likedIds.has(current.id) ? "currentColor" : "none"} strokeWidth={1.5} />
                      </button>

                      {/* Song Title & Artist - Always visible */}
                      <div className="flex flex-col items-center flex-1 min-w-0 px-1">
                          <h2 className="text-base md:text-xl lg:text-2xl font-black text-[var(--accent)] text-glow tracking-tight drop-shadow-lg truncate font-mono uppercase w-full">
                            {current.title}
                          </h2>
                          <p className="text-[9px] md:text-[10px] lg:text-xs text-[var(--text-secondary)] font-bold tracking-[0.2em] md:tracking-[0.3em] uppercase mt-0.5 md:mt-1 opacity-80 truncate w-full">
                            {current.artist}
                          </p>
                      </div>

                      {/* Lyrics Button - Visible only if lyrics exist, otherwise spacer */}
                      {current.lyrics ? (
                        <button
                          onClick={() => setShowLyrics(true)}
                          className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-all duration-300 transform hover:scale-110 active:scale-95 shrink-0 mt-1"
                          title="Show Lyrics"
                        >
                          <Mic2 size={16} strokeWidth={1.5} />
                        </button>
                      ) : (
                          <div className="w-[16px] shrink-0" /> // Spacer to maintain layout balance
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Times */}
                  <div className="space-y-0.5 md:space-y-1">
                    <ProgressBar 
                      progress={player.progress} 
                      onSeek={player.seek} 
                      duration={player.duration} 
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] tracking-wider">
                      <span>{formatTime(player.currentTime)}</span>
                      <span>{formatTime(player.duration)}</span>
                    </div>
                  </div>

                  {/* Main Controls - Prioritized visibility */}
                  <div className="flex flex-col items-center gap-2.5 md:gap-3 pb-1 md:pb-2">
                    <PlaybackControls
                      playing={player.playing}
                      shuffle={player.shuffle}
                      repeat={player.repeat}
                      onPlay={player.play}
                      onPause={player.pause}
                      onPrev={player.prev}
                      onNext={player.next}
                      onToggleShuffle={player.toggleShuffle}
                      onToggleRepeat={player.toggleRepeat}
                    />
                    
                    <div className="w-3/4 md:w-2/3">
                      <VolumeControl
                        volume={player.volume}
                        isMuted={player.isMuted}
                        onVolumeChange={player.setVolume}
                        onToggleMute={player.toggleMute}
                      />
                    </div>
                  </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Playlist (40%) */}
            <div className="flex-[2] flex flex-col bg-[var(--bg-main)]/50 border-t md:border-t-0 border-[var(--text-secondary)]/30 backdrop-blur-sm relative min-h-[280px] md:min-h-0">
              {/* Playlist Header */}
              <div className="p-3 md:p-4 border-b border-[var(--text-secondary)]/30 bg-[var(--text-secondary)]/5 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-widest font-mono uppercase">Playlist</h3>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-mono">{filteredSongs.length} SONGS_LOADED</p>
                </div>
                
                {/* Category Dropdown (Mini) */}
                <div className="relative">
                  <button
                    onClick={() => { playClick(); setIsConfigMenuOpen(!isConfigMenuOpen); }}
                    onMouseEnter={playHover}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-mono text-[10px] border border-[var(--text-secondary)]/30 px-2 py-1 bg-black/50 flex items-center gap-2 w-32 justify-between"
                  >
                    <span className="truncate">{selectedCategory.toUpperCase()}</span>
                    <span>{isConfigMenuOpen ? '▴' : '▾'}</span>
                  </button>
                  
                  {isConfigMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--bg-main)] border border-[var(--text-secondary)] z-50 shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { playClick(); setSelectedCategory(cat); setIsConfigMenuOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-wider border-b border-[var(--text-secondary)]/10 hover:bg-[var(--text-secondary)]/10 ${selectedCategory === cat ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-secondary)]'}`}
                          >
                            {cat}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* List */}
              <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                <Playlist
                  songs={filteredSongs}
                  currentSong={songs[player.index]}
                  onSelectSong={(song) => {
                      const idx = songs.findIndex(s => s.id === song.id);
                      if (idx !== -1) player.selectSong(idx);
                  }}
                  onRemove={onRemoveFromPlaylist}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggestion/Contact CTA Section */}
      <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-16 mb-24">
        <div className="relative group">
          {/* Glow behind */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[var(--accent)]/50 via-[var(--text-secondary)]/50 to-[var(--accent)]/50 blur-2xl opacity-10 group-hover:opacity-30 transition-opacity duration-700"></div>
          
          <div className="relative bg-black/60 border border-[var(--text-secondary)]/20 backdrop-blur-2xl p-8 md:p-12 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full -mr-32 -mt-32 blur-[100px]"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 border-b border-l border-[var(--accent)]/10"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="flex-1 text-center lg:text-left">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[var(--accent)]/5 border border-[var(--accent)]/40 text-[var(--accent)] text-[10px] font-mono tracking-[0.25em] uppercase mb-6 shadow-[0_0_20px_rgba(0,255,255,0.15)] hover:shadow-[0_0_30px_rgba(0,255,255,0.25)] transition-all duration-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"></span>
                  </span>
                  <span className="font-bold">Uploads Open</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-6 text-white uppercase leading-tight">
                  Upload <span className="text-[var(--accent)]">your music</span> <br className="hidden md:block" /> directly to the mainframe
                </h2>

                <p className="text-[var(--text-secondary)] font-mono text-xs md:text-sm leading-relaxed uppercase tracking-[0.2em] max-w-2xl mx-auto lg:mx-0">
                  Join our neural network. Share your frequency with the world. Uploads are now open to all units (Max 5MB).
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto shrink-0">
                <Link 
                  to="/admin"
                  className="group/btn relative px-10 py-5 bg-black/40 border-2 border-[var(--accent)] text-[var(--accent)] font-black tracking-[0.2em] uppercase text-xs overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_var(--accent)] text-center min-w-[220px] backdrop-blur-sm flex items-center justify-center"
                >
                  {/* Content */}
                  <div className="relative z-10 flex items-center justify-center gap-3 group-hover/btn:scale-105 transition-transform duration-300">
                    <Upload size={18} strokeWidth={2.5} className="group-hover/btn:-translate-y-1 transition-transform duration-300" />
                    <span className="font-black group-hover/btn:text-black">Upload Track</span>
                  </div>
                  
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--accent)] translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                  
                  {/* Glow Effect */}
                  <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-20 bg-[var(--accent)] blur-xl transition-opacity duration-500"></div>
                  
                  <style dangerouslySetInnerHTML={{ __html: `.group/btn:hover span { color: black !important; } .group/btn:hover svg { stroke: black !important; }` }} />
                </Link>

                <a 
                  href="https://t.me/yourusername"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-10 py-5 bg-[var(--accent)] border border-[var(--accent)] text-black font-bold tracking-[0.3em] uppercase text-xs hover:bg-transparent hover:text-[var(--accent)] transition-all duration-500 hover:shadow-[0_0_30px_var(--accent)] flex items-center justify-center gap-3 min-w-[200px]"
                >
                  <Send size={18} />
                  <span>Telegram</span>
                </a>
              </div>
            </div>

            {/* Banner Metadata Footer */}
            <div className="mt-12 pt-8 border-t border-[var(--text-secondary)]/10 flex flex-wrap justify-center lg:justify-start gap-8 text-[10px] font-mono text-[var(--text-secondary)]/30 tracking-[0.4em] uppercase">
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--accent)] rounded-full"></span>
                <span>STATUS: LINKED</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--accent)] rounded-full"></span>
                <span>UPLOADER.EXE // ACTIVE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[var(--accent)] rounded-full"></span>
                <span>REF_CODE: 77-SYNC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Search Modal */}
    {isSearchOpen && (
      <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="w-full max-w-lg bg-[var(--bg-main)] border border-[var(--text-secondary)] p-6 relative max-h-[80vh] flex flex-col">
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--accent)]"
          >
            <X size={20} />
          </button>
          
          <h2 className="text-xl font-bold font-mono tracking-widest text-[var(--accent)] mb-6 uppercase">
            Search Database
          </h2>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH ARTIST OR TITLE..."
              className="flex-1 bg-black/50 border border-[var(--text-secondary)] p-3 text-sm font-mono focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)]"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isSearching}
              className="px-4 bg-[var(--accent)] text-black font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
          </form>

          {/* Message Toast */}
          {searchMsg && (
            <div className={`mb-4 p-2 text-center text-xs font-mono border ${searchMsg.type === 'success' ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}>
              {searchMsg.text}
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-[300px]">
             {searchResults.length === 0 && !isSearching && searchQuery && (
               <div className="text-center text-[var(--text-secondary)] text-xs font-mono mt-10">
                 NO DATA FOUND IN SECTOR
               </div>
             )}
             
             {searchResults.map((song) => {
               const inPlaylist = songs.some(s => s.id === song.id);
               return (
                 <div key={song.id} className="flex items-center justify-between p-3 border border-[var(--text-secondary)]/20 hover:border-[var(--text-secondary)]/50 bg-black/30 group transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                       <img src={song.coverUrl} className="w-10 h-10 object-cover border border-[var(--text-secondary)]/30" />
                       <div className="min-w-0">
                         <div className="text-xs font-bold text-[var(--text-primary)] truncate font-mono">{song.title}</div>
                         <div className="text-[9px] text-[var(--text-secondary)] truncate font-mono uppercase tracking-wider">{song.artist}</div>
                       </div>
                    </div>
                    
                    <button
                      onClick={() => handleAddSong(song)}
                      disabled={inPlaylist}
                      className={`p-2 transition-all ${inPlaylist ? 'text-green-500 cursor-default' : 'text-[var(--text-secondary)] hover:text-[var(--accent)] border border-transparent hover:border-[var(--accent)]'}`}
                      title={inPlaylist ? "Already in playlist" : "Add to playlist"}
                    >
                      {inPlaylist ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    )}

    {/* Lyrics Overlay */}
    {showLyrics && (
      <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
        <button 
          onClick={() => setShowLyrics(false)}
          className="absolute top-6 right-6 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-2"
        >
          <X size={32} />
        </button>
        
        <div className="text-center max-w-2xl w-full max-h-full overflow-y-auto custom-scrollbar">
          <h3 className="text-[var(--accent)] text-xl font-bold tracking-widest mb-6 sticky top-0 bg-black/0 backdrop-blur-sm py-2">
            LYRICS // {current.title}
          </h3>
          <p className="text-[var(--text-primary)] font-mono whitespace-pre-line leading-loose text-lg md:text-xl">
            {current.lyrics}
          </p>
        </div>
      </div>
    )}
    </>
  );
}
