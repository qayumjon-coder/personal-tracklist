import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { getMusicList, updateSong, deleteSong } from "../services/musicApi";
import { ArrowLeft, Search, Save, X, Edit2, Play, Pause, Music as MusicIcon, Upload, Image as ImageIcon, Trash2, AlertTriangle } from "lucide-react";

interface Music {
  id: number;
  title: string;
  artist: string;
  url?: string;
  cover?: string;
  coverUrl?: string; // Handle potential naming discrepancy
  duration?: number;
  category?: string;
  liked?: boolean;
  lyrics?: string;
}

export default function MusicEditor() {
  const [list, setList] = useState<Music[]>([]);
  const [filtered, setFiltered] = useState<Music[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Music>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Cover Update State
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);

  // Audio Preview State
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [lyricsModalOpen, setLyricsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  function togglePreview(music: Music) {
    if (!music.url) return;

    if (previewId === music.id) {
      // Toggle off
      audioRef.current?.pause();
      setPreviewId(null);
    } else {
      // Play new
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(music.url);
      audio.volume = 0.5;
      audio.onended = () => setPreviewId(null);
      audioRef.current = audio;
      audio.play().catch(err => console.error("Preview playback failed:", err));
      setPreviewId(music.id);
    }
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewCoverFile(file);
      setNewCoverPreview(URL.createObjectURL(file));
    }
  }

  // Derive categories from existing songs
  const categories = ["General", ...Array.from(new Set(list.map(s => s.category || "General")))];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMusicList()
      .then((data) => {
        if (!mounted) return;
        setList(data);
        setFiltered(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(String(err));
        setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return setFiltered(list);
    setFiltered(list.filter(m => (
      (m.title || "").toLowerCase().includes(q) ||
      (m.artist || "").toLowerCase().includes(q) ||
      (m.category || "").toLowerCase().includes(q)
    )));
  }, [query, list]);

  // Clear status after 3 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  function startEdit(m: Music) {
    setEditingId(m.id);
    setEditForm({ title: m.title, artist: m.artist, category: m.category, lyrics: m.lyrics || "" });
    setNewCoverFile(null);
    setNewCoverPreview(null);
    setStatus(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setNewCoverFile(null);
    setNewCoverPreview(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      // Update via Supabase
      const updated = await updateSong(id, {
        title: editForm.title,
        artist: editForm.artist,
        category: editForm.category,
        lyrics: editForm.lyrics
      }, newCoverFile || undefined);

      setList(prev => prev.map(p => p.id === id ? { ...updated, coverUrl: updated.cover_url } : p));
      setEditingId(null);
      setEditForm({});
      setNewCoverFile(null);
      setNewCoverPreview(null);
      setStatus({ type: 'success', message: 'Track updated successfully!' });
    } catch (err) {
      console.error('Update error:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update song' });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: number) {
    setDeleteConfirmId(id);
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return;
    
    setSaving(true);
    try {
      await deleteSong(deleteConfirmId);
      setList(prev => prev.filter(m => m.id !== deleteConfirmId));
      setStatus({ type: 'success', message: 'Track deleted successfully!' });
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete error:', err);
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete song' });
    } finally {
      setSaving(false);
    }
  }

  function formatDuration(d?: number) {
    if (!d) return "--:--";
    const m = Math.floor(d / 60);
    const s = Math.floor(d % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-8 md:p-12 pt-48 md:pt-60 relative z-10 font-mono text-[var(--text-primary)] min-h-screen scale-[0.95] origin-top">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[var(--text-secondary)] pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider mb-2 flex items-center gap-3">
            <MusicIcon className="w-8 h-8 text-[var(--accent)]" /> 
            EDITOR // <span className="text-[var(--text-secondary)]">MANAGE</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest">Library Management Database</p>
        </div>
        <div className="flex items-center gap-4">
           <Link 
            to="/admin" 
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-secondary)]/10 border border-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/20 transition-all text-sm uppercase tracking-wider"
          >
            <Upload size={16} />
            New Upload
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-main)] transition-all text-sm uppercase tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,255,255,0.4)]"
          >
            <ArrowLeft size={16} />
            Back to Player
          </Link>
        </div>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm flex flex-col justify-center">
          <div className="text-[var(--text-secondary)] text-xs uppercase tracking-widest mb-1">Total Tracks</div>
          <div className="text-2xl font-bold">{list.length}</div>
        </div>
        
        <div className="md:col-span-2 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" />
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="SEARCH DATABASE..."
            className="w-full h-full bg-black/40 border border-[var(--text-secondary)] pl-12 pr-4 py-4 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_15px_rgba(0,255,255,0.1)] transition-all placeholder-[var(--text-secondary)]/50 text-base"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {/* Status Toast */}
        {status && (
          <div className={`absolute top-0 right-0 -mt-16 z-50 px-6 py-3 border backdrop-blur-md animate-bounce shadow-lg ${
            status.type === 'success' 
              ? 'border-green-500 bg-green-900/10 text-green-400' 
              : 'border-red-500 bg-red-900/10 text-red-400'
          }`}>
            <span className="font-bold uppercase tracking-wider text-sm">{status.message}</span>
          </div>
        )}

        {loading ? (
           <div className="flex items-center justify-center p-20 border border-[var(--text-secondary)] border-dashed">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            <span className="ml-4 tracking-widest animate-pulse">ACCESSING MAINFRAME...</span>
           </div>
        ) : error ? (
          <div className="p-8 border border-red-500 bg-red-900/10 text-red-400 text-center">
            ERROR: {error}
          </div>
        ) : (
          <div className="bg-black/40 border border-[var(--text-secondary)] backdrop-blur-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_2fr_1.5fr_1fr_0.5fr_1.5fr] gap-4 p-4 border-b border-[var(--text-secondary)] bg-[var(--text-secondary)]/5 text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
              <div className="w-12 text-center">Img</div>
              <div>Title</div>
              <div>Artist</div>
              <div>Category</div>
              <div className="text-right">Time</div>
              <div className="text-right">Actions</div>
            </div>

            {/* List */}
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {filtered.map(m => (
                <div 
                  key={m.id} 
                  className={`grid grid-cols-[auto_2fr_1.5fr_1fr_0.5fr_1.5fr] gap-4 p-4 border-b border-[var(--text-secondary)]/20 items-center hover:bg-[var(--text-secondary)]/5 transition-colors ${
                    editingId === m.id ? 'bg-[var(--text-secondary)]/10 ring-1 ring-inset ring-[var(--accent)]' : ''
                  }`}
                >
                  {/* Cover */}
                  <div className="w-12 h-12 border border-[var(--text-secondary)] overflow-hidden bg-black relative group/cover">
                    <img 
                      src={newCoverPreview || m.cover || m.coverUrl || '/placeholder.png'} 
                      alt="" 
                      className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    />
                    {editingId === m.id && (
                      <label className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer opacity-0 group-hover/cover:opacity-100 transition-opacity">
                        <ImageIcon className="w-5 h-5 text-[var(--accent)]" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleCoverChange}
                        />
                      </label>
                    )}
                  </div>

                  {/* Title */}
                  <div className="min-w-0">
                    {editingId === m.id ? (
                      <input 
                        className="w-full bg-black/50 border border-[var(--text-secondary)] p-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                        value={editForm.title || ""} 
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Title"
                        autoFocus
                      />
                    ) : (
                      <div className="font-bold truncate" title={m.title}>{m.title}</div>
                    )}
                  </div>

                  {/* Artist */}
                  <div className="min-w-0">
                     {editingId === m.id ? (
                      <input 
                        className="w-full bg-black/50 border border-[var(--text-secondary)] p-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                        value={editForm.artist || ""} 
                        onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                        placeholder="Artist"
                      />
                    ) : (
                      <div className="text-sm opacity-80 truncate" title={m.artist}>{m.artist}</div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="min-w-0">
                     {editingId === m.id ? (
                      <select
                        className="w-full bg-black/50 border border-[var(--text-secondary)] p-2 text-sm focus:border-[var(--accent)] focus:outline-none appearance-none"
                        value={editForm.category || "General"} 
                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      >
                         {categories.map(c => <option key={c} value={c}>{c}</option>)}
                         <option value="New">+ New...</option>
                      </select>
                    ) : (
                      <div className="inline-block px-2 py-1 text-[10px] border border-[var(--text-secondary)] text-[var(--text-secondary)] uppercase tracking-wider">
                        {m.category || "General"}
                      </div>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="text-right text-sm text-[var(--text-secondary)] font-mono">
                    {formatDuration(m.duration)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    {editingId === m.id ? (
                      <>
                        <button 
                          onClick={() => saveEdit(m.id)}
                          disabled={saving}
                          className="p-2 border border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-main)] hover:bg-transparent hover:text-[var(--accent)] transition-all"
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="p-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                        <button 
                          onClick={() => setLyricsModalOpen(true)}
                          className="p-2 border border-[var(--text-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all ml-2"
                          title="Edit Lyrics"
                        >
                          <span className="text-xs font-bold font-mono">LYRICS</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => startEdit(m)}
                          className="p-2 border border-[var(--text-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(m.id)}
                          className="p-2 border border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10 transition-all"
                          title="Delete Track"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => togglePreview(m)}
                          disabled={!m.url}
                          className={`p-2 border transition-all ${
                            previewId === m.id 
                              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10" 
                              : "border-[var(--text-secondary)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          }`}
                          title={previewId === m.id ? "Stop Preview" : "Preview Track"}
                        >
                          {previewId === m.id ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      </>
                    )}
                  </div>

                </div>
              ))}
              
              {filtered.length === 0 && (
                <div className="p-12 text-center text-[var(--text-secondary)] tracking-widest">
                  NO TRACKS FOUND IN DATABASE
                </div>
              )}
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border-2 border-red-500/30 w-full max-w-md p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ff0000_1px,transparent_1px)] [background-size:20px_20px]"></div>
            
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-red-500/10 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              
              <h3 className="text-2xl font-bold tracking-[0.2em] text-white mb-2 font-mono uppercase">
                Confirm Deletion
              </h3>
              
              <div className="h-0.5 w-16 bg-red-500 mx-auto mb-6"></div>
              
              <p className="text-gray-400 mb-8 font-mono text-sm leading-relaxed uppercase tracking-widest">
                Warning: This track and all associated files will be <span className="text-red-500 underline decoration-red-500/30">permanently purged</span> from the mainframe.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={saving}
                  className="py-3 border border-gray-700 text-gray-500 font-mono text-xs tracking-[0.3em] hover:bg-white/5 hover:text-white transition-all uppercase disabled:opacity-50"
                >
                  ABORT
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={saving}
                  className="py-3 bg-red-500 text-black font-mono font-bold text-xs tracking-[0.3em] hover:bg-red-600 transition-all uppercase shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "PURGE"
                  )}
                </button>
              </div>
            </div>
            
            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent h-[2px] w-full animate-scanline opacity-20"></div>
          </div>
        </div>
      )}

      {/* Lyrics Modal */}
      {lyricsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-main)] border border-[var(--accent)] w-full max-w-2xl p-6 shadow-[0_0_50px_rgba(0,255,255,0.2)] flex flex-col h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b border-[var(--text-secondary)] pb-4">
              <h3 className="text-xl font-bold tracking-widest text-[var(--accent)]">EDIT LYRICS</h3>
              <button onClick={() => setLyricsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-red-500">
                <X size={24} />
              </button>
            </div>
            <textarea
              className="flex-1 bg-black/50 border border-[var(--text-secondary)] p-4 font-mono text-sm leading-relaxed focus:border-[var(--accent)] focus:outline-none resize-none custom-scrollbar"
              value={editForm.lyrics || ""}
              onChange={e => setEditForm({...editForm, lyrics: e.target.value})}
              placeholder="Enter lyrics here..."
            />
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setLyricsModalOpen(false)}
                className="px-6 py-2 bg-[var(--accent)] text-[var(--bg-main)] font-bold tracking-wider hover:opacity-90"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
      

            
      </div>
    </div>
  );
}
