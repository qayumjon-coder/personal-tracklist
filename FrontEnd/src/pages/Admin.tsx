import { useEffect, useState, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { getMusicList, updateSong, deleteSong } from "../services/musicApi";
import { ArrowLeft, Search, Save, X, Edit2, Play, Pause, Music as MusicIcon, Upload, Image as ImageIcon, Trash2, AlertTriangle, BarChart2, Maximize2, PlayCircle, Users, Clock, FileText, TrendingUp, CheckCircle, ShieldOff, ShieldCheck, Calendar, Inbox, Database } from "lucide-react";
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
  uploaded_by?: string;
  uploader_fp?: string;
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
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Cover Update State
  // Global Search Modal State (Ctrl+K Command Palette)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchModalQuery, setSearchModalQuery] = useState("");
  const searchModalInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      } else if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (isSearchModalOpen) {
      const timer = setTimeout(() => searchModalInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setSearchModalQuery("");
    }
  }, [isSearchModalOpen]);

  const searchModalResults = useMemo(() => {
    if (!searchModalQuery.trim()) return [];
    const q = searchModalQuery.trim().toLowerCase();
    return list.filter(m =>
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.artist && m.artist.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [searchModalQuery, list]);

  const handleSelectFromSearchModal = (song: Music) => {
    setQuery(song.title);
    setIsSearchModalOpen(false);
    setTimeout(() => {
      const el = document.getElementById("admin-database-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);

  // Bulk Edit State
  const [selectedAdminIds, setSelectedAdminIds] = useState<Set<number>>(new Set());
  const [bulkCategoryInput, setBulkCategoryInput] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const toggleSelectAdmin = (id: number) => {
    const next = new Set(selectedAdminIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAdminIds(next);
  };

  const toggleSelectAllAdmin = (songs: Music[]) => {
    const pageIds = songs.map(s => s.id);
    const allSelected = pageIds.every(id => selectedAdminIds.has(id));
    const next = new Set(selectedAdminIds);
    if (allSelected) {
      pageIds.forEach(id => next.delete(id));
    } else {
      pageIds.forEach(id => next.add(id));
    }
    setSelectedAdminIds(next);
  };

  const handleBulkCategoryApply = async () => {
    if (selectedAdminIds.size === 0 || !bulkCategoryInput.trim()) return;
    setBulkSaving(true);
    try {
      const category = bulkCategoryInput.trim();
      const promises = Array.from(selectedAdminIds).map(id => updateSong(id, { category }));
      await Promise.all(promises);
      toast.success(`${selectedAdminIds.size} ta trek janri "${category}" ga o'zgartirildi!`);
      setList(prev => prev.map(m => selectedAdminIds.has(m.id) ? { ...m, category } : m));
      setSelectedAdminIds(new Set());
      setBulkCategoryInput("");
    } catch {
      toast.error("Janrni o'zgartirishda xatolik");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkDeleteAdmin = async () => {
    if (selectedAdminIds.size === 0) return;
    if (!window.confirm(`${selectedAdminIds.size} ta trekni o'chirishni tasdiqlaysizmi?`)) return;
    setBulkSaving(true);
    try {
      const promises = Array.from(selectedAdminIds).map(id => deleteSong(id));
      await Promise.all(promises);
      toast.success(`${selectedAdminIds.size} ta trek o'chirildi!`);
      setList(prev => prev.filter(m => !selectedAdminIds.has(m.id)));
      setSelectedAdminIds(new Set());
    } catch {
      toast.error("O'chirishda xatolik");
    } finally {
      setBulkSaving(false);
    }
  };

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

  async function extendPermission(id: string, currentExpiresAt: string | null, days: number) {
    try {
      const baseDate = currentExpiresAt ? new Date(currentExpiresAt) : new Date();
      const now = new Date();
      const start = baseDate > now ? baseDate : now;
      start.setDate(start.getDate() + days);

      await supabase.from('upload_permissions').update({
        expires_at: start.toISOString(),
        is_active: true
      }).eq('id', id);

      toast.success(`Ruxsat +${days} kunga uzaytirildi!`);
      loadUploadRequests();
    } catch (err) {
      toast.error('Uzaytirishda xatolik');
    }
  }

  const exportCSV = () => {
    if (list.length === 0) return;
    const headers = ['ID', 'Title', 'Artist', 'Category', 'Play Count', 'Uploaded By', 'Created At'];
    const rows = list.map(m => [
      m.id,
      `"${(m.title || '').replace(/"/g, '""')}"`,
      `"${(m.artist || '').replace(/"/g, '""')}"`,
      `"${(m.category || '').replace(/"/g, '""')}"`,
      m.play_count || 0,
      `"${(m.uploaded_by || 'System').replace(/"/g, '""')}"`,
      m.created_at || ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `music_library_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('CSV yuklab olindi!');
  };

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
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];

    // Artists
    const uniqueArtists = new Set(list.map(m => m.artist)).size;

    // Plays
    const totalPlays = list.reduce((acc, m) => acc + (m.play_count || 0), 0);
    const mostPlayed = list.length ? list.reduce((prev, curr) => ((prev.play_count || 0) > (curr.play_count || 0)) ? prev : curr) : null;

    // Lyrics
    const withLyrics = list.filter(m => m.lyrics && m.lyrics.trim().length > 0).length;
    const lyricsProgress = (withLyrics / list.length) * 100;

    // Uploaders
    const uploaders: Record<string, number> = {};
    list.forEach(m => {
      const u = m.uploaded_by || 'Admin';
      uploaders[u] = (uploaders[u] || 0) + 1;
    });
    const topUploader = Object.entries(uploaders).sort((a, b) => b[1] - a[1])[0];

    // Today's Uploads
    const now = new Date();
    const todaysUploads = list.filter(m => {
      if (!m.created_at) return false;
      const createdAt = new Date(m.created_at);
      return (now.getTime() - createdAt.getTime()) < 24 * 60 * 60 * 1000;
    }).length;

    // Storage Size Estimate (assuming ~5MB per audio+cover pair on average)
    const storageEstimateMB = list.length * 5;

    return {
      shortest, longest, topCat, totalDuration, avgDuration,
      uniqueArtists, totalPlays, mostPlayed, lyricsProgress,
      topUploader, todaysUploads, storageEstimateMB
    };
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

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    list.forEach(m => {
      const c = m.category || "General";
      map[c] = (map[c] || 0) + 1;
    });
    return map;
  }, [list]);

  const allCategories = useMemo(() => {
    const cats = Array.from(new Set(list.map(s => s.category || "General"))).sort();
    return ["All", ...cats];
  }, [list]);

  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let res = list;
    if (filterCategory !== "All") {
      res = res.filter(m => (m.category || "General").toLowerCase() === filterCategory.toLowerCase());
    }
    if (q) {
      res = res.filter(m => (
        (m.title || "").toLowerCase().includes(q) ||
        (m.artist || "").toLowerCase().includes(q) ||
        (m.category || "").toLowerCase().includes(q)
      ));
    }
    setFiltered(res);
    setCurrentPage(1);
  }, [debouncedQuery, filterCategory, list]);

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
      <Helmet>
        <title>Admin Panel | Fronto</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b pb-6"
        style={{ borderImage: 'linear-gradient(90deg, transparent, var(--accent), transparent) 1' }}
      >
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-wider flex items-center gap-3">
              <MusicIcon className="w-8 h-8 text-[var(--accent)] drop-shadow-[0_0_12px_rgba(var(--accent-rgb),0.5)]" />
              EDITOR // <span className="text-[var(--text-secondary)]">MANAGE</span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
              <span>SYSTEM ONLINE // SUPABASE CONNECTED</span>
            </div>
          </div>
          <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest">Library Management Database</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Global Search Pill (Ctrl+K Command Palette) */}
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 cyber-panel border border-white/20 hover:border-[var(--accent)] text-white/70 hover:text-white transition-all text-xs font-mono group cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.2)]"
            title="Tezkor qidiruv (Ctrl+K)"
          >
            <Search size={14} className="text-[var(--accent)] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline text-white/60 group-hover:text-white font-medium">Qidiruv...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-black/70 border border-white/20 text-[var(--accent)] font-bold rounded">
              Ctrl+K
            </kbd>
          </button>

          <Link
            to="/upload"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--text-secondary)]/10 border border-[var(--text-secondary)]/40 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all text-sm uppercase tracking-wider"
          >
            <Upload size={16} />
            New Upload
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 border border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5 hover:bg-[var(--accent)] hover:text-black font-bold transition-all text-sm uppercase tracking-wider shadow-[0_0_10px_rgba(var(--accent-rgb),0.1)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)]"
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
                      <div className="text-[9px] text-[var(--text-secondary)]/50 font-mono mt-1 pl-4">FP: {req.fingerprint.slice(0, 16)}...</div>
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
                        <div className="text-[9px] text-[var(--text-secondary)]/50 font-mono pl-5">FP: {perm.fingerprint.slice(0, 16)}...</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => extendPermission(perm.id, perm.expires_at, 7)}
                          className="px-2.5 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/40 text-[var(--accent)] text-[10px] font-mono uppercase tracking-wider hover:bg-[var(--accent)]/20 transition-all"
                          title="7 kunga uzaytirish"
                        >
                          +7d
                        </button>
                        <button
                          onClick={() => extendPermission(perm.id, perm.expires_at, 30)}
                          className="px-2.5 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/40 text-[var(--accent)] text-[10px] font-mono uppercase tracking-wider hover:bg-[var(--accent)]/20 transition-all"
                          title="30 kunga uzaytirish"
                        >
                          +30d
                        </button>
                        <button
                          onClick={() => revokePermission(perm.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/40 text-red-400 text-[10px] font-mono uppercase tracking-wider hover:bg-red-500/20 transition-all"
                        >
                          <X size={12} /> Bekor Qilish
                        </button>
                      </div>
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

            {/* Stats Grid - Color-coded Cards with Top Accent Line */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {/* Total Tracks */}
              <div className="relative cyber-panel relative border border-[var(--accent)]/60 hover:border-[var(--accent)] p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-[var(--accent)] text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <MusicIcon size={12} /> Total Tracks
                </div>
                <div className="text-2xl font-black text-white group-hover:text-[var(--accent)] transition-colors">{list.length}</div>
              </div>

              {/* Total Plays */}
              <div className="relative cyber-panel relative border border-purple-500/50 hover:border-purple-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-purple-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <PlayCircle size={12} /> Total Plays
                </div>
                <div className="text-2xl font-black text-white group-hover:text-purple-300 transition-colors">
                  {stats?.totalPlays.toLocaleString() || 0}
                </div>
              </div>

              {/* Artists */}
              <div className="relative cyber-panel relative border border-blue-500/50 hover:border-blue-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-blue-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <Users size={12} /> Unique Artists
                </div>
                <div className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors">
                  {stats?.uniqueArtists || 0}
                </div>
              </div>

              {/* Top Genre */}
              <div className="relative cyber-panel relative border border-yellow-500/50 hover:border-yellow-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-yellow-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <BarChart2 size={12} /> Top Genre
                </div>
                <div className="text-lg font-black text-white truncate group-hover:text-yellow-300 transition-colors" title={stats?.topCat?.[0] || 'N/A'}>
                  {stats?.topCat ? stats.topCat[0] : 'N/A'}
                  <span className="text-xs text-yellow-500/80 ml-1.5 font-normal">({stats?.topCat?.[1] || 0})</span>
                </div>
              </div>

              {/* Most Played */}
              <div className="relative cyber-panel relative border border-orange-500/50 hover:border-orange-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-orange-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <TrendingUp size={12} /> Most Played
                </div>
                <div className="text-sm font-bold truncate text-white group-hover:text-orange-300 transition-colors" title={stats?.mostPlayed?.title || 'N/A'}>
                  {stats?.mostPlayed?.title || 'N/A'}
                </div>
                <div className="text-[10px] text-orange-400/80 mt-1 font-mono">
                  {stats?.mostPlayed?.play_count || 0} views
                </div>
              </div>

              {/* Total Duration */}
              <div className="relative cyber-panel relative border border-cyan-500/50 hover:border-cyan-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-cyan-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <Clock size={12} /> Total Time
                </div>
                <div className="text-sm font-bold truncate text-white group-hover:text-cyan-300 transition-colors">
                  {Math.floor((stats?.totalDuration || 0) / 3600)}h {Math.floor(((stats?.totalDuration || 0) % 3600) / 60)}m
                </div>
                <div className="text-[10px] text-cyan-400/80 mt-1 font-mono">
                  Avg: {formatDuration(stats?.avgDuration)}
                </div>
              </div>

              {/* Lyrics Coverage */}
              <div className="relative cyber-panel relative border border-emerald-500/50 hover:border-emerald-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <FileText size={12} /> Lyrics Progress
                </div>
                <div className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                  {Math.round(stats?.lyricsProgress || 0)}%
                </div>
                <div className="w-full h-1.5 bg-black/60 border border-emerald-500/20 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_8px_#10b981] transition-all duration-1000"
                    style={{ width: `${stats?.lyricsProgress || 0}%` }}
                  />
                </div>
              </div>

              {/* Longest */}
              <div className="relative cyber-panel relative border border-violet-500/50 hover:border-violet-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-violet-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <Maximize2 size={12} /> Longest Track
                </div>
                <div className="text-sm font-bold truncate text-white group-hover:text-violet-300 transition-colors" title={stats?.longest?.title || 'N/A'}>
                  {stats?.longest?.title || 'N/A'}
                </div>
                <div className="text-[10px] text-violet-400/80 mt-1 font-mono">
                  {formatDuration(stats?.longest?.duration)}
                </div>
              </div>

              {/* Top Uploader */}
              <div className="relative cyber-panel relative border border-pink-500/50 hover:border-pink-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-pink-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <Users size={12} /> Top Uploader
                </div>
                <div className="text-sm font-bold truncate text-white group-hover:text-pink-300 transition-colors">
                  {stats?.topUploader?.[0] || 'Admin'}
                </div>
                <div className="text-[10px] text-pink-400/80 mt-1 font-mono">
                  {stats?.topUploader?.[1] || 0} tracks
                </div>
              </div>

              {/* Today's Uploads */}
              <div className="relative cyber-panel relative border border-teal-500/50 hover:border-teal-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(20,184,166,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-teal-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <Calendar size={12} /> Uploaded Today
                </div>
                <div className="text-2xl font-black text-white group-hover:text-teal-300 transition-colors">
                  {stats?.todaysUploads || 0}
                </div>
              </div>

              {/* Storage Size Estimate */}
              <div className="relative cyber-panel relative border border-indigo-500/50 hover:border-indigo-400 p-4 backdrop-blur-sm group transition-all overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-2 text-indigo-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
                  <Database size={12} /> Est. Storage
                </div>
                <div className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors">
                  {stats?.storageEstimateMB || 0} MB
                </div>
              </div>
            </div>

            {/* Play Count Trend Chart Card */}
            <div className="cyber-panel p-6 mt-6 shadow-[0_6px_25px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--text-secondary)]/20 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] font-bold uppercase tracking-widest">
                  <TrendingUp size={16} /> Play Count Trend & Top Tracks
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">REAL-TIME DB METRICS</div>
              </div>
              <div className="space-y-3 font-mono">
                {list
                  .slice()
                  .sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
                  .slice(0, 5)
                  .map((song, idx) => {
                    const maxPlays = Math.max(1, ...list.map(s => s.play_count || 0));
                    const pct = Math.round(((song.play_count || 0) / maxPlays) * 100);
                    return (
                      <div key={song.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-white truncate max-w-[280px] sm:max-w-md">
                            #{idx + 1} {song.title} <span className="text-[var(--text-secondary)]">({song.artist || 'Unknown'})</span>
                          </span>
                          <span className="text-[var(--accent)] font-bold shrink-0 ml-2">{song.play_count || 0} plays</span>
                        </div>
                        <div className="w-full h-2 bg-black/60 border border-[var(--text-secondary)]/20 overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--text-secondary)] via-[var(--accent)] to-[var(--accent)] transition-all duration-1000 shadow-[0_0_10px_var(--accent)]"
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {list.length === 0 && (
                  <div className="text-center py-6 text-xs text-[var(--text-secondary)] font-mono">NO TRACK METRICS AVAILABLE</div>
                )}
              </div>
            </div>
          </div>

          
          {/* Database Section: Header + Filter Toolbar directly above the table! */}
          <div id="admin-database-section" className="space-y-4 pt-6 border-t border-[var(--accent)]/30">
            {/* Section Header with Live Records Count & Quick Reset */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-sm font-bold tracking-widest uppercase text-white">
                  DATABASE RECORDS // <span className="text-[var(--text-secondary)]">TREKLAR JADVALI</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] font-bold">
                  {filtered.length} / {list.length} TA
                </span>
              </div>

              {(query || filterCategory !== "All") && (
                <button
                  onClick={() => { setQuery(""); setFilterCategory("All"); }}
                  className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <X size={12} /> Barcha filtrlarni tozalash
                </button>
              )}
            </div>

            {/* Compact Search & Category Filter Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              {/* Search Database Box */}
              <div className="relative group flex-1">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" />
                </div>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="SEARCH DATABASE (TITLE, ARTIST, GENRE)..."
                  className="cyber-panel w-full pl-11 pr-9 py-3 text-xs focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_20px_rgba(var(--accent-rgb),0.25)] transition-all placeholder-white/40 text-white font-mono"
                />
                {query && (
                  <button 
                    onClick={() => setQuery("")}
                    className="absolute inset-y-0 right-3 flex items-center text-white/40 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Custom Cyberpunk Category Dropdown */}
              <div className="relative shrink-0" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className={`cyber-panel w-full md:w-64 py-3 px-3.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between gap-2 transition-all ${
                    filterCategory !== "All"
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[rgba(var(--accent-rgb),0.15)] shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)]'
                      : 'text-white/90 hover:border-[var(--accent)]/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 bg-[var(--accent)] shadow-[0_0_6px_var(--accent)] shrink-0" />
                    <span className="truncate">
                      {filterCategory === "All" ? "BARCHA JANRLAR" : filterCategory.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 ${
                      filterCategory !== "All" ? 'bg-[var(--accent)] text-black' : 'bg-white/15 text-white/70'
                    }`}>
                      {filterCategory === "All" ? list.length : (categoryCounts[filterCategory] || 0)}
                    </span>
                    <span className={`text-[10px] transition-transform duration-200 text-[var(--accent)] ${
                      isCategoryDropdownOpen ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </span>
                  </div>
                </button>

                {/* Custom Dropdown Popup Menu */}
                {isCategoryDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 z-50 bg-[#0a0d14]/95 border border-[var(--accent)]/50 backdrop-blur-xl shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(var(--accent-rgb),0.25)] p-2 font-mono animate-in fade-in zoom-in-95 duration-150">
                    {/* Inner Mini Search */}
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={e => setCategorySearch(e.target.value)}
                        placeholder="Janr nomini qidiring..."
                        className="w-full bg-black/60 border border-white/20 pl-8 pr-7 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--accent)] font-mono"
                        autoFocus
                      />
                      {categorySearch && (
                        <button
                          onClick={() => setCategorySearch("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Genres List */}
                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5">
                      {/* All Option */}
                      {(!categorySearch || "barcha janrlar".includes(categorySearch.toLowerCase()) || "all".includes(categorySearch.toLowerCase())) && (
                        <button
                          onClick={() => {
                            setFilterCategory("All");
                            setIsCategoryDropdownOpen(false);
                            setCategorySearch("");
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors ${
                            filterCategory === "All"
                              ? 'bg-[var(--accent)] text-black font-black'
                              : 'text-white/80 hover:bg-[var(--accent)]/15 hover:text-white'
                          }`}
                        >
                          <span className="font-bold">-- BARCHA JANRLAR --</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 ${
                            filterCategory === "All" ? 'bg-black/30 text-black' : 'bg-white/10 text-white/60'
                          }`}>
                            {list.length}
                          </span>
                        </button>
                      )}

                      {/* Filtered Genres List */}
                      {allCategories
                        .filter(c => c !== "All")
                        .filter(c => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
                        .sort((a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0))
                        .map(cat => {
                          const isSelected = filterCategory.toLowerCase() === cat.toLowerCase();
                          return (
                            <button
                              key={cat}
                              onClick={() => {
                                setFilterCategory(cat);
                                setIsCategoryDropdownOpen(false);
                                setCategorySearch("");
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors ${
                                isSelected
                                  ? 'bg-[var(--accent)] text-black font-black shadow-sm'
                                  : 'text-white/80 hover:bg-[var(--accent)]/15 hover:text-white'
                              }`}
                            >
                              <span className="truncate pr-2 uppercase font-medium">{cat}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 shrink-0 ${
                                isSelected ? 'bg-black/30 text-black' : 'bg-white/10 text-white/60'
                              }`}>
                                {categoryCounts[cat] || 0}
                              </span>
                            </button>
                          );
                        })}

                      {allCategories
                        .filter(c => c !== "All")
                        .filter(c => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                        <div className="py-4 text-center text-[11px] text-white/40">
                          Mos keluvchi janr topilmadi
                        </div>
                      )}
                    </div>

                    {/* Dropdown Footer */}
                    <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
                      <span>{allCategories.length - 1} ta jami janr</span>
                      {filterCategory !== "All" && (
                        <button
                          onClick={() => {
                            setFilterCategory("All");
                            setIsCategoryDropdownOpen(false);
                            setCategorySearch("");
                          }}
                          className="text-red-400 hover:text-red-300 font-bold"
                        >
                          Filtrni tozalash
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Export CSV Button */}
              <button
                onClick={exportCSV}
                className="cyber-panel px-4 py-3 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shrink-0 hover:shadow-[0_0_20px_var(--accent)]"
                title="Export full library as CSV file"
              >
                <Database size={14} /> Export CSV
              </button>
            </div>

            {/* Quick Filter Shortcut Bar (Top 4 Most Popular Genres + Active Tag) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[10px] text-white/40 uppercase tracking-widest mr-1 font-bold">TEZKOR:</span>
              <button
                onClick={() => setFilterCategory("All")}
                className={`px-2.5 py-1 text-[11px] font-mono border transition-all ${
                  filterCategory === "All"
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-black font-bold shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]'
                    : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30 hover:text-white'
                }`}
              >
                HAMMASI ({list.length})
              </button>

              {allCategories
                .filter(c => c !== "All")
                .sort((a, b) => (categoryCounts[b] || 0) - (categoryCounts[a] || 0))
                .slice(0, 4)
                .map(cat => {
                  const isSelected = filterCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(isSelected ? "All" : cat)}
                      className={`px-2.5 py-1 text-[11px] font-mono border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-black font-bold shadow-[0_0_10px_rgba(var(--accent-rgb),0.35)]'
                          : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[9px] ${isSelected ? 'text-black/80 font-bold' : 'text-white/40'}`}>
                        ({categoryCounts[cat] || 0})
                      </span>
                    </button>
                  );
                })}

              {filterCategory !== "All" && (
                <button
                  onClick={() => setFilterCategory("All")}
                  className="px-2.5 py-1 text-[10px] text-red-400 hover:text-red-300 ml-auto border border-red-500/40 hover:border-red-500 bg-red-500/10 flex items-center gap-1 transition-all uppercase tracking-wider font-bold"
                >
                  <X size={11} /> Filtrni Bekor Qilish
                </button>
              )}
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
              <div className="cyber-panel overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                {/* Bulk Action Bar */}
                {selectedAdminIds.size > 0 && (
                  <div className="p-3 bg-[var(--accent)]/10 border-b border-[var(--accent)]/40 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)] font-bold">
                      <span>{selectedAdminIds.size} TA TREK TANLANDI</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      <input
                        type="text"
                        value={bulkCategoryInput}
                        onChange={e => setBulkCategoryInput(e.target.value)}
                        placeholder="Yangi janr (masalan: Rock)..."
                        className="bg-black/60 border border-[var(--text-secondary)] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--accent)]"
                      />
                      <button
                        onClick={handleBulkCategoryApply}
                        disabled={bulkSaving || !bulkCategoryInput.trim()}
                        className="px-3 py-1.5 bg-[var(--accent)] text-black font-bold text-xs uppercase hover:opacity-90 disabled:opacity-40"
                      >
                        Janrni O'zgartirish
                      </button>
                      <button
                        onClick={handleBulkDeleteAdmin}
                        disabled={bulkSaving}
                        className="px-3 py-1.5 bg-red-500/20 border border-red-500 text-red-400 font-bold text-xs uppercase hover:bg-red-500 hover:text-black transition-all"
                      >
                        O'chirish ({selectedAdminIds.size})
                      </button>
                      <button
                        onClick={() => setSelectedAdminIds(new Set())}
                        className="px-2 py-1.5 text-[var(--text-secondary)] hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Table Header */}
                <div className="grid grid-cols-[auto_auto_2fr_1.5fr_1fr_1fr_0.5fr_1.5fr] gap-3 p-4 border-b border-[var(--accent)]/20 bg-[rgba(var(--accent-rgb),0.12)] backdrop-blur-md text-xs uppercase tracking-widest text-white font-black items-center shadow-sm">
                  <input
                    type="checkbox"
                    checked={paginatedList.length > 0 && paginatedList.every(m => selectedAdminIds.has(m.id))}
                    onChange={() => toggleSelectAllAdmin(paginatedList)}
                    className="cursor-pointer accent-[var(--accent)]"
                    title="Select/Deselect All on page"
                  />
                  <div className="w-12 text-center">Img</div>
                  <div>Title</div>
                  <div>Artist</div>
                  <div>Category</div>
                  <div>Uploader</div>
                  <div className="text-right">Time</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* List */}
                {/* Horizontal scroll hint for small screens */}
                <div className="block sm:hidden text-[9px] font-mono text-[var(--text-secondary)]/40 text-right px-4 py-1 border-b border-[var(--text-secondary)]/10">
                  ← Jadval uchun suring →
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <div className="min-w-[700px]">
                    <div className="max-h-[600px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                      {paginatedList.map((m, idx) => (
                        <div
                          key={m.id}
                          className={`grid grid-cols-[auto_auto_2fr_1.5fr_1fr_1fr_0.5fr_1.5fr] gap-3 p-4 border-b border-white/10 items-center transition-all ${
                            idx % 2 === 1 ? 'bg-white/[0.03]' : 'bg-[#0a0d14]/40'
                          } hover:bg-[var(--accent)]/5 hover:shadow-[inset_3px_0_0_var(--accent)] ${
                            editingId === m.id ? 'bg-[var(--accent)]/10 ring-1 ring-inset ring-[var(--accent)]' : selectedAdminIds.has(m.id) ? 'bg-[var(--accent)]/10' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAdminIds.has(m.id)}
                            onChange={() => toggleSelectAdmin(m.id)}
                            className="cursor-pointer accent-[var(--accent)]"
                          />
                          {/* Cover */}
                          <div className="w-12 h-12 border border-white/20 overflow-hidden bg-black relative group/cover">
                            <img
                              src={newCoverPreview || m.cover || m.coverUrl || '/placeholder.png'}
                              alt={`${m.title} cover`}
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

                          {/* Title with Mini Equalizer when previewing */}
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
                              <div className="flex items-center min-w-0">
                                <div className="font-bold text-white truncate" title={m.title}>{m.title}</div>
                                {previewId === m.id && (
                                  <div className="flex items-end gap-0.5 h-3 ml-2 shrink-0" title="Previewing...">
                                    <span className="w-0.5 bg-[var(--accent)] animate-[bounce_0.8s_ease-in-out_infinite] h-3" />
                                    <span className="w-0.5 bg-[var(--accent)] animate-[bounce_0.6s_ease-in-out_0.2s_infinite] h-2" />
                                    <span className="w-0.5 bg-[var(--accent)] animate-[bounce_0.9s_ease-in-out_0.4s_infinite] h-3" />
                                  </div>
                                )}
                              </div>
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
                              <div className="text-sm text-white/85 font-semibold truncate" title={m.artist}>{m.artist}</div>
                            )}
                          </div>

                          {/* Interactive Category Chip in Table */}
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
                              <button
                                onClick={() => setFilterCategory(prev => prev === (m.category || "General") ? "All" : (m.category || "General"))}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono border transition-all uppercase tracking-wider ${
                                  filterCategory.toLowerCase() === (m.category || "General").toLowerCase()
                                    ? 'bg-[var(--accent)] text-black border-[var(--accent)] font-bold shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]'
                                    : 'border border-[var(--accent)]/30 bg-[rgba(var(--accent-rgb),0.08)] backdrop-blur-sm text-white hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/20 font-bold shadow-sm'
                                }`}
                                title={`Filter by ${m.category || "General"}`}
                              >
                                {m.category || "General"}
                              </button>
                            )}
                          </div>

                          {/* Uploader */}
                          <div className="min-w-0 flex items-center gap-1.5">
                            <Users size={12} className="text-[var(--text-secondary)] shrink-0" />
                            <span className="text-xs text-[var(--text-secondary)] truncate" title={m.uploaded_by || 'Admin'}>
                              {m.uploaded_by || 'Admin'}
                            </span>
                          </div>

                          {/* Duration */}
                          <div className="text-right text-sm text-cyan-400 font-bold font-mono">
                            {formatDuration(m.duration)}
                          </div>

                          {/* Action Buttons */}
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
                                  className="p-2 border border-[var(--accent)]/30 text-white bg-[rgba(var(--accent-rgb),0.06)] backdrop-blur-sm hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-black hover:shadow-[0_0_12px_var(--accent)] transition-all"
                                  title="Edit Track"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(m.id)}
                                  className="p-2 border border-red-500/50 text-red-400 bg-red-500/10 hover:border-red-500 hover:bg-red-500 hover:text-black hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all"
                                  title="Delete Track"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button
                                  onClick={() => togglePreview(m)}
                                  disabled={!m.url}
                                  className={`p-2 border transition-all ${previewId === m.id
                                      ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/20 shadow-[0_0_12px_rgba(var(--accent-rgb),0.35)]"
                                      : "border border-[var(--accent)]/30 text-white bg-[rgba(var(--accent-rgb),0.06)] backdrop-blur-sm hover:border-[var(--accent)] hover:text-black hover:bg-[var(--accent)] hover:shadow-[0_0_12px_var(--accent)]"
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
                        <div className="p-16 flex flex-col items-center justify-center text-center gap-3 font-mono">
                          <div className="w-12 h-12 border border-white/15 bg-white/[0.02] flex items-center justify-center text-[var(--text-secondary)] mb-1">
                            <Search size={24} />
                          </div>
                          <div className="text-white font-bold text-sm tracking-wider">NO TRACKS FOUND IN DATABASE</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {filterCategory !== "All" ? `Kategoriya: "${filterCategory}" | ` : ''}Qidiruv: &quot;{query}&quot;
                          </div>
                          {(query || filterCategory !== "All") && (
                            <button
                              onClick={() => { setQuery(""); setFilterCategory("All"); }}
                              className="mt-2 px-4 py-1.5 border border-[var(--accent)] text-[var(--accent)] text-xs uppercase tracking-widest hover:bg-[var(--accent)] hover:text-black transition-all shadow-[0_0_10px_rgba(var(--accent-rgb),0.2)]"
                            >
                              Filtrlarni Tozalash
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>{/* /min-w */}
                </div>{/* /overflow-x-auto */}

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
              onChange={e => setEditForm({ ...editForm, lyrics: e.target.value })}
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

      {/* Global Search Modal (Command Palette Ctrl+K) */}
      {isSearchModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[110] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setIsSearchModalOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-[#0a0d14]/95 border-2 border-[var(--accent)] shadow-[0_0_50px_rgba(var(--accent-rgb),0.35)] flex flex-col max-h-[80vh] overflow-hidden font-mono">
            {/* Modal Header / Search Bar */}
            <div className="relative border-b border-[var(--accent)]/30 p-3.5 sm:p-4 bg-black/60 flex items-center gap-3">
              <Search className="w-5 h-5 text-[var(--accent)] shrink-0 animate-pulse" />
              <input
                ref={searchModalInputRef}
                type="text"
                value={searchModalQuery}
                onChange={e => setSearchModalQuery(e.target.value)}
                placeholder="Musiqa, ijrochi yoki janr qidiring (Ctrl+K)..."
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none font-mono font-medium tracking-wide"
                autoFocus
              />
              {searchModalQuery && (
                <button
                  onClick={() => setSearchModalQuery("")}
                  className="p-1 text-white/40 hover:text-white transition-colors"
                  title="Tozalash"
                >
                  <X size={16} />
                </button>
              )}
              <kbd 
                onClick={() => setIsSearchModalOpen(false)}
                className="px-2 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-white/70 border border-white/20 rounded cursor-pointer transition-colors shrink-0"
              >
                ESC
              </kbd>
            </div>

            {/* Results Info Bar */}
            <div className="px-4 py-2 bg-[rgba(var(--accent-rgb),0.06)] border-b border-white/5 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>
                {searchModalQuery.trim()
                  ? `${searchModalResults.length} ta mos keluvchi trek topildi`
                  : `Tavsiya etilgan eng sara treklar (${Math.min(5, list.length)} ta)`}
              </span>
              <span className="text-[10px] text-white/40 hidden sm:inline">Enter yoki bosing: Jadvalda ochish</span>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar max-h-[55vh]">
              {(searchModalQuery.trim() ? searchModalResults : list.slice().sort((a,b) => (b.play_count || 0) - (a.play_count || 0)).slice(0, 5)).map(song => (
                <div
                  key={song.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-white/[0.02] hover:bg-[var(--accent)]/15 border border-white/5 hover:border-[var(--accent)]/50 transition-all group"
                >
                  {/* Left: Cover + Title + Artist */}
                  <div 
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => handleSelectFromSearchModal(song)}
                  >
                    <img
                      src={song.cover || song.coverUrl || '/placeholder.png'}
                      alt=""
                      className="w-10 h-10 object-cover border border-white/10 shrink-0 group-hover:border-[var(--accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white group-hover:text-[var(--accent)] truncate">
                        {song.title}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate flex items-center gap-2 mt-0.5">
                        <span>{song.artist || 'Unknown'}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-white/70 border border-white/10 uppercase">
                          {song.category || 'General'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Plays + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--accent)] font-bold hidden sm:inline">
                      {song.play_count || 0} plays
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePreview(song)}
                      className={`p-2 border transition-all ${
                        previewId === song.id
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-black font-bold shadow-[0_0_10px_var(--accent)]'
                          : 'border-white/20 text-white/70 hover:border-[var(--accent)] hover:text-white'
                      }`}
                      title={previewId === song.id ? "To'xtatish" : "Tinglash"}
                    >
                      {previewId === song.id ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectFromSearchModal(song)}
                      className="px-2.5 py-1.5 bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black border border-[var(--accent)]/40 hover:border-[var(--accent)] text-xs font-bold transition-all uppercase tracking-wider"
                    >
                      Jadvalda
                    </button>
                  </div>
                </div>
              ))}

              {searchModalQuery.trim() && searchModalResults.length === 0 && (
                <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
                  <Search className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  &quot;{searchModalQuery}&quot; bo&apos;yicha hech qanday musiqa topilmadi
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-white/10 bg-black/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white/40">
              <div className="flex items-center gap-3">
                <span><kbd className="px-1 py-0.5 bg-white/10 text-white/70 rounded">Ctrl+K</kbd> Qidiruv</span>
                <span><kbd className="px-1 py-0.5 bg-white/10 text-white/70 rounded">ESC</kbd> Yopish</span>
              </div>
              <span className="text-[var(--accent)]/80">CYBER COMMAND PALETTE</span>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
