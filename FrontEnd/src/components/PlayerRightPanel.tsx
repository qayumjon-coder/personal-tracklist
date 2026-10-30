import { ChevronDown, ListMusic, ListPlus, History, Trash2, X, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { CyberCategoryDropdown } from "./CyberCategoryDropdown";
import type { Song } from "../types/Song";
import { Playlist } from "./Playlist";

interface PlayerRightPanelProps {
  player: any;
  songs: Song[];
  filteredSongs: Song[];
  recentlyPlayed: Song[];
  onClearRecentlyPlayed?: () => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  categoryCounts?: Record<string, number>;
  rightTab: 'playlist' | 'queue' | 'recent';
  setRightTab: (tab: 'playlist' | 'queue' | 'recent') => void;
  isMobilePlaylistOpen: boolean;
  setIsMobilePlaylistOpen: (open: boolean) => void;
  drawerDragDistance: number;
  onDrawerTouchStart: (e: React.TouchEvent) => void;
  onDrawerTouchMove: (e: React.TouchEvent) => void;
  onDrawerTouchEnd: () => void;
  drawerTouchStartY: number | null;
  isConfigMenuOpen: boolean;
  setIsConfigMenuOpen: (open: boolean) => void;
  onRemoveFromPlaylist: (id: number) => void;
  onBulkRemove: (ids: number[]) => void;
  onReorderPlaylist: (startIndex: number, endIndex: number) => void;
  localFilesInfo?: any;
  isCached: (id: number) => boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  playClick: () => void;
  playHover: () => void;
}

export function PlayerRightPanel({
  player,
  songs,
  filteredSongs,
  recentlyPlayed,
  onClearRecentlyPlayed,
  categories,
  selectedCategory,
  setSelectedCategory,
  categoryCounts,
  rightTab,
  setRightTab,
  isMobilePlaylistOpen,
  setIsMobilePlaylistOpen,
  drawerDragDistance,
  onDrawerTouchStart,
  onDrawerTouchMove,
  onDrawerTouchEnd,
  drawerTouchStartY,
  isConfigMenuOpen: _isConfigMenuOpen,
  setIsConfigMenuOpen: _setIsConfigMenuOpen,
  onRemoveFromPlaylist,
  onBulkRemove,
  onReorderPlaylist,
  localFilesInfo,
  isCached,
  hasMore,
  loadingMore,
  onLoadMore,
  playClick,
  playHover
}: PlayerRightPanelProps) {
  const computedCategoryCounts = useMemo(() => {
    if (categoryCounts) return categoryCounts;
    const counts: Record<string, number> = {
      All: songs.length,
      "Recently Played": recentlyPlayed.length,
      Queue: player.queue?.length || 0,
    };
    songs.forEach(s => {
      const raw = s.category || "General";
      const parts = raw
        .split(/[,/&|+]+|\band\b/i)
        .map(c => c.trim().replace(/^#+/, '').toUpperCase())
        .filter(Boolean);
      const uniqueSongGenres = new Set(parts.length > 0 ? parts : ["GENERAL"]);
      uniqueSongGenres.forEach(genre => {
        counts[genre] = (counts[genre] || 0) + 1;
      });
    });
    return counts;
  }, [categoryCounts, songs, recentlyPlayed, player.queue]);
  return (
    <>
      {/* Mobile Cover Overlay */}
      {isMobilePlaylistOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] md:hidden transition-opacity duration-300"
          onClick={() => setIsMobilePlaylistOpen(false)}
        />
      )}

      <div className={`
        fixed inset-x-0 bottom-0 z-[50] md:relative md:z-10
        w-full md:w-64 lg:w-96 xl:w-[400px] flex flex-col 
        bg-[var(--bg-main)]/95 md:bg-[var(--bg-main)]/50 
        border-t md:border-t-0 border-[var(--accent)]/30 md:border-transparent
        backdrop-blur-xl md:backdrop-blur-sm 
        transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        ${isMobilePlaylistOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        h-[80vh] md:h-full min-h-0 overflow-hidden
        shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-none
      `}
      style={{
        transform: drawerDragDistance > 0 ? `translateY(${drawerDragDistance}px)` : undefined,
        transition: drawerTouchStartY !== null ? 'none' : ''
      }}
      >
        {/* Mobile Swipe Handle */}
        <div
          className="w-full flex justify-center py-3 md:hidden cursor-pointer active:bg-white/5 border-b border-[var(--text-secondary)]/10"
          onClick={() => setIsMobilePlaylistOpen(false)}
          onTouchStart={onDrawerTouchStart}
          onTouchMove={onDrawerTouchMove}
          onTouchEnd={onDrawerTouchEnd}
        >
          <div className="flex items-center justify-center w-full pointer-events-none">
            <div className="w-12 h-1 bg-[var(--text-secondary)]/40 rounded-full" />
            <ChevronDown className="absolute right-4 text-[var(--text-secondary)]/50" size={16} />
          </div>
        </div>

        {/* Right Panel Tabs */}
        <div className="flex items-stretch border-b border-[var(--text-secondary)]/30 bg-[var(--text-secondary)]/5 shrink-0">
          {[
            { id: 'playlist', label: 'Tracklist', icon: <ListMusic size={11} /> },
            { id: 'queue',    label: `Queue${player.queue.length > 0 ? ` (${player.queue.length})` : ''}`, icon: <ListPlus size={11} /> },
            { id: 'recent',   label: 'Recent', icon: <History size={11} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { playClick(); setRightTab(tab.id as any); }}
              onMouseEnter={playHover}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[8px] font-mono uppercase tracking-wider transition-all border-b-2 ${
                rightTab === tab.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Category filter with CyberCategoryDropdown & Quick Pills */}
        {rightTab === 'playlist' && (
          <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-white/10 bg-black/40">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono text-white/70 font-bold tracking-widest shrink-0">
                {filteredSongs.length} SONGS
              </span>
              <div className="flex-1 max-w-[200px]">
                <CyberCategoryDropdown
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => {
                    playClick();
                    setSelectedCategory(cat);
                  }}
                  categoryCounts={computedCategoryCounts}
                  totalSongs={songs.length}
                  align="right"
                />
              </div>
            </div>

            {/* Quick Filter Tag Bar (All, Top 3 Genres, Clear) */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
              <button
                type="button"
                onClick={() => { playClick(); setSelectedCategory("All"); }}
                className={`px-2 py-0.5 text-[8px] font-mono border transition-all shrink-0 ${
                  selectedCategory === "All"
                    ? "border-[var(--accent)] bg-[var(--accent)] text-black font-bold shadow-[0_0_6px_var(--accent)]"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
              >
                ALL ({songs.length})
              </button>
              {categories
                .filter(c => !["All", "Trending", "Favorites", "Queue", "Recently Played"].includes(c))
                .sort((a, b) => (computedCategoryCounts[b] || 0) - (computedCategoryCounts[a] || 0))
                .slice(0, 3)
                .map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playClick();
                      setSelectedCategory(selectedCategory.toLowerCase() === cat.toLowerCase() ? "All" : cat);
                    }}
                    className={`px-1.5 py-0.5 text-[8px] font-mono border transition-all truncate max-w-[95px] shrink-0 ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? "border-[var(--accent)] bg-[var(--accent)] text-black font-bold shadow-[0_0_6px_var(--accent)]"
                        : "border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              {selectedCategory !== "All" && (
                <button
                  type="button"
                  onClick={() => { playClick(); setSelectedCategory("All"); }}
                  className="px-1.5 py-0.5 text-[8px] font-mono text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500 bg-red-500/10 ml-auto shrink-0 flex items-center gap-0.5 font-bold"
                  title="Filtrni tozalash"
                >
                  <X size={8} /> CLEAR
                </button>
              )}
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-hidden p-0 flex flex-col">
          {rightTab === 'playlist' && (
            <>
              <Playlist
                songs={filteredSongs}
                currentSong={songs[player.index]}
                onSelectSong={(song) => {
                  const idx = songs.findIndex(s => s.id === song.id);
                  if (idx !== -1) player.selectSong(idx);
                  setIsMobilePlaylistOpen(false);
                }}
                onRemove={onRemoveFromPlaylist}
                onBulkRemove={onBulkRemove}
                onReorder={onReorderPlaylist}
                localFilesInfo={localFilesInfo}
                isCached={isCached}
                onAddToQueue={player.addToQueue}
              />
              {hasMore && onLoadMore && (
                <div className="p-3 flex justify-center">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="text-[9px] font-mono uppercase tracking-widest border border-[var(--text-secondary)]/30 px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {loadingMore ? <Loader2 size={10} className="animate-spin" /> : null}
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}

          {rightTab === 'queue' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {player.queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8 opacity-50">
                  <ListPlus size={36} className="text-[var(--text-secondary)]" strokeWidth={1} />
                  <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-[0.2em] text-center">Queue is empty.<br/>Use the ⋮ menu on any track to add to queue.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--text-secondary)]/10">
                    <span className="text-[8px] font-mono text-[var(--text-secondary)]/50 tracking-widest">{player.queue.length} IN QUEUE</span>
                    <button
                      onClick={() => player.clearQueue()}
                      className="text-[8px] font-mono text-[var(--danger)] hover:opacity-70 uppercase tracking-wider flex items-center gap-1"
                    >
                      <Trash2 size={9} /> Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1">
                    {player.queue.map((song: any, i: number) => (
                      <div key={`${song.id}-${i}`} className="flex items-center gap-2 px-2 py-2 hover:bg-white/5 group/q transition-colors">
                        <span className="text-[8px] font-mono text-[var(--accent)]/30 w-4 shrink-0">{i + 1}</span>
                        <img src={song.coverUrl || '/default-cover.png'} alt="" className="w-7 h-7 object-cover border border-[var(--text-secondary)]/20 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-bold font-mono truncate uppercase text-[var(--text-secondary)]">{song.title}</div>
                          <div className="text-[7px] font-mono truncate opacity-40 uppercase">{song.artist}</div>
                        </div>
                        <button
                          onClick={() => player.removeFromQueue(i)}
                          className="shrink-0 text-[var(--text-secondary)]/20 hover:text-[var(--danger)] opacity-0 group-hover/q:opacity-100 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {rightTab === 'recent' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {recentlyPlayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-8 opacity-50">
                  <History size={36} className="text-[var(--text-secondary)]" strokeWidth={1} />
                  <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-[0.2em] text-center">No history yet.<br/>Play some tracks!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--text-secondary)]/10">
                    <span className="text-[8px] font-mono text-[var(--text-secondary)]/50 tracking-widest">{recentlyPlayed.length} TRACKS</span>
                    <button
                      onClick={onClearRecentlyPlayed}
                      className="text-[8px] font-mono text-[var(--danger)] hover:opacity-70 uppercase tracking-wider flex items-center gap-1"
                    >
                      <Trash2 size={9} /> Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5 p-1">
                    {recentlyPlayed.map((song, i) => {
                      const isActive = song.id === songs[player.index]?.id;
                      return (
                        <button
                          key={`${song.id}-${i}`}
                          onClick={() => {
                            const idx = songs.findIndex(s => s.id === song.id);
                            if (idx !== -1) { playClick(); player.selectSong(idx); }
                          }}
                          className={`flex items-center gap-2 px-2 py-2 hover:bg-white/5 w-full text-left transition-colors ${isActive ? 'playlist-active-bg' : ''}`}
                        >
                          <span className="text-[8px] font-mono text-[var(--accent)]/30 w-4 shrink-0">{i + 1}</span>
                          <img src={song.coverUrl || '/default-cover.png'} alt="" className="w-7 h-7 object-cover border border-[var(--text-secondary)]/20 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className={`text-[9px] font-bold font-mono truncate uppercase ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>{song.title}</div>
                            <div className="text-[7px] font-mono truncate opacity-40 uppercase">{song.artist}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
