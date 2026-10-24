import { useState, useEffect, type ChangeEvent, type FormEvent, type ClipboardEvent } from "react";
import { Helmet } from "react-helmet-async";
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
      // Return the top 3 highest-count tags, capitalised
      const topTags = [...tags]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(t => t.name.charAt(0).toUpperCase() + t.name.slice(1));
      return topTags.join(", ");
    }
    return null;
  } catch {
    return null;
  }
}

/** Download a remote image URL and return it as a File (so it can be uploaded to Supabase) */
async function urlToFile(imageUrl: string, filename: string): Promise<File> {
  // 1. Direct fetch (fastest if CORS is enabled on source CDN)
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return new File([blob], filename, { type: blob.type || "image/jpeg" });
    }
  } catch {
    // Ignore
  }

  // 2. wsrv.nl image proxy (very fast and reliable)
  try {
    const res = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=jpg`);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return new File([blob], filename, { type: blob.type || "image/jpeg" });
    }
  } catch {
    // Ignore
  }

  // 3. corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return new File([blob], filename, { type: blob.type || "image/jpeg" });
    }
  } catch {
    // Ignore
  }

  // 4. allorigins.win
  try {
    const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(allOriginsUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) return new File([blob], filename, { type: blob.type || "image/jpeg" });
    }
  } catch {
    // Ignore
  }

  throw new Error("Image fetch failed");
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
      const reason = permStatus === 'denied' ? 'expired' : permStatus === 'pending' ? 'pending' : 'none';
      navigate('/', { replace: true, state: { uploadRedirect: reason } });
    }
  }, [authLoading, isAuthenticated, permStatus, navigate]);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    category: "",
    duration: 0,
    lyrics: "",
  });
  const { songs } = useFetchSongs();
  const [genreInput, setGenreInput] = useState("");

  const popularGenres = [
    "Synthwave", "Cyberpunk", "Electronic", "Rock", "Lo-Fi",
    "Hip-Hop", "Chillstep", "Ambient", "Phonk", "Pop", "Metal", "Jazz"
  ];

  const existingCategories = Array.from(new Set(
    songs.flatMap(s => (s.category || "").split(/[,&/|+]+/).map(c => c.trim().replace(/^#+/, ''))).filter(Boolean)
  ));

  const allSuggestions = Array.from(new Set([...popularGenres, ...existingCategories]));

  const selectedGenres = formData.category
    ? formData.category.split(/[,&/|+]+/).map(s => s.trim().replace(/^#+/, '')).filter(Boolean)
    : [];

  const addGenre = (tag: string) => {
    const rawTags = tag.split(/[,&/|+]+/).map(t => t.trim().replace(/^#+/, '')).filter(Boolean);
    if (rawTags.length === 0) return;
    const existingLower = new Set(selectedGenres.map(g => g.toLowerCase()));
    const toAdd = rawTags.filter(t => !existingLower.has(t.toLowerCase()));
    if (toAdd.length === 0) return;
    const updated = [...selectedGenres, ...toAdd];
    setFormData(prev => ({ ...prev, category: updated.join(', ') }));
    setGenreInput("");
  };

  const removeGenre = (tag: string) => {
    const clean = tag.trim().replace(/^#+/, '').toLowerCase();
    const updated = selectedGenres.filter(g => g.toLowerCase() !== clean);
    setFormData(prev => ({ ...prev, category: updated.join(', ') }));
  };
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverTab, setCoverTab] = useState<"file" | "url">("file");
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

      // Immediately set URL preview and coverUrl so submit works even if image download is slow or blocked
      if (thumbnailUrl) {
        setCoverUrl(thumbnailUrl);
        setPreviewUrl(thumbnailUrl);
        setCoverFile(null);

        // Best effort: download thumbnail as File in background
        urlToFile(thumbnailUrl, "imported_cover.jpg")
          .then(fetchedFile => {
            setCoverFile(fetchedFile);
            setPreviewUrl(URL.createObjectURL(fetchedFile));
          })
          .catch(err => {
            console.warn("Could not convert imported cover URL to File, using direct URL:", err);
          });
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
            setCoverUrl("");
            setPreviewUrl(URL.createObjectURL(blob));
          }

          setFormData(prev => ({
            ...prev,
            title: title || prev.title,
            artist: artist || prev.artist,
            category: genre
              ? (Array.isArray(genre) ? genre : [genre])
                  .flatMap(g => String(g).split(/[,&/|+]+/))
                  .map(g => g.trim().replace(/^#+/, ''))
                  .filter(Boolean)
                  .map(g => g.charAt(0).toUpperCase() + g.slice(1))
                  .join(", ") || prev.category
              : prev.category,
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
        setCoverUrl("");
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  // ── Paste handler ───────────────────────────────────────────────────────────
  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const fileSizeMB = file.size / (1024 * 1024);
          if (fileSizeMB > 5) {
            toast.error(`Pasted image is too big! (${fileSizeMB.toFixed(2)} MB). Max limit is 5MB.`);
            return;
          }
          setCoverTab("file");
          setCoverFile(file);
          setCoverUrl("");
          setPreviewUrl(URL.createObjectURL(file));
          toast.success("Image pasted successfully!");
          e.preventDefault();
          break;
        }
      }
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Determine effective cover (File or URL string)
    const effectiveCover: File | string | null = 
      coverFile || 
      (coverUrl.trim() ? coverUrl.trim() : null) || 
      (previewUrl && !previewUrl.startsWith("blob:") ? previewUrl.trim() : null);

    if (!audioFile || !effectiveCover || !formData.title.trim() || !formData.artist.trim()) {
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
      const uploaderName = isAuthenticated ? 'Admin' : (localStorage.getItem('fronto_uploader_name') || 'User');
      const uploaderFp = isAuthenticated ? 'admin' : (localStorage.getItem('fronto_fp') || 'unknown');

      await uploadSong(
        formData.title,
        formData.artist,
        formData.category.trim() || 'General',
        finalDuration,
        audioFile,
        effectiveCover,
        formData.lyrics,
        uploaderName,
        uploaderFp
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
    <div className="w-full max-w-4xl mx-auto p-6 md:p-12 relative z-10 flex flex-col gap-8 text-[var(--text-primary)] font-mono" onPaste={handlePaste}>
      <Helmet>
        <title>Upload Music — Add Tracks | Fronto</title>
        <meta name="description" content="Upload and add new music tracks to the Fronto cyberpunk playlist. Supports MP3 and audio files." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Header */}
      <div className="relative border border-[var(--accent)]/40 bg-black/80 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.8),0_0_15px_rgba(var(--accent-rgb),0.1)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-75"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-12 bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]"></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-white">
                Upload Zone
              </h1>
              <p className="text-xs text-[var(--accent)] tracking-widest mt-1 font-bold">
                SYSTEM AUDIO INGESTION
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
                       border border-white/30 text-white bg-white/5
                       hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/15
                       transition-all duration-300 shadow-sm"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
              <span>Back to Player</span>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40"></div>
      </div>

      {/* ── Quick Import Panel ─────────────────────────────────────────────── */}
      <div className="border border-[var(--accent)]/30 bg-black/75 backdrop-blur-md p-6 space-y-4 shadow-[0_0_25px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={18} className="text-[var(--accent)] animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-white font-bold">
            Quick Import — Spotify / SoundCloud
          </span>
        </div>

        <p className="text-xs text-white/80 leading-relaxed font-mono">
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
              className="w-full bg-black/70 border border-white/25 text-white p-3 pr-8 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)] transition-all text-sm placeholder:text-white/40 font-mono"
            />
            {importUrl && (
              <button
                type="button"
                onClick={() => { setImportUrl(""); setImportError(null); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !importUrl.trim()}
            className="px-5 py-3 text-xs uppercase tracking-widest font-black border transition-all duration-300
                       border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10
                       hover:bg-[var(--accent)] hover:text-black
                       disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-[0_0_10px_rgba(var(--accent-rgb),0.2)] hover:shadow-[0_0_20px_rgba(var(--accent-rgb),0.6)]
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
          <div className="flex items-center gap-2 text-red-300 text-xs border border-red-500/50 bg-red-950/40 px-3 py-2 font-mono">
            <AlertCircle size={14} className="text-red-400 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Platform hints */}
        <div className="flex gap-4 text-[10px] uppercase tracking-wider font-bold">
          <span className="flex items-center gap-1.5 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e] inline-block"></span>
            Spotify
          </span>
          <span className="flex items-center gap-1.5 text-orange-400">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316] inline-block"></span>
            SoundCloud
          </span>
        </div>
      </div>

      {/* ── Upload Form ─────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/80 p-6 md:p-8 border border-[var(--accent)]/40 shadow-[0_0_35px_rgba(0,0,0,0.9),0_0_15px_rgba(var(--accent-rgb),0.12)] backdrop-blur-md">
        
        {/* Left Column: Text Inputs */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--accent)] text-glow uppercase tracking-widest font-mono">Track Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-black/70 border border-white/25 text-white p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)] transition-all text-base placeholder:text-white/40 font-mono"
              placeholder="Enter song title..."
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--accent)] text-glow uppercase tracking-widest font-mono">Artist Name *</label>
            <input
              type="text"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="w-full bg-black/70 border border-white/25 text-white p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)] transition-all text-base placeholder:text-white/40 font-mono"
              placeholder="Enter artist name..."
              required
            />
          </div>

          {/* Multi-Genre & Tags Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--accent)] text-glow uppercase tracking-widest font-mono">
                Genres & Tags
              </label>
              {selectedGenres.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] tracking-wider">
                  {selectedGenres.length} {selectedGenres.length === 1 ? 'TAG' : 'TAGS'}
                </span>
              )}
            </div>

            {/* Selected Genre Chips */}
            <div className="flex flex-wrap gap-2 p-3 bg-black/70 border border-white/25 min-h-[50px] items-center">
              {selectedGenres.length === 0 ? (
                <span className="text-xs text-white/40 font-mono italic">
                  Hech qanday janr tanlanmagan (bo'sh qolsa #General saqlanadi)
                </span>
              ) : (
                selectedGenres.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => removeGenre(g)}
                    className="group inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider bg-[var(--accent)]/20 border border-[var(--accent)] text-[var(--accent)] shadow-[0_0_10px_rgba(var(--accent-rgb),0.25)] hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] active:scale-95 transition-all cursor-pointer select-none"
                    title={`O'chirish uchun bosing (#${g})`}
                  >
                    <span>#{g}</span>
                    <X size={12} className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                  </button>
                ))
              )}
            </div>

            {/* Custom Genre Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={genreInput}
                onChange={(e) => setGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addGenre(genreInput);
                  }
                }}
                className="flex-1 bg-black/70 border border-white/25 p-2.5 px-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_8px_var(--accent)] text-xs font-mono text-white placeholder:text-white/40"
                placeholder="Type genre & press Enter or comma (e.g. Synthwave, Cyberpunk)..."
              />
              <button
                type="button"
                onClick={() => addGenre(genreInput)}
                disabled={!genreInput.trim()}
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)] hover:text-black transition-all shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)] disabled:opacity-30 disabled:pointer-events-none"
              >
                + ADD
              </button>
            </div>

            {/* Quick Suggestions / Popular Pills */}
            <div className="pt-1">
              <div className="text-[10px] text-white/80 uppercase tracking-widest font-mono mb-2 font-bold">
                Suggested Tags:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {allSuggestions
                  .filter(cat => !selectedGenres.some(g => g.toLowerCase() === cat.toLowerCase()))
                  .slice(0, 14)
                  .map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => addGenre(cat)}
                      className="px-2.5 py-1 text-[10px] font-mono font-medium uppercase tracking-wider border border-white/25 text-white/90 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/15 transition-all bg-white/5 shadow-sm"
                    >
                      + {cat}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--accent)] text-glow uppercase tracking-widest font-mono">Lyrics (Optional)</label>
            <textarea
              value={formData.lyrics}
              onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              className="w-full h-32 bg-black/70 border border-white/25 text-white p-3 focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_12px_rgba(var(--accent-rgb),0.4)] transition-all text-sm font-mono resize-none custom-scrollbar placeholder:text-white/40"
              placeholder="Paste the song lyrics here..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative overflow-hidden py-4 font-black text-lg uppercase tracking-widest border transition-all duration-300
                ${loading 
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-black cursor-not-allowed' 
                  : 'border-[var(--accent)] text-black bg-[var(--accent)] hover:bg-transparent hover:text-[var(--accent)] hover:shadow-[0_0_25px_var(--accent)]'
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
            <label className="block text-xs font-bold text-[var(--accent)] text-glow uppercase tracking-widest mb-2 font-mono">Audio File *</label>
            <div className={`relative h-28 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
              audioFile 
                ? 'border-[var(--accent)] bg-[var(--accent)]/15 shadow-[0_0_15px_rgba(var(--accent-rgb),0.25)]' 
                : 'border-white/30 bg-black/60 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'
            }`}>
              <input 
                type="file" 
                accept="audio/*" 
                onChange={(e) => handleFileChange(e, 'audio')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Music className={`mb-2 transition-transform duration-300 group-hover:scale-110 ${audioFile ? 'text-[var(--accent)] scale-110' : 'text-white/70 group-hover:text-[var(--accent)]'}`} size={26} />
              <span className={`text-xs font-bold font-mono tracking-wider truncate max-w-[85%] px-2 text-center ${audioFile ? 'text-[var(--accent)]' : 'text-white/80 group-hover:text-white'}`}>
                {audioFile ? audioFile.name : "DRAG & DROP OR CLICK TO UPLOAD MP3"}
              </span>
              <span className="text-[10px] text-white/50 font-mono mt-0.5">
                {audioFile ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : "Supports MP3, WAV, FLAC, OGG, AAC"}
              </span>
            </div>
          </div>

          {/* Cover Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--accent)] text-glow uppercase tracking-widest font-mono">
                Cover Art *
              </label>
              <div className="flex items-center gap-1 border border-white/20 p-0.5 bg-black/60 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCoverTab("file")}
                  className={`px-2.5 py-1 font-mono uppercase tracking-wider transition-colors ${coverTab === 'file' ? 'bg-[var(--accent)] text-black font-black shadow-sm' : 'text-white/70 hover:text-white font-bold'}`}
                >
                  Fayl
                </button>
                <button
                  type="button"
                  onClick={() => setCoverTab("url")}
                  className={`px-2.5 py-1 font-mono uppercase tracking-wider transition-colors ${coverTab === 'url' ? 'bg-[var(--accent)] text-black font-black shadow-sm' : 'text-white/70 hover:text-white font-bold'}`}
                >
                  Havola (URL)
                </button>
              </div>
            </div>

            {/* URL input mode */}
            {coverTab === "url" && (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCoverUrl(val);
                    setPreviewUrl(val.trim() || null);
                    setCoverFile(null);
                  }}
                  placeholder="https://example.com/cover.jpg"
                  className="flex-1 bg-black/70 border border-white/25 text-white p-2.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_10px_var(--accent)] transition-all placeholder:text-white/40"
                />
                {coverUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverUrl("");
                      setPreviewUrl(null);
                    }}
                    className="px-3 border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white text-xs font-mono transition-colors"
                    title="Tozalash"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Preview & File Box */}
            <div className={`relative h-64 border-2 border-dashed flex flex-col items-center justify-center transition-all group overflow-hidden ${
              coverFile || previewUrl 
                ? 'border-solid border-[var(--accent)] bg-black shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]' 
                : 'border-white/30 bg-black/60 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5'
            }`}>
              {coverTab === "file" && (
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'cover')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              )}

              {previewUrl ? (
                <div className="absolute inset-0 w-full h-full">
                  <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 pointer-events-none" />
                  
                  {/* Badge & actions on preview */}
                  <div className="absolute top-2.5 left-2.5 z-30">
                    <span className="px-2.5 py-1 bg-black/90 border border-[var(--accent)] text-[var(--accent)] text-[10px] font-mono font-bold uppercase tracking-wider shadow-md">
                      {coverFile ? "Fayldan yuklandi" : (coverUrl ? "Havoladan (URL)" : "Import qilingan")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverFile(null);
                      setCoverUrl("");
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2.5 right-2.5 z-30 p-1.5 bg-black/90 border border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    title="Muqovani olib tashlash"
                  >
                    <X size={14} />
                  </button>

                  {coverTab === "file" && (
                    <div className="absolute bottom-2.5 inset-x-2.5 text-center z-10 pointer-events-none">
                      <span className="text-[10px] text-white font-bold bg-black/80 px-3 py-1.5 border border-white/20 backdrop-blur-md shadow-md inline-block">
                        O'zgartirish uchun bosing yoki yangi rasm tashlang
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <ImageIcon className="mb-2 mx-auto text-white/70 group-hover:text-[var(--accent)] transition-colors" size={28} />
                  <span className="text-xs text-white/80 font-bold font-mono tracking-wider block group-hover:text-white transition-colors">
                    {coverTab === "file" ? "UPLOAD COVER IMAGE (JPG/PNG)" : "Yuqoridagi maydonga rasm havolasini kiriting"}
                  </span>
                  <span className="text-[10px] text-white/50 font-mono mt-1 block">
                    {coverTab === "file" ? "Drag & drop rasm yoki faylni tanlang" : "Direct image URL (Spotify/SoundCloud/CDN)"}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
