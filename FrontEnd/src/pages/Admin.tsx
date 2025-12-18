import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFetchSongs } from "../hooks/useFetchSongs";
import { ArrowLeft, Music, Image as ImageIcon, CheckCircle, AlertCircle, LogOut } from "lucide-react";
import { uploadSong } from "../services/musicApi";
import { useAuth } from "../contexts/AuthContext";

export function Admin() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    category: "General",
    duration: 0,
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
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: "audio" | "cover") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileSizeMB = file.size / (1024 * 1024);

      if (type === "audio") {
        if (fileSizeMB > 50) {
          setStatus({ type: "error", message: `Audio file is too big! (${fileSizeMB.toFixed(2)} MB). Max limit is 50MB.` });
          return;
        }
        setAudioFile(file);
        // Try to get duration
        const audio = new Audio(URL.createObjectURL(file));
        audio.onloadedmetadata = () => {
          setFormData(prev => ({ ...prev, duration: audio.duration }));
        };
      } else {
        if (fileSizeMB > 5) {
          setStatus({ type: "error", message: `Cover image is too big! (${fileSizeMB.toFixed(2)} MB). Max limit is 5MB.` });
          return;
        }
        setCoverFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
      // If we got here, clear any previous "too big" error
      if (status?.message.includes("too big")) setStatus(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!audioFile || !coverFile || !formData.title || !formData.artist) {
      setStatus({ type: "error", message: "All fields are required!" });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await uploadSong(
        formData.title,
        formData.artist,
        formData.category,
        formData.duration,
        audioFile,
        coverFile
      );

      setStatus({ type: "success", message: "Song uploaded successfully!" });
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to upload song." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-12 relative z-10 flex flex-col gap-8 text-[var(--text-primary)] font-mono">
      {/* Header with enhanced styling */}
      <div className="relative border border-[var(--text-secondary)] bg-black/60 backdrop-blur-sm">
        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-12 bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]"></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wider uppercase">
                Admin Panel
              </h1>
              <p className="text-xs text-[var(--text-secondary)] tracking-widest mt-1">
                UPLOAD MANAGEMENT SYSTEM
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Manage Database Button */}
            <Link 
              to="/editor" 
              className="group relative flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold
                       border border-[var(--accent)] text-[var(--accent)]
                       hover:bg-[var(--accent)] hover:text-black
                       transition-all duration-300
                       shadow-[0_0_10px_rgba(0,255,255,0.2)] hover:shadow-[0_0_20px_rgba(0,255,255,0.6)]
                       overflow-hidden"
            >
              <span className="relative z-10">Manage Database</span>
              <div className="absolute inset-0 bg-[var(--accent)] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </Link>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="group relative flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-bold
                       border border-red-500 text-red-500
                       hover:bg-red-500 hover:text-white
                       transition-all duration-300
                       shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]
                       overflow-hidden"
            >
              <LogOut size={14} className="relative z-10" />
              <span className="relative z-10">Logout</span>
              <div className="absolute inset-0 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </button>

            {/* Back to Player Button */}
            <Link 
              to="/" 
              className="group flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-wider
                       border border-[var(--text-secondary)] text-[var(--text-secondary)]
                       hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]
                       transition-all duration-300"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
              <span>Back</span>
            </Link>
          </div>
        </div>

        {/* Decorative bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-30"></div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/40 p-8 border border-[var(--text-secondary)] shadow-[0_0_30px_rgba(0,255,255,0.05)] backdrop-blur-sm">
        
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
            {/* Custom dropdown to match Player styling */}
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

          <div className="pt-4">
             {status && (
              <div className={`p-4 border flex items-center gap-3 ${status.type === 'success' ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-red-500 text-red-400 bg-red-900/20'}`}>
                {status.type === 'success' ? <CheckCircle /> : <AlertCircle />}
                {status.message}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-4 py-4 font-bold text-xl uppercase tracking-widest border transition-all duration-300
                ${loading 
                  ? 'border-gray-600 text-gray-600 cursor-not-allowed' 
                  : 'border-[var(--accent)] text-[var(--bg-main)] bg-[var(--accent)] hover:bg-transparent hover:text-[var(--accent)] hover:shadow-[0_0_20px_var(--accent)]'
                }
              `}
            >
              {loading ? "UPLOADING..." : "UPLOAD TRACK"}
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
            <label className="block text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-2">Cover Art</label>
            <div className={`relative h-64 border-2 border-dashed border-[var(--text-secondary)] flex flex-col items-center justify-center cursor-pointer transition-colors group-hover:border-[var(--accent)] overflow-hidden ${coverFile ? 'border-solid' : ''}`}>
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
