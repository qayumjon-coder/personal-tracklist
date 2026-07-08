import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getMusicList, updateSong, deleteSong } from "../services/musicApi";
import { ArrowLeft, Search, Save, X, Edit2, Play, Pause, Music as MusicIcon, Upload, Image as ImageIcon, Trash2, AlertTriangle, BarChart2, Maximize2, PlayCircle, Users, Clock, FileText, TrendingUp, CheckCircle, ShieldOff, ShieldCheck, Calendar, Inbox } from "lucide-react";
import { Pagination } from "../components/Pagination";
import { useDebounce } from "../hooks/useDebounce";
import { useScrollLock } from "../hooks/useScrollLock";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface Music {
  id: number;
  title: string;
  artist: string;
  url?: string;
  cover?: string;
  coverUrl?: string;
  duration?: number;
  category?: string;
  liked?: boolean;
  lyrics?: string;
  play_count?: number;
  created_at?: string;
}

export default function Admin() {
  const [list, setList] = useState<Music[]>([]);
  const [filtered, setFiltered] = useState<Music[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Music>>({});
  const [saving, setSaving] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Cover Update State
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);

  // Audio Preview State
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [lyricsModalOpen, setLyricsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useScrollLock(!!deleteConfirmId || lyricsModalOpen);

  // ── Upload Permission State ──────────────────────────────────────────────────
  interface UploadRequest {
    id: string;
    created_at: string;
    requester_name: string;
    requester_message: string;
    fingerprint: string;
    status: 'pending' | 'approved' | 'rejected';
  }
  interface UploadPermission {
    id: string;
    granted_at: string;
    expires_at: string | null;
    fingerprint: string;
    is_active: boolean;
    request_id: string | null;
  }

  const [uploadRequests, setUploadRequests] = useState<UploadRequest[]>([]);
  const [uploadPermissions, setUploadPermissions] = useState<UploadPermission[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'library' | 'requests'>('library');

  // Approve modal state
  const [approveModal, setApproveModal] = useState<{ request: UploadRequest } | null>(null);
  const [approveDays, setApproveDays] = useState<number | 'forever' | 'custom'>('forever');
  const [customDays, setCustomDays] = useState(7);
  const [approving, setApproving] = useState(false);

  async function loadUploadRequests() {
    setLoadingRequests(true);
    const { data: reqs } = await supabase
      .from('upload_requests')
      .select('*')
      .order('created_at', { ascending: false });
    const { data: perms } = await supabase
      .from('upload_permissions')
      .select('*')
      .order('granted_at', { ascending: false });
    if (reqs) setUploadRequests(reqs as UploadRequest[]);
    if (perms) setUploadPermissions(perms as UploadPermission[]);
    setLoadingRequests(false);
  }

  useEffect(() => { loadUploadRequests(); }, []);

  async function approveRequest(request: UploadRequest, days: number | 'forever' | 'custom', customDaysVal: number) {
    setApproving(true);
    try {
      const expiresAt = days === 'forever'
        ? null
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + (days === 'custom' ? customDaysVal : days));
            return d.toISOString();
          })();

      await supabase.from('upload_permissions').insert([{
        fingerprint: request.fingerprint,
        expires_at: expiresAt,
        is_active: true,
        request_id: request.id,
      }]);

      await supabase.from('upload_requests').update({ status: 'approved' }).eq('id', request.id);
      toast.success(`"${request.requester_name}" ga ruxsat berildi!`);
      setApproveModal(null);
      loadUploadRequests();
    } catch (err) {
      toast.error('Ruxsat berishda xatolik');
    } finally {
      setApproving(false);
    }
  }

  async function rejectRequest(id: string) {
    await supabase.from('upload_requests').update({ status: 'rejected' }).eq('id', id);
    toast.success('So\'rov rad etildi');
    loadUploadRequests();
  }

  async function revokePermission(id: string) {
    await supabase.from('upload_permissions').update({ is_active: false }).eq('id', id);
    toast.success('Ruxsat bekor qilindi');
    loadUploadRequests();
  }

  function formatExpiresAt(expiresAt: string | null) {
    if (!expiresAt) return '∞ Abadiy';
    const d = new Date(expiresAt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    if (diffMs < 0) return '⚠ Muddati o\'tgan';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `${diffDays} kun qoldi (${d.toLocaleDateString('uz-UZ')})`;
  }


  // Stats Calculations
  const stats = useMemo(() => {
    if (!list.length) return null;
    
    // Duration
    const withDuration = list.filter(m => m.duration);
    const shortest = withDuration.length ? withDuration.reduce((prev, curr) => (prev.duration! < curr.duration!) ? prev : curr) : null;
    const longest = withDuration.length ? withDuration.reduce((prev, curr) => (prev.duration! > curr.duration!) ? prev : curr) : null;
    const totalDuration = list.reduce((acc, m) => acc + (m.duration || 0), 0);
    const avgDuration = list.length ? totalDuration / list.length : 0;
    
    // Categories
    const cats: Record<string, number> = {};
    list.forEach(m => {
        const c = m.category || "General";
        cats[c] = (cats[c] || 0) + 1;
    });
    const topCat = Object.entries(cats).sort((a,b) => b[1] - a[1])[0];

    // Artists
    const uniqueArtists = new Set(list.map(m => m.artist)).size;

    // Plays
    const totalPlays = list.reduce((acc, m) => acc + (m.play_count || 0), 0);
    const mostPlayed = list.length ? list.reduce((prev, curr) => ((prev.play_count || 0) > (curr.play_count || 0)) ? prev : curr) : null;

    // Lyrics
    const withLyrics = list.filter(m => m.lyrics && m.lyrics.trim().length > 0).length;
    const lyricsProgress = (withLyrics / list.length) * 100;

    return { shortest, longest, topCat, totalDuration, avgDuration, uniqueArtists, totalPlays, mostPlayed, lyricsProgress };
  }, [list]);

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

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      setFiltered(list);
      return;
    }
    setFiltered(list.filter(m => (
      (m.title || "").toLowerCase().includes(q) ||
      (m.artist || "").toLowerCase().includes(q) ||
      (m.category || "").toLowerCase().includes(q)
    )));
    setCurrentPage(1);
  }, [debouncedQuery, list]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedList = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function startEdit(m: Music) {
    setEditingId(m.id);
    setEditForm({ title: m.title, artist: m.artist, category: m.category, lyrics: m.lyrics || "" });
    setNewCoverFile(null);
    setNewCoverPreview(null);
    setNewCategoryInput("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setNewCoverFile(null);
    setNewCoverPreview(null);
    setNewCategoryInput("");
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      const finalCategory = editForm.category === 'New' ? (newCategoryInput.trim() || 'General') : editForm.category;

      // Update via Supabase
      const updated = await updateSong(id, {
        title: editForm.title,
        artist: editForm.artist,
        category: finalCategory,
        lyrics: editForm.lyrics
      }, newCoverFile || undefined);

      setList(prev => prev.map(p => p.id === id ? { ...updated, coverUrl: updated.cover_url } : p));
      setEditingId(null);
      setEditForm({});
      setNewCoverFile(null);
      setNewCoverPreview(null);
      toast.success('Track updated successfully!');
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update song');
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
      toast.success('Track deleted successfully!');
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete song');
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
            to="/upload" 
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-secondary)]/10 border border-[var(--text-secondary)] hover:bg-[var(--text-secondary)]/20 transition-all text-sm uppercase tracking-wider"
          >
            <Upload size={16} />
            New Upload
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-main)] transition-all text-sm uppercase tracking-wider shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)]"
          >
            <ArrowLeft size={16} />
            Back to Player
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0 mb-8 border border-[var(--text-secondary)]/30 w-fit bg-black/80 backdrop-blur-md">
        <button
          onClick={() => setActiveAdminTab('library')}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-mono uppercase tracking-widest transition-all ${activeAdminTab === 'library' ? 'bg-[var(--accent)] text-[var(--bg-main)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}
        >
          <MusicIcon size={13} /> Library
        </button>
        <button
          onClick={() => { setActiveAdminTab('requests'); loadUploadRequests(); }}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-mono uppercase tracking-widest transition-all relative ${activeAdminTab === 'requests' ? 'bg-[var(--accent)] text-[var(--bg-main)] font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}
        >
          <Inbox size={13} /> Upload So&apos;rovlari
          {uploadRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
              {uploadRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Upload Requests Tab */}
      {activeAdminTab === 'requests' && (
        <div className="space-y-8 bg-black/80 backdrop-blur-md p-6 sm:p-8 border border-[var(--text-secondary)]/30 relative z-20">
          {/* Pending Requests */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] mb-4 flex items-center gap-2">
              <Calendar size={14} /> Kutilayotgan So&apos;rovlar
            </h2>
            {loadingRequests ? (
              <div className="text-[var(--text-secondary)] text-xs font-mono animate-pulse">Yuklanmoqda...</div>
            ) : uploadRequests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="border border-[var(--text-secondary)]/20 p-6 text-center text-[var(--text-secondary)] text-xs font-mono uppercase tracking-widest">
                Hozircha kutilayotgan so&apos;rovlar yo&apos;q
              </div>
            ) : (
              <div className="space-y-3">
                {uploadRequests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} className="border border-yellow-400/30 bg-yellow-400/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                        <span className="font-bold text-sm text-white">{req.requester_name}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">{new Date(req.created_at).toLocaleString('uz-UZ')}</span>
                      </div>
                      {req.requester_message && (
                        <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed pl-4 border-l border-[var(--text-secondary)]/30">{req.requester_message}</p>
                      )}
                      <div className="text-[9px] text-[var(--text-secondary)]/50 font-mono mt-1 pl-4">FP: {req.fingerprint.slice(0,16)}...</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setApproveModal({ request: req }); setApproveDays('forever'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/40 text-green-400 text-[10px] font-mono uppercase tracking-wider hover:bg-green-500/20 transition-all"
                      >
                        <CheckCircle size={12} /> Ruxsat Berish
                      </button>
                      <button
                        onClick={() => rejectRequest(req.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-mono uppercase tracking-wider hover:bg-red-500/20 transition-all"
                      >
                        <ShieldOff size={12} /> Rad Etish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Permissions */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] mb-4 flex items-center gap-2">
              <ShieldCheck size={14} /> Berilgan Ruxsatlar
            </h2>
            {uploadPermissions.filter(p => p.is_active).length === 0 ? (
              <div className="border border-[var(--text-secondary)]/20 p-6 text-center text-[var(--text-secondary)] text-xs font-mono uppercase tracking-widest">
                Faol ruxsatlar yo&apos;q
              </div>
            ) : (
              <div className="space-y-3">
                {uploadPermissions.filter(p => p.is_active).map(perm => {
                  const req = uploadRequests.find(r => r.id === perm.request_id);
                  const isExpired = perm.expires_at && new Date(perm.expires_at) < new Date();
                  return (
                    <div key={perm.id} className={`border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isExpired ? 'border-red-500/30 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck size={13} className={isExpired ? 'text-red-400' : 'text-green-400'} />
                          <span className="font-bold text-sm text-white">{req?.requester_name || 'Noma\'lum'}</span>
                          <span className={`text-[10px] font-mono ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                            {formatExpiresAt(perm.expires_at)}
                          </span>
                        </div>
                        <div className="text-[9px] text-[var(--text-secondary)]/50 font-mono pl-5">FP: {perm.fingerprint.slice(0,16)}...</div>
                      </div>
                      <button
                        onClick={() => revokePermission(perm.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-mono uppercase tracking-wider hover:bg-red-500/20 transition-all shrink-0"
                      >
                        <X size={12} /> Bekor Qilish
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rejected/History */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-4 flex items-center gap-2">
              <FileText size={14} /> Tarix (Rad Etilgan)
            </h2>
            <div className="space-y-2">
              {uploadRequests.filter(r => r.status === 'rejected').map(req => (
                <div key={req.id} className="border border-[var(--text-secondary)]/20 p-3 flex items-center justify-between opacity-60">
                  <div>
                    <span className="text-sm font-mono text-[var(--text-secondary)] line-through">{req.requester_name}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]/50 font-mono ml-3">{new Date(req.created_at).toLocaleDateString('uz-UZ')}</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400/60 uppercase">rad etilgan</span>
                </div>
              ))}
              {uploadRequests.filter(r => r.status === 'rejected').length === 0 && (
                <div className="text-[var(--text-secondary)]/50 text-xs font-mono text-center py-4">Tarix bo&apos;sh</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Library Tab */}
      {activeAdminTab === 'library' && (
      <div>
      {/* Stats & Search */}
      <div className="space-y-6 mb-8">
        
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" />
          </div>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="SEARCH DATABASE..."
            className="w-full bg-black/40 border border-[var(--text-secondary)] pl-12 pr-4 py-4 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] transition-all placeholder-[var(--text-secondary)]/50 text-base"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Total */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <MusicIcon size={12} /> Total Tracks
              </div>
              <div className="text-2xl font-bold group-hover:text-[var(--accent)] transition-colors">{list.length}</div>
            </div>

            {/* Total Plays */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <PlayCircle size={12} /> Total Plays
              </div>
              <div className="text-2xl font-bold group-hover:text-[var(--accent)] transition-colors">
                {stats?.totalPlays.toLocaleString() || 0}
              </div>
            </div>

            {/* Artists */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <Users size={12} /> Unique Artists
              </div>
              <div className="text-2xl font-bold group-hover:text-[var(--accent)] transition-colors">
                {stats?.uniqueArtists || 0}
              </div>
            </div>

            {/* Top Cat */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <BarChart2 size={12} /> Top Genre
              </div>
              <div className="text-lg font-bold truncate group-hover:text-[var(--accent)] transition-colors" title={stats?.topCat?.[0] || 'N/A'}>
                {stats?.topCat ? stats.topCat[0] : 'N/A'} 
                <span className="text-xs text-[var(--text-secondary)] ml-2">({stats?.topCat?.[1] || 0})</span>
              </div>
            </div>

            {/* Most Played */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <TrendingUp size={12} /> Most Played
              </div>
              <div className="text-sm font-bold truncate group-hover:text-[var(--accent)] transition-colors">
                 {stats?.mostPlayed?.title || 'N/A'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                 {stats?.mostPlayed?.play_count || 0} views
              </div>
            </div>

            {/* Total Duration */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <Clock size={12} /> Total Time
              </div>
              <div className="text-sm font-bold truncate group-hover:text-[var(--accent)] transition-colors">
                 {Math.floor((stats?.totalDuration || 0) / 3600)}h {Math.floor(((stats?.totalDuration || 0) % 3600) / 60)}m
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                 Avg: {formatDuration(stats?.avgDuration)}
              </div>
            </div>

            {/* Lyrics Coverage */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <FileText size={12} /> Lyrics Progress
              </div>
              <div className="text-lg font-bold group-hover:text-[var(--accent)] transition-colors">
                 {Math.round(stats?.lyricsProgress || 0)}%
              </div>
              {/* Progress bar */}
              <div className="w-full h-1 bg-[var(--text-secondary)]/20 mt-2 overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent)] transition-all duration-1000" 
                  style={{ width: `${stats?.lyricsProgress || 0}%` }}
                />
              </div>
            </div>

            {/* Longest */}
            <div className="bg-black/40 border border-[var(--text-secondary)] p-4 backdrop-blur-sm group hover:border-[var(--accent)] transition-colors">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest mb-2">
                 <Maximize2 size={12} /> Longest
              </div>
              <div className="text-sm font-bold truncate group-hover:text-[var(--accent)] transition-colors">
                 {stats?.longest?.title || 'N/A'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                 {formatDuration(stats?.longest?.duration)}
              </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative">
        {loading ? (
           <div className="flex flex-col items-center justify-center p-32 border border-[var(--text-secondary)]/30 bg-black/40 backdrop-blur-sm relative overflow-hidden group">
             {/* Scanning Line Background */}
             <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,var(--accent)_50%,transparent_100%)] opacity-5 w-full h-[200%] -translate-y-1/2 animate-[scan_4s_linear_infinite]" style={{ backgroundSize: '100% 3px' }}></div>
             
             {/* Main Loader */}
             <div className="relative w-24 h-24 mb-8">
               {/* Outer Ring */}
               <div className="absolute inset-0 border-2 border-[var(--accent)]/30 rounded-full animate-[spin_3s_linear_infinite]" style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }} />
               <div className="absolute inset-0 border-2 border-[var(--accent)]/30 rounded-full animate-[spin_3s_linear_infinite_reverse]" style={{ borderBottomColor: 'transparent', borderRightColor: 'transparent' }} />
               
               {/* Inner Hexagon/Square */}
               <div className="absolute inset-4 border border-[var(--accent)] rounded-sm rotate-45 animate-pulse flex items-center justify-center bg-[var(--accent)]/5">
                  <div className="w-2 h-2 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent)] animate-ping" />
               </div>
               
               {/* Orbiting Particle */}
               <div className="absolute inset-0 animate-[spin_1.5s_linear_infinite]">
                 <div className="h-2 w-2 bg-[var(--accent)] rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 shadow-[0_0_10px_var(--accent)]" />
               </div>
             </div>
             
             {/* Text Animation */}
             <div className="flex flex-col items-center gap-2 relative z-10">
               <span className="text-[var(--accent)] font-black text-lg tracking-[0.3em] font-mono animate-pulse text-glow">
                 INITIALIZING
               </span>
               <div className="flex gap-1">
                 <span className="w-1 h-1 bg-[var(--text-secondary)] animate-bounce [animation-delay:-0.3s]"></span>
                 <span className="w-1 h-1 bg-[var(--text-secondary)] animate-bounce [animation-delay:-0.15s]"></span>
                 <span className="w-1 h-1 bg-[var(--text-secondary)] animate-bounce"></span>
               </div>
               <span className="text-[var(--text-secondary)] text-[10px] tracking-[0.5em] uppercase opacity-70 mt-2">
                 Retrieving Neural Data...
               </span>
             </div>
           </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-16 md:p-32 border border-red-500/50 bg-red-950/20 backdrop-blur-sm relative overflow-hidden group mt-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1)_0,transparent_100%)]"></div>
            
            <AlertTriangle className="w-16 h-16 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-pulse" />
            <h2 className="text-2xl font-black text-red-500 tracking-[0.3em] font-mono uppercase mb-4 text-glow px-4 text-center">
              SYSTEM ERROR
            </h2>
            <div className="px-6 py-3 border border-red-500/30 bg-red-900/20 font-mono text-sm tracking-wider text-red-300 max-w-lg text-center leading-relaxed">
              {error}
            </div>
            
            <button 
              onClick={() => window.location.reload()}
              className="mt-8 px-8 py-3 bg-red-500/10 border border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-bold font-mono tracking-widest text-xs uppercase transition-all shadow-[0_0_15px_rgba(255,0,0,0.2)] hover:shadow-[0_0_25px_rgba(255,0,0,0.4)]"
            >
              REBOOT SYSTEM
            </button>
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
              {paginatedList.map(m => (
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
                      <div className="flex flex-col gap-2">
                        <select
                          className="w-full bg-black/50 border border-[var(--text-secondary)] p-2 text-sm focus:border-[var(--accent)] focus:outline-none appearance-none"
                          value={editForm.category || "General"} 
                          onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        >
                           {categories.map(c => <option key={c} value={c}>{c}</option>)}
                           <option value="New">+ New...</option>
                        </select>
                        {editForm.category === "New" && (
                          <input
                            className="w-full bg-black/50 border border-[var(--accent)] p-2 text-sm focus:border-[var(--accent)] focus:outline-none translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-2"
                            placeholder="Type new category..."
                            value={newCategoryInput}
                            onChange={e => setNewCategoryInput(e.target.value)}
                            autoFocus
                          />
                        )}
                      </div>
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
            
            {totalPages > 1 && (
              <div className="p-4 border-t border-[var(--text-secondary)]/20 bg-black/40">
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={setCurrentPage} 
                />
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      )}

      {/* Delete Confirmation Modal */}

      {/* Approve Duration Modal */}
      {approveModal && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-[var(--bg-main)] border border-green-500/50 shadow-[0_0_60px_rgba(0,255,0,0.1)] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-80" />
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-green-500" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-green-500" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-green-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-green-500" />

            <div className="px-6 py-4 border-b border-green-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-400" />
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-green-400">Ruxsat Muddatini Belgilang</span>
              </div>
              <button onClick={() => setApproveModal(null)} className="text-[var(--text-secondary)] hover:text-red-400"><X size={16} /></button>
            </div>

            <div className="p-6">
              <p className="text-sm font-mono text-white mb-1">{approveModal.request.requester_name}</p>
              <p className="text-xs font-mono text-[var(--text-secondary)] mb-5">Quyida ruxsat muddatini tanlang:</p>

              {/* Duration Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3, 5, 7, 10].map(d => (
                  <button
                    key={d}
                    onClick={() => setApproveDays(d)}
                    className={`py-2 text-xs font-mono font-bold tracking-wider border transition-all ${approveDays === d ? 'bg-green-500 text-black border-green-500' : 'bg-black/40 border-[var(--text-secondary)]/40 text-[var(--text-secondary)] hover:border-green-500/50 hover:text-green-400'}`}
                  >
                    {d} KUN
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setApproveDays('forever')}
                  className={`py-2.5 text-xs font-mono font-bold tracking-wider border transition-all ${approveDays === 'forever' ? 'bg-green-500 text-black border-green-500' : 'bg-black/40 border-[var(--text-secondary)]/40 text-[var(--text-secondary)] hover:border-green-500/50 hover:text-green-400'}`}
                >
                  ∞ ABADIY
                </button>
                <button
                  onClick={() => setApproveDays('custom')}
                  className={`py-2.5 text-xs font-mono font-bold tracking-wider border transition-all ${approveDays === 'custom' ? 'bg-green-500 text-black border-green-500' : 'bg-black/40 border-[var(--text-secondary)]/40 text-[var(--text-secondary)] hover:border-green-500/50 hover:text-green-400'}`}
                >
                  ✏ CUSTOM
                </button>
              </div>

              {approveDays === 'custom' && (
                <div className="mb-4">
                  <label className="text-[10px] font-mono text-green-400 uppercase tracking-widest block mb-1.5">&gt; Kun soni kiriting:</label>
                  <input
                    type="number"
                    min={1} max={365}
                    value={customDays}
                    onChange={e => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-black/40 border border-green-500/40 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-green-500 transition-all"
                  />
                </div>
              )}

              <div className="text-[10px] font-mono text-[var(--text-secondary)] mb-5 border-l-2 border-green-500/30 pl-3">
                {approveDays === 'forever' ? 'Ruxsat muddatsiz, bekor qilguningizcha amal qiladi.'
                  : approveDays === 'custom' ? `Ruxsat ${customDays} kundan so'ng avtomatik tugaydi.`
                  : `Ruxsat ${approveDays} kundan so'ng avtomatik tugaydi.`}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setApproveModal(null)} className="py-2.5 border border-[var(--text-secondary)]/40 text-[var(--text-secondary)] text-xs font-mono tracking-widest uppercase hover:bg-white/5 transition-all">
                  BEKOR
                </button>
                <button
                  onClick={() => approveRequest(approveModal.request, approveDays, customDays)}
                  disabled={approving}
                  className="py-2.5 bg-green-500 text-black font-bold text-xs font-mono tracking-widest uppercase hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(0,255,0,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {approving ? <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> SAQLANMOQDA</> : <><CheckCircle size={13} /> RUXSAT BERISH</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirmId && createPortal(
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
                Warning: The track <span className="text-white font-bold">"{list.find(m => m.id === deleteConfirmId)?.title || "Unknown Track"}"</span> and all associated files will be <span className="text-red-500 underline decoration-red-500/30">permanently purged</span> from the mainframe.
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
        </div>,
        document.body
      )}

      {/* Lyrics Modal */}
      {lyricsModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-main)] border border-[var(--accent)] w-full max-w-2xl p-6 shadow-[0_0_50px_rgba(var(--accent-rgb),0.2)] flex flex-col h-[80vh]">
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
                APPLY (REMEMBER TO SAVE TRACK)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
    </div>
  );
}
