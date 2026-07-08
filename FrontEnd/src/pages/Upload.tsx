import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFetchSongs } from "../hooks/useFetchSongs";
import { ArrowLeft, Music, Image as ImageIcon, AlertCircle, LogOut, Sparkles, Link2, Loader2, X } from "lucide-react";
import { uploadSong } from "../services/musicApi";
import { useAuth } from "../contexts/AuthContext";
import { useUploadPermission } from "../hooks/useUploadPermission";
import { parseBlob } from "music-metadata";
import { toast } from "sonner";

// ─── oEmbed helpers ───────────────────────────────────────────────────────────


function isSpotifyUrl(url: string) {
  return url.includes("spotify.com/track/");
}

function isSoundCloudUrl(url: string) {
  return url.includes("soundcloud.com/");
}

async function fetchSpotifyOembed(url: string) {
  const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("Spotify oEmbed failed");
  // author_name contains the artist name(s) in Spotify oEmbed
  return res.json() as Promise<{ title: string; thumbnail_url: string; author_name?: string; provider_name: string }>;
}

async function fetchSoundCloudOembed(url: string) {
  const endpoint = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("SoundCloud oEmbed failed");
  return res.json() as Promise<{ title: string; thumbnail_url: string; author_name: string }>;
}

/** MusicBrainz API — janr uchun. Bepul, API kalit shart emas. */
async function fetchGenreFromMusicBrainz(title: string, artist: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const url = `https://musicbrainz.org/ws/2/recording?query=${query}&limit=1&fmt=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'FrontoPlayer/1.0 (https://github.com/qayumjon-coder)' } });
    if (!res.ok) return null;
    const data = await res.json();
    const recording = data?.recordings?.[0];
    // Try tags on recording, then on releases
    const tags: { name: string; count: number }[] =
      recording?.tags ??
      recording?.releases?.[0]?.['release-group']?.tags ??
      [];
    if (tags.length > 0) {
      // Return the highest-count tag, capitalised
      const top = [...tags].sort((a, b) => b.count - a.count)[0];
      return top.name.charAt(0).toUpperCase() + top.name.slice(1);
    }
    return null;
  } catch {
    return null;
  }
}

/** Download a remote image URL and return it as a File (so it can be uploaded to Supabase) */
async function urlToFile(imageUrl: string, filename: string): Promise<File> {
  // Use a CORS proxy for cross-origin images
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("Image fetch failed");
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

// ─────────────────────────────────────────────────────────────────────────────

export function Upload() {
  const navigate = useNavigate();
  const { logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const { status: permStatus } = useUploadPermission();

  // Guard: redirect if no permission (once checking is done)
  useEffect(() => {
    if (authLoading || permStatus === 'checking') return;
    
    // If logged in as admin, always allow
    if (isAuthenticated) return;
    
    // Otherwise, check for granted fingerprint permission
    if (permStatus !== 'granted') {
      navigate('/', { replace: true });
    }
  }, [authLoading, isAuthenticated, permStatus, navigate]);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    category: "General",
    duration: 0,
    lyrics: "",
  });
  const { songs } = useFetchSongs();
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const catRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (isCatOpen && catRef.current && !catRef.current.contains(e.target as Node)) {
        setIsCatOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsCatOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isCatOpen]);

  const categories = ["General", ...Array.from(new Set(songs.map(s => s.category || "General")))];
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Import State ────────────────────────────────────────────────────────────
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImporting(true);
    setImportError(null);

    try {
      let title = "";
      let artist = "";
      let thumbnailUrl = "";

      if (isSpotifyUrl(url)) {
        const data = await fetchSpotifyOembed(url);
        // author_name from Spotify oEmbed is the artist (e.g. "The Weeknd")
        artist = data.author_name?.trim() || "";
        // Remove trailing " - Single", " - EP", " - Album" from title
        title = data.title.replace(/\s*[-–]\s*(Single|EP|Album|Deluxe.*|Remaster.*)$/i, "").trim();
        thumbnailUrl = data.thumbnail_url;

      } else if (isSoundCloudUrl(url)) {
        const data = await fetchSoundCloudOembed(url);
        // author_name is always the correct artist on SoundCloud
        artist = data.author_name.trim();
        // If title contains "Artist - Track", strip the duplicate artist prefix
        const parts = data.title.split(" - ");
        if (parts.length >= 2 && parts[0].trim().toLowerCase() === artist.toLowerCase()) {
          title = parts.slice(1).join(" - ").trim();
        } else {
          title = data.title.trim();
        }
        thumbnailUrl = data.thumbnail_url;

      } else {
        throw new Error("Iltimos, Spotify yoki SoundCloud havolasini kiriting.");
      }

      // Fetch thumbnail and convert to File
      let fetchedCoverFile: File | null = null;
      try {
        fetchedCoverFile = await urlToFile(thumbnailUrl, "imported_cover.jpg");
        setCoverFile(fetchedCoverFile);
        setPreviewUrl(URL.createObjectURL(fetchedCoverFile));
      } catch {
        setPreviewUrl(thumbnailUrl);
      }

      // Genre lookup via MusicBrainz (runs in parallel, non-blocking)
      let genre: string | null = null;
      if (title && artist) {
        genre = await fetchGenreFromMusicBrainz(title, artist);
      }

      setFormData(prev => ({
        ...prev,
        title: title || prev.title,
        artist: artist || prev.artist,
        category: genre || prev.category,
      }));

      const genreMsg = genre ? ` Janr: ${genre}.` : "";
      setImportUrl("");
      toast.success(`✨ Ma'lumotlar import qilindi!${genreMsg}`);

    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import muvaffaqiyatsiz bo'ldi.");
    } finally {
      setImporting(false);
    }
  };

  // ── File handlers ───────────────────────────────────────────────────────────
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, type: "audio" | "cover") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeMB = file.size / (1024 * 1024);

      if (type === "audio") {
        if (fileSizeMB > 20) {
          toast.error(`Audio file is too big! (${fileSizeMB.toFixed(2)} MB). Max limit is 20MB.`);
          return;
        }
        setAudioFile(file);
        
        toast.info("✨ AI is analyzing song details...", { id: 'ai-analyze' });
        
        try {
          const metadataPromise = parseBlob(file);
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Analysis timed out")), 3000)
          );

          const metadata = await Promise.race([metadataPromise, timeoutPromise]);
          
          let { title, artist, genre } = metadata.common;
          const { duration } = metadata.format;
          const picture = metadata.common.picture?.[0];

          if (!title || !artist) {
            const filename = file.name.replace(/\.[^/.]+$/, "");
            const parts = filename.split(/-|–/).map(s => s.trim());
            
            if (parts.length >= 2) {
              if (!artist) artist = parts[0];
              if (!title) title = parts.slice(1).join(" ");
            } else {
              if (!title) title = filename;
            }
          }

          if (picture) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blob = new Blob([picture.data as any], { type: picture.format });
            const extractedFile = new File([blob], `extracted_cover.${picture.format.split('/')[1] || 'jpg'}`, { type: picture.format });
            
            setCoverFile(extractedFile);
            setPreviewUrl(URL.createObjectURL(blob));
          }

          setFormData(prev => ({
            ...prev,
            title: title || prev.title,
            artist: artist || prev.artist,
            category: (genre && genre[0]) ? genre[0] : prev.category,
            duration: duration || prev.duration
          }));

          toast.success("✨ AI successfully auto-filled details!", { id: 'ai-analyze' });

        } catch (error) {
          console.error("Metadata parsing failed:", error);
          
          let fallbackTitle = "";
          let fallbackArtist = "";
          
          const filename = file.name.replace(/\.[^/.]+$/, ""); 
          const parts = filename.split(/-|–/).map(s => s.trim());
          if (parts.length >= 2) {
            fallbackArtist = parts[0];
            fallbackTitle = parts.slice(1).join(" ");
          } else {
             fallbackTitle = filename;
          }

          const audio = new Audio(URL.createObjectURL(file));
          await new Promise<void>((resolve) => {
              audio.onloadedmetadata = () => {
                setFormData(prev => ({ 
                  ...prev, 
                  duration: audio.duration,
                  title: prev.title || fallbackTitle,
                  artist: prev.artist || fallbackArtist
                }));
                resolve();
              };
              audio.onerror = () => {
                 setFormData(prev => ({ 
                  ...prev, 
                  title: prev.title || fallbackTitle,
                  artist: prev.artist || fallbackArtist
                }));
                resolve();
              };
          });
          
          toast.error(`AI Analysis Skipped: ${error instanceof Error ? error.message : "Unavailable"}. Using filename.`, { id: 'ai-analyze' });
        }

      } else {
        if (fileSizeMB > 5) {
          toast.error(`Cover image is too big! (${fileSizeMB.toFixed(2)} MB). Max limit is 5MB.`);
          return;
        }
        setCoverFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!audioFile || !coverFile || !formData.title || !formData.artist) {
      toast.error("All fields are required!");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 300);

    let finalDuration = formData.duration;
    if (!finalDuration && audioFile) {
        finalDuration = await new Promise((resolve) => {
            const audio = new Audio(URL.createObjectURL(audioFile));
            audio.onloadedmetadata = () => resolve(audio.duration);
            audio.onerror = () => resolve(0);
        });
    }

    try {
      await uploadSong(
        formData.title,
        formData.artist,
        formData.category,
        finalDuration,
        audioFile,
        coverFile,
        formData.lyrics
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success("Track uploaded successfully!");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : "Failed to upload song.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-12 relative z-10 flex flex-col gap-8 text-[var(--text-primary)] font-mono">
      {/* Header */}
      <div className="relative border border-[var(--text-secondary)] bg-black/60 backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wider uppercase">
                Upload Zone
              </h1>
              <p className="text-xs text-[var(--text-secondary)] tracking-widest mt-1">
                ADMIN UPLOAD SYSTEM
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated && (
              <>
                <Link 
                  to="/admin" 
                  className="group relative flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold
                           border border-[var(--accent)] text-[var(--accent)]
                           hover:bg-[var(--accent)] hover:text-black
                           transition-all duration-300
                           shadow-[0_0_10px_rgba(var(--accent-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.6)]
                           overflow-hidden"
                >
                  <span className="relative z-10">Manage DB</span>
                  <div className="absolute inset-0 bg-[var(--accent)] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="group relative flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold
                           border border-red-500 text-red-500
                           hover:bg-red-500 hover:text-white
                           transition-all duration-300
                           shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]
                           overflow-hidden"
                >
                  <LogOut size={14} className="relative z-10" />
                  <span className="relative z-10">Exit</span>
                  <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                </button>
              </>
            )}

            <Link 
              to="/" 
              className="group flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold
                       border border-[var(--text-secondary)] text-[var(--text-secondary)] bg-black/50
                       hover:border-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-secondary)]/10
                       transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
              <span>Back to Player</span>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30"></div>
      </div>

      {/* ── Quick Import Panel ─────────────────────────────────────────────── */}
      <div className="border border-[var(--text-secondary)] bg-black/40 backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={16} className="text-[var(--accent)]" />
          <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Quick Import — Spotify / SoundCloud
          </span>
        </div>

        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
          Qo'shiq havolasini kiriting → nom, artist va muqova avtomatik to'ldiriladi. So'ng faqat audio faylni yuklang.
        </p>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="url"
              value={importUrl}
              onChange={e => { setImportUrl(e.target.value); setImportError(null); }}
              onKeyDown={e => e.key === 'Enter' && handleImport()}
              placeholder="https://open.spotify.com/track/... yoki https://soundcloud.com/..."
              className="w-full bg-black/50 border border-[var(--text-secondary)] p-3 pr-8 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all text-sm placeholder:text-[var(--text-secondary)]/40"
            />
            {importUrl && (
              <button
                type="button"
                onClick={() => { setImportUrl(""); setImportError(null); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className="px-5 py-3 text-xs uppercase tracking-widest font-bold border transition-all duration-300
                       border-[var(--accent)] text-[var(--accent)]
                       hover:bg-[var(--accent)] hover:text-black
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-[0_0_8px_rgba(var(--accent-rgb),0.1)] hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]
                       flex items-center gap-2 whitespace-nowrap"
          >
            {importing ? (
              <><Loader2 size={14} className="animate-spin" /> Importing...</>
            ) : (
              <><Sparkles size={14} /> Import</>
            )}
          </button>
        </div>

        {importError && (
          <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-900/10 px-3 py-2">
            <AlertCircle size={14} />
            <span>{importError}</span>
          </div>
        )}

        {/* Platform hints */}
        <div className="flex gap-4 text-[9px] text-[var(--text-secondary)]/50 uppercase tracking-widest">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            Spotify
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
            SoundCloud
          </span>
        </div>
      </div>

      {/* ── Upload Form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/40 p-8 border border-[var(--text-secondary)] shadow-[0_0_30px_rgba(var(--accent-rgb),0.05)] backdrop-blur-sm">
        
        {/* Left Column: Text Inputs */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest">Track Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-black/50 border border-[var(--text-secondary)] p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all text-lg"
              placeholder="Enter song title..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest">Artist Name</label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="w-full bg-black/50 border border-[var(--text-secondary)] p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all text-lg"
              placeholder="Enter artist name..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest">Category</label>
            <div className="relative" ref={catRef}>
              <button
                type="button"
                onClick={() => setIsCatOpen(v => !v)}
                aria-expanded={isCatOpen}
                className="w-full text-left bg-black/50 border border-[var(--text-secondary)] p-3 flex items-center justify-between"
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="text-[var(--text-primary)]">{formData.category || 'General'}</span>
                <span className="text-[var(--text-secondary)]">▾</span>
              </button>
              {isCatOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-[var(--bg-main)] border border-[var(--text-secondary)] z-40 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { 
                        setFormData(prev => ({ ...prev, category: cat })); 
                        setShowNewCatInput(false);
                        setIsCatOpen(false); 
                      }}
                      className={`w-full text-left px-3 py-2 text-sm font-mono transition-colors ${formData.category === cat && !showNewCatInput ? 'bg-[var(--accent)] text-[var(--bg-main)]' : 'text-[var(--text-primary)] hover:bg-[var(--text-secondary)]/5'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { 
                      setShowNewCatInput(true);
                      setFormData(prev => ({ ...prev, category: "" }));
                      setIsCatOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm font-mono transition-colors border-t border-[var(--text-secondary)]/30 ${showNewCatInput ? 'bg-[var(--accent)] text-[var(--bg-main)]' : 'text-[var(--accent)] hover:bg-[var(--accent)]/10'}`}
                  >
                    + ADD NEW...
                  </button>
                </div>
              )}
            </div>

            {showNewCatInput && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  autoFocus
                  value={newCat}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCat(val);
                    setFormData(prev => ({ ...prev, category: val }));
                  }}
                  className="w-full bg-black/50 border border-[var(--accent)] p-3 focus:outline-none focus:shadow-[0_0_10px_var(--accent)] transition-all text-sm font-mono"
                  placeholder="ENTER NEW CATEGORY NAME..."
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest">Lyrics (Optional)</label>
            <textarea
              value={formData.lyrics}
              onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              className="w-full h-32 bg-black/50 border border-[var(--text-secondary)] p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all text-sm font-mono resize-none custom-scrollbar"
              placeholder="Paste the song lyrics here..."
            />
          </div>

          <div className="pt-4">
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative overflow-hidden mt-4 py-4 font-bold text-xl uppercase tracking-widest border transition-all duration-300
                ${loading 
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-black cursor-not-allowed' 
                  : 'border-[var(--accent)] text-[var(--bg-main)] bg-[var(--accent)] hover:bg-transparent hover:text-[var(--accent)] hover:shadow-[0_0_20px_var(--accent)]'
                }
              `}
            >
              {loading && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-[var(--accent)]/30 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    UPLOADING {Math.round(uploadProgress)}%
                  </>
                ) : "UPLOAD TRACK"}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: File Uploads */}
        <div className="space-y-6">
          
          {/* Audio Upload */}
          <div className="relative group">
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-2">Audio File</label>
            <div className={`relative h-24 border-2 border-dashed border-[var(--text-secondary)] flex flex-col items-center justify-center cursor-pointer transition-colors group-hover:border-[var(--accent)] ${audioFile ? 'bg-[var(--text-secondary)]/10' : ''}`}>
              <input 
                type="file" 
                accept="audio/*" 
                onChange={(e) => handleFileChange(e, 'audio')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Music className={`mb-2 ${audioFile ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
              <span className="text-xs text-[var(--text-secondary)] truncate max-w-[80%]">
                {audioFile ? audioFile.name : "DRAG & DROP OR CLICK TO UPLOAD MP3"}
              </span>
            </div>
          </div>

          {/* Cover Upload */}
          <div className="relative group">
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-2">
              Cover Art
              {previewUrl && !coverFile && (
                <span className="ml-2 text-[var(--accent)] normal-case text-[9px]">(import'dan olindi — qo'lda almashtirish mumkin)</span>
              )}
            </label>
            <div className={`relative h-64 border-2 border-dashed border-[var(--text-secondary)] flex flex-col items-center justify-center cursor-pointer transition-colors group-hover:border-[var(--accent)] overflow-hidden ${coverFile || previewUrl ? 'border-solid' : ''}`}>
               <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, 'cover')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              {previewUrl ? (
                <img src={previewUrl} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover z-10" />
              ) : (
                <>
                  <ImageIcon className="mb-2 text-[var(--text-secondary)]" />
                  <span className="text-xs text-[var(--text-secondary)]">UPLOAD COVER IMAGE (JPG/PNG)</span>
                </>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
