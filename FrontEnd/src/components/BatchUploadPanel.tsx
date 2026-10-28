import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { 
  Upload as UploadIcon, 
  Music, 
  Image as ImageIcon, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FolderPlus, 
  RefreshCw, 
  Sparkles, 
  Check, 
  PlayCircle,
  Clipboard
} from "lucide-react";
import { parseBlob } from "music-metadata";
import { uploadSong } from "../services/musicApi";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export interface BatchItem {
  id: string;
  file: File;
  title: string;
  artist: string;
  category: string;
  duration: number;
  coverFile?: File;
  coverPreviewUrl?: string;
  status: 'parsing' | 'ready' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  progress?: number;
}

interface BatchUploadPanelProps {
  popularGenres: string[];
  existingCategories: string[];
  isAuthenticated: boolean;
  onFinished?: () => void;
}

export function BatchUploadPanel({
  popularGenres,
  existingCategories,
  isAuthenticated,
}: BatchUploadPanelProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkCoverPreview, setBulkCoverPreview] = useState<string | null>(null);
  const [bulkCoverFile, setBulkCoverFile] = useState<File | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Apply a cover image File to a specific item or to all items
  const applyCoverToItem = (file: File, itemId?: string | null) => {
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 8) {
      toast.error(`Rasm hajmi juda katta (${fileSizeMB.toFixed(1)} MB). 8MB dan kichik rasm tanlang.`);
      return;
    }
    const previewUrl = URL.createObjectURL(file);

    if (itemId) {
      const target = items.find(it => it.id === itemId);
      setItems(prev => prev.map(it => it.id === itemId ? {
        ...it,
        coverFile: file,
        coverPreviewUrl: previewUrl
      } : it));
      toast.success(`"${target?.title || 'Trek'}" uchun muqova rasmi o'rnatildi!`);
    } else {
      setBulkCoverFile(file);
      setBulkCoverPreview(previewUrl);
      setItems(prev => prev.map(it => ({
        ...it,
        coverFile: file,
        coverPreviewUrl: previewUrl
      })));
      toast.success(`Barcha ${items.length} ta trekka umumiy muqova rasmi o'rnatildi!`);
    }
  };

  // Paste from clipboard (1-click action via navigator.clipboard or prompt)
  const handlePasteFromClipboard = async (itemId?: string | null) => {
    try {
      if (navigator.clipboard?.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(type => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `pasted_cover_${Date.now()}.${imageType.split('/')[1] || 'png'}`, { type: imageType });
            applyCoverToItem(file, itemId);
            return;
          }
        }
      }
      toast.info("Xotirada rasm topilmadi. Avval rasmni nusxalang (Copy Image), so'ng Ctrl+V tugmasini bosing.");
    } catch {
      toast.info("Rasmni o'rnatish uchun trek ustida Ctrl+V tugmasini bosing.");
    }
  };

  // Global Ctrl+V paste listener for batch panel
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const clipItems = e.clipboardData?.items;
      if (!clipItems) return;

      for (let i = 0; i < clipItems.length; i++) {
        if (clipItems[i].type.indexOf('image') !== -1) {
          const file = clipItems[i].getAsFile();
          if (file) {
            e.preventDefault();
            e.stopPropagation();
            applyCoverToItem(file, activeItemId);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeItemId, items]);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const bulkCoverInputRef = useRef<HTMLInputElement | null>(null);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "--:--";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Parse single audio file metadata
  const extractMetadata = async (file: File): Promise<{
    title: string;
    artist: string;
    category: string;
    duration: number;
    coverFile?: File;
    coverPreviewUrl?: string;
  }> => {
    let title = "";
    let artist = "";
    let category = "General";
    let duration = 0;
    let coverFile: File | undefined = undefined;
    let coverPreviewUrl: string | undefined = undefined;

    try {
      const metadata = await parseBlob(file);
      title = metadata.common.title || "";
      artist = metadata.common.artist || "";
      duration = metadata.format.duration || 0;

      if (metadata.common.genre && metadata.common.genre.length > 0) {
        const rawGenre = Array.isArray(metadata.common.genre) ? metadata.common.genre[0] : String(metadata.common.genre);
        category = rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1);
      }

      const picture = metadata.common.picture?.[0];
      if (picture) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = new Blob([picture.data as any], { type: picture.format });
        coverFile = new File([blob], `cover_${Date.now()}.${picture.format.split('/')[1] || 'jpg'}`, { type: picture.format });
        coverPreviewUrl = URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn("Metadata extraction fallback for:", file.name, err);
    }

    // Fallback title / artist from filename
    const cleanFileName = file.name.replace(/\.[^/.]+$/, "");
    const parts = cleanFileName.split(/[-–_]/).map(p => p.trim()).filter(Boolean);

    if (!artist && parts.length >= 2) {
      artist = parts[0];
      if (!title) title = parts.slice(1).join(" ");
    } else if (!title) {
      title = cleanFileName;
    }
    if (!artist) artist = "Unknown Artist";

    // Fallback duration using Audio element
    if (!duration) {
      try {
        duration = await new Promise<number>((resolve) => {
          const a = new Audio(URL.createObjectURL(file));
          a.onloadedmetadata = () => resolve(a.duration || 0);
          a.onerror = () => resolve(0);
        });
      } catch {
        duration = 0;
      }
    }

    return {
      title,
      artist,
      category: category || "General",
      duration,
      coverFile,
      coverPreviewUrl
    };
  };

  // Add files to staging list
  const handleFilesAdded = async (files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(f => 
      f.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)
    );

    if (audioFiles.length === 0) {
      toast.error("Audio formatidagi fayllar topilmadi (.mp3, .wav, .flac, .ogg, .m4a)");
      return;
    }

    const newItems: BatchItem[] = audioFiles.map((f, idx) => ({
      id: `${Date.now()}-${idx}-${f.name}`,
      file: f,
      title: f.name.replace(/\.[^/.]+$/, ""),
      artist: "Yuklanmoqda...",
      category: bulkCategory.trim() || "General",
      duration: 0,
      coverFile: bulkCoverFile || undefined,
      coverPreviewUrl: bulkCoverPreview || undefined,
      status: 'parsing',
    }));

    setItems(prev => [...prev, ...newItems]);
    toast.info(`${audioFiles.length} ta audio fayl qabul qilindi, metadata tahlil qilinmoqda...`);

    // Parse each file
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      try {
        const meta = await extractMetadata(item.file);
        setItems(prev => prev.map(it => {
          if (it.id === item.id) {
            return {
              ...it,
              title: meta.title,
              artist: meta.artist,
              category: bulkCategory.trim() || meta.category,
              duration: meta.duration,
              coverFile: bulkCoverFile || meta.coverFile,
              coverPreviewUrl: bulkCoverPreview || meta.coverPreviewUrl,
              status: 'ready',
            };
          }
          return it;
        }));
      } catch {
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'ready' } : it));
      }
    }

    toast.success("✨ Barcha treklarning metadatalari muvaffaqiyatli o'qildi!");
  };

  // Drag & drop handlers
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Input change handlers
  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesAdded(e.target.files);
    }
    e.target.value = "";
  };

  // Apply bulk category
  const handleApplyBulkCategory = () => {
    if (!bulkCategory.trim()) return;
    setItems(prev => prev.map(it => ({ ...it, category: bulkCategory.trim() })));
    toast.success(`Barcha ${items.length} ta trekka "${bulkCategory.trim()}" janri biriktirildi!`);
  };

  // Bulk cover selector
  const handleBulkCoverSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkCoverFile(file);
      const url = URL.createObjectURL(file);
      setBulkCoverPreview(url);
      setItems(prev => prev.map(it => ({
        ...it,
        coverFile: file,
        coverPreviewUrl: url
      })));
      toast.success("Barcha treklarga umumiy albom rasmi o'rnatildi!");
    }
    e.target.value = "";
  };

  // Update item field
  const updateItem = (id: string, field: keyof BatchItem, value: any) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  // Remove single item
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Clear all
  const clearAll = () => {
    if (items.length > 0 && window.confirm("Rostdan ham barcha qo'shilgan treklarni tozalaysizmi?")) {
      setItems([]);
    }
  };

  // Upload worker: executes uploads with concurrency limit (e.g. 2 parallel)
  const handleStartBatchUpload = async () => {
    const pendingItems = items.filter(it => it.status === 'ready' || it.status === 'error');
    if (pendingItems.length === 0) {
      toast.info("Yuklash uchun tayyor treklar yo'q!");
      return;
    }

    setIsUploading(true);
    const uploaderName = isAuthenticated ? 'Admin' : (localStorage.getItem('fronto_uploader_name') || 'User');
    const uploaderFp = isAuthenticated ? 'admin' : (localStorage.getItem('fronto_fp') || 'unknown');

    let completed = 0;
    const totalToUpload = pendingItems.length;

    // Worker pool concurrency
    const CONCURRENCY = 2;
    const queue = [...pendingItems];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        // Set status to uploading
        setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'uploading', errorMessage: undefined } : it));

        try {
          const coverToUpload = item.coverFile || (item.coverPreviewUrl && !item.coverPreviewUrl.startsWith("blob:") ? item.coverPreviewUrl : "");

          await uploadSong(
            item.title.trim() || item.file.name,
            item.artist.trim() || "Unknown Artist",
            item.category.trim() || "General",
            item.duration || 0,
            item.file,
            coverToUpload,
            "",
            uploaderName,
            uploaderFp
          );

          completed++;
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: 'success' } : it));
        } catch (err: any) {
          console.error("Batch item upload failed:", item.title, err);
          setItems(prev => prev.map(it => it.id === item.id ? { 
            ...it, 
            status: 'error', 
            errorMessage: err?.message || "Yuklashda xatolik yuz berdi" 
          } : it));
        }
      }
    };

    // Run parallel workers
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker());
    await Promise.all(workers);

    setIsUploading(false);
    if (completed === totalToUpload) {
      toast.success(`🎉 Barcha ${completed} ta trek Supabase bazasiga muvaffaqiyatli yuklandi!`);
    } else {
      toast.warning(`${completed} ta trek yuklandi, ${totalToUpload - completed} tasida xatolik yuz berdi.`);
    }
  };

  // Calculations
  const totalDuration = items.reduce((acc, it) => acc + (it.duration || 0), 0);
  const totalSizeMB = (items.reduce((acc, it) => acc + (it.file?.size || 0), 0) / (1024 * 1024)).toFixed(1);
  const successCount = items.filter(it => it.status === 'success').length;
  const readyCount = items.filter(it => it.status === 'ready').length;
  const errorCount = items.filter(it => it.status === 'error').length;
  const uploadingCount = items.filter(it => it.status === 'uploading').length;

  return (
    <div className="space-y-6 font-mono animate-in fade-in duration-200">
      
      {/* ── Dropzone & Upload Actions ────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`cyber-panel border-2 border-dashed p-8 md:p-12 text-center transition-all cursor-pointer relative overflow-hidden group ${
          isDragging 
            ? 'border-[var(--accent)] bg-[rgba(var(--accent-rgb),0.15)] shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)]' 
            : 'border-white/20 hover:border-[var(--accent)]/60 bg-black/60'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center gap-3 relative z-10">
          <div className="w-16 h-16 rounded-full bg-[rgba(var(--accent-rgb),0.1)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">
            <UploadIcon size={28} className="animate-pulse" />
          </div>

          <h3 className="text-base md:text-lg font-bold text-white tracking-widest uppercase">
            OMMAVIY AUDIO YUKLASH (BATCH UPLOAD)
          </h3>
          <p className="text-xs text-white/70 max-w-md leading-relaxed">
            Musiqa fayllarini shu yerga tashlang yoki papkadan birdaniga tanlang. 
            <span className="text-[var(--accent)] font-bold ml-1">MP3, WAV, FLAC, OGG, M4A</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-3" onClick={e => e.stopPropagation()}>
            {/* Pick Multiple Files Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-[var(--accent)] text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]"
            >
              <Music size={14} /> Fayllarni Tanlash (Ko'p)
            </button>

            {/* Pick Entire Folder Button */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/25 hover:border-[var(--accent)] transition-all flex items-center gap-2"
            >
              <FolderPlus size={14} /> Butun Papkani Yuklash
            </button>
          </div>

          <div className="text-[10px] text-white/40 tracking-wider uppercase mt-2">
            AI ID3 metadata o'qish (Title, Artist, Genre, Albom rasmi) avtomatik ishlaydi
          </div>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
          onChange={onFileInputChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          onChange={onFileInputChange}
          className="hidden"
        />
      </div>

      {/* ── Items Staging Area ──────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="space-y-4">
          
          {/* Top Control & Stats Bar */}
          <div className="cyber-panel p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[var(--accent)]/40 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            
            {/* Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 bg-[var(--accent)] text-black font-black uppercase">
                {items.length} TA TREK
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/80 border border-white/10">
                {formatTime(totalDuration)}
              </span>
              <span className="px-2.5 py-1 bg-white/10 text-white/80 border border-white/10">
                {totalSizeMB} MB
              </span>
              {successCount > 0 && (
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <Check size={12} /> {successCount} tayyor
                </span>
              )}
              {errorCount > 0 && (
                <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/40 font-bold flex items-center gap-1">
                  <AlertCircle size={12} /> {errorCount} xato
                </span>
              )}
            </div>

            {/* Bulk Batch Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Bulk Category Setter */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value)}
                  placeholder="Barchasiga janr..."
                  list="bulk-genres-list"
                  className="bg-black/60 border border-white/20 px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[var(--accent)] w-36"
                />
                <datalist id="bulk-genres-list">
                  {Array.from(new Set([...popularGenres, ...existingCategories])).map(g => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={handleApplyBulkCategory}
                  disabled={!bulkCategory.trim()}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-[var(--accent)] hover:text-black border border-white/20 text-xs font-bold transition-all uppercase disabled:opacity-30"
                  title="Hammasiga qo'llash"
                >
                  Qo'llash
                </button>
              </div>

              {/* Bulk Cover Setter */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => bulkCoverInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                  title="Fayldan umumiy albom rasmi tanlash"
                >
                  <ImageIcon size={13} className="text-[var(--accent)]" />
                  <span className="hidden sm:inline">Umumiy Rasm</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePasteFromClipboard(null)}
                  className="px-2.5 py-1.5 bg-[var(--accent)]/15 hover:bg-[var(--accent)] text-[var(--accent)] hover:text-black border border-[var(--accent)]/40 text-xs font-bold flex items-center gap-1 transition-all"
                  title="Clipboard'dan rasmni barchasiga qo'yish (Ctrl+V)"
                >
                  <Clipboard size={13} />
                  <span className="hidden md:inline">Paste</span>
                </button>
              </div>
              <input
                ref={bulkCoverInputRef}
                type="file"
                accept="image/*"
                onChange={handleBulkCoverSelect}
                className="hidden"
              />

              {/* Clear All */}
              <button
                type="button"
                onClick={clearAll}
                disabled={isUploading}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all uppercase disabled:opacity-40"
              >
                Tozalash
              </button>
            </div>
          </div>

          {/* Overall Progress Bar during upload */}
          {isUploading && (
            <div className="cyber-panel p-4 space-y-2 border border-[var(--accent)]">
              <div className="flex items-center justify-between text-xs text-white">
                <span className="flex items-center gap-2 font-bold text-[var(--accent)]">
                  <Loader2 size={14} className="animate-spin" />
                  YUKLANMOQDA: {successCount} / {items.length} TA TREK ({Math.round((successCount / items.length) * 100)}%)
                </span>
                <span className="text-[10px] text-white/60">
                  {uploadingCount} ta faol yuklanmoqda
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/70 border border-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 transition-all duration-300 shadow-[0_0_10px_var(--accent)]"
                  style={{ width: `${Math.max(4, Math.round((successCount / items.length) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Table of tracks */}
          <div className="cyber-panel overflow-hidden border border-white/15 shadow-xl">
            <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
              <div className="min-w-[650px] sm:min-w-full">
                {/* Table Header */}
                <div className="grid grid-cols-[55px_45px_minmax(140px,2fr)_minmax(110px,1.5fr)_minmax(90px,1fr)_50px_45px_35px] gap-2.5 p-3 bg-white/[0.04] border-b border-white/10 text-[10px] uppercase font-bold tracking-widest text-white/70 items-center">
                  <div>Holat</div>
                  <div>Muqova</div>
                  <div>Qo'shiq Nomi</div>
                  <div>Ijrochi</div>
                  <div>Janr</div>
                  <div>Vaqt</div>
                  <div>Hajm</div>
                  <div className="text-center">X</div>
                </div>

                {/* Table Rows - strictly overflow-x-hidden to prevent duplicate horizontal scrollbars */}
                <div className="max-h-[480px] overflow-y-auto overflow-x-hidden custom-scrollbar divide-y divide-white/5">
                  {items.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => setActiveItemId(item.id)}
                      onMouseEnter={() => setActiveItemId(item.id)}
                      className={`grid grid-cols-[55px_45px_minmax(140px,2fr)_minmax(110px,1.5fr)_minmax(90px,1fr)_50px_45px_35px] gap-2.5 p-2.5 items-center transition-all ${
                        activeItemId === item.id ? 'ring-1 ring-[var(--accent)]/50 bg-[var(--accent)]/5' : ''
                      } ${
                        item.status === 'success' 
                          ? 'bg-emerald-950/20' 
                          : item.status === 'error' 
                          ? 'bg-red-950/20' 
                          : item.status === 'uploading' 
                          ? 'bg-[var(--accent)]/10 ring-1 ring-inset ring-[var(--accent)]/40' 
                          : idx % 2 === 1 ? 'bg-white/[0.02]' : 'bg-transparent'
                      } hover:bg-white/[0.05]`}
                    >
                      {/* Status */}
                      <div>
                        {item.status === 'parsing' && (
                          <div className="flex items-center gap-1 text-[10px] text-yellow-400 font-bold" title="Metadata o'qilmoqda">
                            <Loader2 size={13} className="animate-spin" />
                          </div>
                        )}
                        {item.status === 'ready' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/10 text-white/80 border border-white/20">
                            TAYYOR
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-bold">
                            <Loader2 size={13} className="animate-spin" />
                          </div>
                        )}
                        {item.status === 'success' && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5" title="Muvaffaqiyatli yuklandi">
                            <CheckCircle2 size={14} /> OK
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="text-[10px] font-bold text-red-400 flex items-center gap-0.5" title={item.errorMessage || "Xatolik"}>
                            <AlertCircle size={14} /> ERR
                          </span>
                        )}
                      </div>

                      {/* Cover Thumbnail with Paste / Select Overlay */}
                      <div className="relative group/cover w-10 h-10 shrink-0">
                        <img
                          src={item.coverPreviewUrl || '/placeholder.png'}
                          alt=""
                          className={`w-10 h-10 object-cover border bg-black/40 transition-all ${
                            activeItemId === item.id ? 'border-[var(--accent)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.3)]' : 'border-white/20'
                          }`}
                        />
                        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                          {/* Paste Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveItemId(item.id);
                              handlePasteFromClipboard(item.id);
                            }}
                            className="p-1 bg-[var(--accent)] text-black hover:scale-110 transition-transform"
                            title="Clipboard'dan qo'yish (Ctrl+V)"
                          >
                            <Clipboard size={11} />
                          </button>
                          {/* Browse File Button */}
                          <label 
                            className="p-1 bg-white/20 text-white hover:bg-white/40 hover:scale-110 cursor-pointer transition-all"
                            title="Fayldan tanlash"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ImageIcon size={11} />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  applyCoverToItem(file, item.id);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Editable Title */}
                      <input
                        type="text"
                        value={item.title}
                        disabled={item.status === 'success' || item.status === 'uploading'}
                        onChange={e => updateItem(item.id, 'title', e.target.value)}
                        className="bg-black/40 border border-white/10 hover:border-white/30 focus:border-[var(--accent)] px-2 py-1 text-xs text-white focus:outline-none transition-colors truncate w-full min-w-0"
                      />

                      {/* Editable Artist */}
                      <input
                        type="text"
                        value={item.artist}
                        disabled={item.status === 'success' || item.status === 'uploading'}
                        onChange={e => updateItem(item.id, 'artist', e.target.value)}
                        className="bg-black/40 border border-white/10 hover:border-white/30 focus:border-[var(--accent)] px-2 py-1 text-xs text-white/80 focus:outline-none transition-colors truncate w-full min-w-0"
                      />

                      {/* Editable Category */}
                      <input
                        type="text"
                        value={item.category}
                        disabled={item.status === 'success' || item.status === 'uploading'}
                        onChange={e => updateItem(item.id, 'category', e.target.value)}
                        list="row-genres-list"
                        className="bg-black/40 border border-white/10 hover:border-white/30 focus:border-[var(--accent)] px-2 py-1 text-xs text-white/80 focus:outline-none transition-colors truncate w-full min-w-0"
                      />

                      {/* Duration */}
                      <div className="text-[11px] text-white/60">
                        {formatTime(item.duration)}
                      </div>

                      {/* Size */}
                      <div className="text-[10px] text-white/40">
                        {(item.file.size / (1024 * 1024)).toFixed(1)}M
                      </div>

                      {/* Delete item */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={item.status === 'uploading'}
                          className="text-white/30 hover:text-red-400 transition-colors p-1"
                          title="Ro'yxatdan o'chirish"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Datalist for genres */}
          <datalist id="row-genres-list">
            {Array.from(new Set([...popularGenres, ...existingCategories])).map(g => (
              <option key={g} value={g} />
            ))}
          </datalist>

          {/* Bottom Execution Bar */}
          <div className="cyber-panel p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-[var(--accent)]/50 bg-[rgba(var(--accent-rgb),0.06)] shadow-[0_0_25px_rgba(var(--accent-rgb),0.15)]">
            <div className="text-xs text-white/80">
              {successCount === items.length && items.length > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Barcha treklar muvaffaqiyatli saqlandi!
                </span>
              ) : (
                <span>
                  Yuklashga tayyor: <strong className="text-[var(--accent)]">{readyCount} ta trek</strong>
                  {errorCount > 0 && <span className="text-red-400 ml-2">({errorCount} ta xato)</span>}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {successCount > 0 && (
                <Link
                  to="/"
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider border border-white/30 flex items-center gap-2 transition-all"
                >
                  <PlayCircle size={14} className="text-[var(--accent)]" /> Playerda Ko'rish
                </Link>
              )}

              {errorCount > 0 && !isUploading && (
                <button
                  type="button"
                  onClick={handleStartBatchUpload}
                  className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs uppercase tracking-wider border border-red-500/40 flex items-center gap-2 transition-all"
                >
                  <RefreshCw size={14} /> Xatolarni Qayta Yuklash
                </button>
              )}

              <button
                type="button"
                onClick={handleStartBatchUpload}
                disabled={isUploading || readyCount === 0}
                className="w-full sm:w-auto px-8 py-3.5 bg-[var(--accent)] hover:opacity-90 text-black font-black font-mono text-xs uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(var(--accent-rgb),0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> YUKLANMOQDA ({successCount}/{items.length})...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> HAMMASINI YUKLASH ({readyCount})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
