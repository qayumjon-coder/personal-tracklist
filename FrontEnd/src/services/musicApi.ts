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
 * Upload a new song with audio and cover files
 */
export async function uploadSong(
  title: string,
  artist: string,
  category: string,
  duration: number,
  audioFile: File,
  coverFile: File,
  lyrics?: string,
  uploadedBy?: string,
  uploaderFp?: string
): Promise<Song> {
  try {
    // Generate unique filenames and sanitize them
    const sanitizeFilename = (name: string) => name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

    const timestamp = Date.now();
    const cleanAudioName = sanitizeFilename(audioFile.name);
    const cleanCoverName = sanitizeFilename(coverFile.name);

    const audioFileName = `audio/${timestamp}-${cleanAudioName}`;
    const coverFileName = `covers/${timestamp}-${cleanCoverName}`;

    // Input sanitization for basic XSS protection
    const sanitizeHtml = (str: string) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTitle = sanitizeHtml(title.trim());
    const safeArtist = sanitizeHtml(artist.trim());
    const safeCategory = sanitizeHtml(category.trim());

    // Upload audio file
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

    // Upload cover file
    const { error: coverError } = await supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .upload(coverFileName, coverFile, {
        contentType: coverFile.type,
        upsert: false,
      });

    if (coverError) {
      console.error('Cover upload error:', coverError);
      // Cleanup: delete audio file if cover upload fails
      try {
        await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([audioFileName]);
      } catch(cleanupErr) {
        console.error('CRITICAL: Orphaned audio file could not be cleaned up!', cleanupErr, audioFileName);
      }
      throw new Error(`Cover Upload Failed: ${coverError.message}`);
    }

    // Get public URLs
    const { data: audioUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .getPublicUrl(audioFileName);

    const { data: coverUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .getPublicUrl(coverFileName);

    // Insert song metadata into database
    const { data: newSong, error: dbError } = await supabase
      .from(DB_TABLES.SONGS)
      .insert([
        {
          title: safeTitle,
          artist: safeArtist,
          category: safeCategory,
          url: audioUrlData.publicUrl,
          cover_url: coverUrlData.publicUrl,
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
      // Cleanup: delete uploaded files if database insert fails
      try {
        await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([audioFileName, coverFileName]);
      } catch(cleanupErr) {
        console.error('CRITICAL: Orphaned files could not be cleaned up!', cleanupErr, [audioFileName, coverFileName]);
      }
      throw new Error('Failed to save song to database');
    }

    return newSong;
  } catch (error) {
    console.error('Upload song error:', error);
    throw error;
  }
}

/**
 * Update song metadata and optionally the cover image
 */
export async function updateSong(
  id: number,
  updates: Partial<Omit<Song, 'id' | 'url' | 'cover_url' | 'created_at'>>,
  newCoverFile?: File
): Promise<Song> {
  let finalUpdates = { ...updates };

  if (newCoverFile) {
    // 1. Get old song data to find old cover path
    const { data: song } = await supabase
      .from(DB_TABLES.SONGS)
      .select('cover_url')
      .eq('id', id)
      .single();

    // 2. Upload new cover
    const timestamp = Date.now();
    const coverFileName = `covers/${timestamp}-${newCoverFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .upload(coverFileName, newCoverFile);

    if (uploadError) throw uploadError;

    // 3. Get new public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .getPublicUrl(coverFileName);

    // Add to updates
    (finalUpdates as any).cover_url = urlData.publicUrl;

    // 4. Delete old cover file if it exists
    if (song?.cover_url) {
      try {
        const urlObj = new URL(song.cover_url);
        const urlPath = urlObj.pathname;
        const bucketPathIndex = urlPath.indexOf(`/${STORAGE_BUCKETS.MUSIC_FILES}/`);
        if (bucketPathIndex !== -1) {
            const oldPath = urlPath.substring(bucketPathIndex + `/${STORAGE_BUCKETS.MUSIC_FILES}/`.length);
            if (oldPath) {
              const { error: deleteErr }  = await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([oldPath]);
              if (deleteErr) console.error('Failed to delete old cover internally:', deleteErr, oldPath);
            }
        }
      } catch (err) {
        console.warn('Failed to parse and delete old cover:', err);
      }
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

