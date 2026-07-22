export interface Song {
  id: number;
  title: string;
  artist: string;
  url: string;
  cover_url: string; // Supabase uses snake_case
  coverUrl?: string; // Alias for compatibility
  duration: number;
  category: string;
  liked?: boolean;
  lyrics?: string;
  play_count?: number;
  created_at?: string;
  uploaded_by?: string;
  uploader_fp?: string;
}
