import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Filter, Flame, Heart, Clock, ListMusic } from "lucide-react";

export interface CyberCategoryDropdownProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
  totalSongs?: number;
  className?: string;
  align?: 'left' | 'right';
}

export function CyberCategoryDropdown({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  totalSongs = 0,
  className = "",
  align = 'right',
}: CyberCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Click-outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Special system presets
  const systemPresets = useMemo(() => {
    const list = [
      { id: "All", label: "BARCHA TREKLAR", icon: Filter, count: totalSongs || categoryCounts["All"] || 0 },
      { id: "Trending", label: "TRENDING", icon: Flame, count: categoryCounts["Trending"] || 0 },
      { id: "Favorites", label: "SEVIMLILAR", icon: Heart, count: categoryCounts["Favorites"] || 0 },
      { id: "Queue", label: "NAVBAT", icon: ListMusic, count: categoryCounts["Queue"] || 0 },
      { id: "Recently Played", label: "YAQINDA TINGLANGAN", icon: Clock, count: categoryCounts["Recently Played"] || 0 },
    ];
    // Filter to only presets that exist in categories prop
    return list.filter(p => categories.includes(p.id));
  }, [categories, categoryCounts, totalSongs]);

  // Pure musical genres (excluding system presets, defensively split and uppercase canonicalized)
  const musicalGenres = useMemo(() => {
    const presetIds = new Set(["All", "Trending", "Favorites", "Queue", "Recently Played"]);
    const genreSet = new Set<string>();

    categories.forEach(c => {
      if (presetIds.has(c)) return;
      const parts = c
        .split(/[,/&|+]+|\band\b/i)
        .map(p => p.trim().replace(/^#+/, '').toUpperCase())
        .filter(Boolean);
      if (parts.length === 0) {
        genreSet.add("GENERAL");
      } else {
        parts.forEach(p => genreSet.add(p));
      }
    });

    return Array.from(genreSet).sort((a, b) => {
      const countA = categoryCounts[a] ?? categoryCounts[a.toUpperCase()] ?? categoryCounts[a.toLowerCase()] ?? 0;
      const countB = categoryCounts[b] ?? categoryCounts[b.toUpperCase()] ?? categoryCounts[b.toLowerCase()] ?? 0;
      return countB - countA;
    });
  }, [categories, categoryCounts]);

  // Filtered by search
  const filteredGenres = useMemo(() => {
    if (!search.trim()) return musicalGenres;
    const q = search.trim().toLowerCase();
    return musicalGenres.filter(g => g.toLowerCase().includes(q));
  }, [musicalGenres, search]);

  const filteredPresets = useMemo(() => {
    if (!search.trim()) return systemPresets;
    const q = search.trim().toLowerCase();
    return systemPresets.filter(p => p.label.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
  }, [systemPresets, search]);

  // Selected count
  const currentCount = categoryCounts[selectedCategory] ?? 
    categoryCounts[selectedCategory.toUpperCase()] ??
    categoryCounts[selectedCategory.toLowerCase()] ??
    (selectedCategory === "All" ? totalSongs : 0);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full py-1.5 px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-between gap-2 border transition-all shadow-sm ${
          selectedCategory !== "All"
            ? "border-[var(--accent)] text-[var(--accent)] bg-[rgba(var(--accent-rgb),0.12)] shadow-[0_0_12px_rgba(var(--accent-rgb),0.2)]"
            : "border-white/20 bg-black/60 text-white/90 hover:border-[var(--accent)]/60 hover:text-white"
        }`}
        title="Janr bo'yicha filtr"
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] shadow-[0_0_6px_var(--accent)] shrink-0" />
          <span className="truncate">
            {selectedCategory === "All" ? "BARCHA JANRLAR" : selectedCategory.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.2 ${
            selectedCategory !== "All" ? "bg-[var(--accent)] text-black" : "bg-white/15 text-white/70"
          }`}>
            {currentCount}
          </span>
          <span className={`text-[8px] transition-transform duration-200 text-[var(--accent)] ${isOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-64 sm:w-72 z-50 bg-[#0a0d14]/98 border border-[var(--accent)]/50 backdrop-blur-2xl shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(var(--accent-rgb),0.25)] p-2 font-mono animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Inner Mini Search */}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Janr nomini qidiring..."
              className="w-full bg-black/70 border border-white/20 pl-7 pr-6 py-1 text-[11px] text-white placeholder-white/40 focus:outline-none focus:border-[var(--accent)] font-mono"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div className="max-h-52 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-0.5">
            {/* System Presets */}
            {filteredPresets.map(preset => {
              const isSelected = selectedCategory.toLowerCase() === preset.id.toLowerCase();
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(preset.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-[11px] text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)] text-black font-black shadow-sm"
                      : "text-white/80 hover:bg-[var(--accent)]/15 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Icon size={12} className={isSelected ? "text-black" : "text-[var(--accent)]"} />
                    <span className="truncate">{preset.label}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 shrink-0 ${
                    isSelected ? "bg-black/30 text-black" : "bg-white/10 text-white/60"
                  }`}>
                    {preset.count}
                  </span>
                </button>
              );
            })}

            {/* Divider if genres exist */}
            {filteredGenres.length > 0 && filteredPresets.length > 0 && (
              <div className="my-1 border-t border-white/10" />
            )}

            {/* Musical Genres */}
            {filteredGenres.map(genre => {
              const isSelected = selectedCategory.toLowerCase() === genre.toLowerCase();
              const count = categoryCounts[genre] ?? categoryCounts[genre.toUpperCase()] ?? categoryCounts[genre.toLowerCase()] ?? 0;
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    onSelectCategory(genre);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-[11px] text-left transition-colors ${
                    isSelected
                      ? "bg-[var(--accent)] text-black font-black shadow-sm"
                      : "text-white/80 hover:bg-[var(--accent)]/15 hover:text-white"
                  }`}
                >
                  <span className="truncate uppercase pr-2 font-medium">{genre}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 shrink-0 ${
                    isSelected ? "bg-black/30 text-black" : "bg-white/10 text-white/60"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {filteredPresets.length === 0 && filteredGenres.length === 0 && (
              <div className="py-4 text-center text-[10px] text-white/40">
                Mos keluvchi janr topilmadi
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 mt-1 border-t border-white/10 flex items-center justify-between text-[9px] text-white/40">
            <span>{categories.length} ta kategoriya</span>
            {selectedCategory !== "All" && (
              <button
                type="button"
                onClick={() => {
                  onSelectCategory("All");
                  setIsOpen(false);
                  setSearch("");
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
  );
}
