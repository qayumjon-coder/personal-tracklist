import { supabase, type Song } from '../lib/supabase';
import { DB_TABLES, STORAGE_BUCKETS } from '../utils/constants';

const PAGE_SIZE = 30;

/**
 * Fetch songs with pagination
 */
export async function getMusicList(page = 0, pageSize = PAGE_SIZE): Promise<Song[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching songs:', error);
    return [];
  }

  // Map snake_case to camelCase for frontend consistency
  return data.map((song: any) => ({
    ...song,
    coverUrl: song.cover_url // Ensure compatibility
  }));
}

// Search songs
export async function searchSongs(query: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select('*')
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
    .limit(50);

  if (error) {
    console.error('Error searching songs:', error);
    return [];
  }

  return data.map((song: any) => ({
    ...song,
    coverUrl: song.cover_url
  }));
}

// Fetch specific songs by IDs
export async function getSongsByIds(ids: number[]): Promise<Song[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('Error fetching playlist songs:', error);
    return [];
  }

  return data.map((song: any) => ({
    ...song,
    coverUrl: song.cover_url
  }));
}

/**
 * Upload a new song with audio and cover files or URLs
 */
export async function uploadSong(
  title: string,
  artist: string,
  category: string,
  duration: number,
  audioFile: File,
  cover: File | string,
  lyrics?: string,
  uploadedBy?: string,
  uploaderFp?: string
): Promise<Song> {
  let uploadedAudioPath: string | null = null;
  let uploadedCoverPath: string | null = null;

  try {
    // Generate unique filenames and sanitize them
    const sanitizeFilename = (name: string) => name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

    const timestamp = Date.now();
    const cleanAudioName = sanitizeFilename(audioFile.name);
    const audioFileName = `audio/${timestamp}-${cleanAudioName}`;

    // Input sanitization for basic XSS protection
    const sanitizeHtml = (str: string) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTitle = sanitizeHtml(title.trim());
    const safeArtist = sanitizeHtml(artist.trim());
    const safeCategory = sanitizeHtml(category.trim());

    // 1. Upload audio file
    const { error: audioError } = await supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .upload(audioFileName, audioFile, {
        contentType: audioFile.type,
        upsert: false,
      });

    if (audioError) {
      console.error('Audio upload error:', audioError);
      throw new Error(`Audio Upload Failed: ${audioError.message}`);
    }
    uploadedAudioPath = audioFileName;

    // 2. Handle cover image (File object or URL string)
    let finalCoverUrl = '';

    if (cover instanceof File) {
      const cleanCoverName = sanitizeFilename(cover.name || 'cover.jpg');
      const coverFileName = `covers/${timestamp}-${cleanCoverName}`;

      const { error: coverError } = await supabase.storage
        .from(STORAGE_BUCKETS.MUSIC_FILES)
        .upload(coverFileName, cover, {
          contentType: cover.type || 'image/jpeg',
          upsert: false,
        });

      if (coverError) {
        console.error('Cover upload error:', coverError);
        throw new Error(`Cover Upload Failed: ${coverError.message}`);
      }
      uploadedCoverPath = coverFileName;

      const { data: coverUrlData } = supabase.storage
        .from(STORAGE_BUCKETS.MUSIC_FILES)
        .getPublicUrl(coverFileName);

      finalCoverUrl = coverUrlData.publicUrl;
    } else if (typeof cover === 'string' && cover.trim()) {
      const trimmedUrl = cover.trim();
      finalCoverUrl = trimmedUrl;

      // Best effort: try downloading remote image to persist it in Supabase Storage
      try {
        let blob: Blob | null = null;
        try {
          const res = await fetch(trimmedUrl);
          if (res.ok) blob = await res.blob();
        } catch {
          // Try CORS image proxy
          try {
            const proxyRes = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(trimmedUrl)}&output=jpg`);
            if (proxyRes.ok) blob = await proxyRes.blob();
          } catch {
            // Ignore proxy failure
          }
        }

        if (blob && blob.size > 0) {
          const ext = blob.type.split('/')[1] || 'jpg';
          const coverFileName = `covers/${timestamp}-remote_cover.${ext}`;
          const { error: coverStorageErr } = await supabase.storage
            .from(STORAGE_BUCKETS.MUSIC_FILES)
            .upload(coverFileName, blob, {
              contentType: blob.type || 'image/jpeg',
              upsert: false,
            });

          if (!coverStorageErr) {
            uploadedCoverPath = coverFileName;
            const { data: coverUrlData } = supabase.storage
              .from(STORAGE_BUCKETS.MUSIC_FILES)
              .getPublicUrl(coverFileName);
            finalCoverUrl = coverUrlData.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Could not re-host remote cover in storage, using direct link:', err);
        finalCoverUrl = trimmedUrl;
      }
    } else {
      throw new Error('Cover file or URL is required');
    }

    // Get public audio URL
    const { data: audioUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .getPublicUrl(audioFileName);

    // 3. Insert song metadata into database
    const { data: newSong, error: dbError } = await supabase
      .from(DB_TABLES.SONGS)
      .insert([
        {
          title: safeTitle,
          artist: safeArtist,
          category: safeCategory || 'General',
          url: audioUrlData.publicUrl,
          cover_url: finalCoverUrl,
          duration,
          liked: false,
          lyrics: lyrics || '',
          uploaded_by: uploadedBy || 'Admin',
          uploader_fp: uploaderFp || null,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save song to database: ${dbError.message}`);
    }

    return newSong;
  } catch (error) {
    console.error('Upload song error:', error);
    // Cleanup any uploaded storage files
    const filesToRemove: string[] = [];
    if (uploadedAudioPath) filesToRemove.push(uploadedAudioPath);
    if (uploadedCoverPath) filesToRemove.push(uploadedCoverPath);
    if (filesToRemove.length > 0) {
      try {
        await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove(filesToRemove);
      } catch (cleanupErr) {
        console.error('Failed to cleanup orphaned storage files:', cleanupErr);
      }
    }
    throw error;
  }
}

/**
 * Update song metadata and optionally the cover image
 */
export async function updateSong(
  id: number,
  updates: Partial<Omit<Song, 'id' | 'url' | 'cover_url' | 'created_at'>> & { cover_url?: string },
  newCover?: File | string
): Promise<Song> {
  let finalUpdates = { ...updates };

  if (newCover) {
    if (newCover instanceof File) {
      // 1. Get old song data to find old cover path
      const { data: song } = await supabase
        .from(DB_TABLES.SONGS)
        .select('cover_url')
        .eq('id', id)
        .single();

      // 2. Upload new cover
      const timestamp = Date.now();
      const coverFileName = `covers/${timestamp}-${newCover.name}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.MUSIC_FILES)
        .upload(coverFileName, newCover);

      if (uploadError) throw uploadError;

      // 3. Get new public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.MUSIC_FILES)
        .getPublicUrl(coverFileName);

      // Add to updates
      (finalUpdates as any).cover_url = urlData.publicUrl;

      // 4. Delete old cover file if it exists in our storage
      if (song?.cover_url) {
        try {
          const urlObj = new URL(song.cover_url);
          const urlPath = urlObj.pathname;
          const bucketPathIndex = urlPath.indexOf(`/${STORAGE_BUCKETS.MUSIC_FILES}/`);
          if (bucketPathIndex !== -1) {
              const oldPath = urlPath.substring(bucketPathIndex + `/${STORAGE_BUCKETS.MUSIC_FILES}/`.length);
              if (oldPath) {
                const { error: deleteErr } = await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([oldPath]);
                if (deleteErr) console.error('Failed to delete old cover internally:', deleteErr, oldPath);
              }
          }
        } catch (err) {
          console.warn('Failed to parse and delete old cover:', err);
        }
      }
    } else if (typeof newCover === 'string' && newCover.trim()) {
      (finalUpdates as any).cover_url = newCover.trim();
    }
  }

  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .update(finalUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    throw new Error('Failed to update song');
  }

  return data;
}

/**
 * Delete a song and its associated files
 */
export async function deleteSong(id: number): Promise<void> {
  // First, get the song to retrieve file URLs
  const { data: song, error: fetchError } = await supabase
    .from(DB_TABLES.SONGS)
    .select('url, cover_url')
    .eq('id', id)
    .single();

  if (fetchError || !song) {
    throw new Error('Song not found');
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from(DB_TABLES.SONGS)
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error('Failed to delete song');
  }

  // Extract file paths from URLs and delete files from storage
  try {
    const parsePath = (urlString: string) => {
        if (!urlString) return null;
        try {
            const urlPath = new URL(urlString).pathname;
            const idx = urlPath.indexOf(`/${STORAGE_BUCKETS.MUSIC_FILES}/`);
            if (idx !== -1) return urlPath.substring(idx + `/${STORAGE_BUCKETS.MUSIC_FILES}/`.length);
        } catch(e) { /* ignore */ }
        return null;
    };

    const audioPath = parsePath(song.url);
    const coverPath = parsePath(song.cover_url);

    if (audioPath) {
      const {error} = await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([audioPath]);
      if(error) console.error("CRITICAL: Orphaned audio file", error, audioPath);
    }
    if (coverPath) {
      const {error} = await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([coverPath]);
      if(error) console.error("CRITICAL: Orphaned cover file", error, coverPath);
    }
  } catch (error) {
    // File deletion is best effort, don't fail the whole operation
    console.warn('Failed to delete files from storage:', error);
  }
}

/**
 * Increment the play count for a given song
 */
export async function incrementPlayCount(id: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_play_count', { row_id: id });
    if (error) {
       console.error('Failed to increment play count via RPC:', error);
    }
  } catch (error) {
    console.error('Failed to increment play count:', error);
  }
}

/**
 * Fetch top 10 most-played songs across the entire database
 */
export async function getTrendingSongs(limit = 10): Promise<Song[]> {
  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select('*')
    .order('play_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending songs:', error);
    return [];
  }

  return data.map((song: any) => ({
    ...song,
    coverUrl: song.cover_url,
  }));
}

