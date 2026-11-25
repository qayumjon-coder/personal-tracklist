import { supabase, type Song } from '../lib/supabase';
import { DB_TABLES, STORAGE_BUCKETS, UPLOAD_LIMITS } from '../utils/constants';
import {
  validateAudioFile,
  validateImageFile,
  sanitizeMediaUrl,
  isPublicHttpsUrl,
  sanitizeFilename,
} from '../utils/security';

const PAGE_SIZE = 30;
// Public projections exclude sensitive uploader_fp tracking identifier
const PUBLIC_SONG_COLUMNS =
  'id, title, artist, category, url, cover_url, duration, liked, lyrics, play_count, created_at, uploaded_by';

function mapSong(song: any): Song {
  return {
    ...song,
    url: sanitizeMediaUrl(song.url) || song.url,
    coverUrl: sanitizeMediaUrl(song.cover_url) || '/default-cover.png',
    cover_url: sanitizeMediaUrl(song.cover_url) || '/default-cover.png',
  };
}

/**
 * Fetch songs with pagination (public safe columns)
 */
export async function getMusicList(page = 0, pageSize = PAGE_SIZE): Promise<Song[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select(PUBLIC_SONG_COLUMNS)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching songs:', error);
    return [];
  }

  return data.map(mapSong);
}

/**
 * Fetch all songs from database (public safe columns)
 */
export async function getAllSongs(orderBy = 'created_at', ascending = false): Promise<Song[]> {
  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select(PUBLIC_SONG_COLUMNS)
    .order(orderBy, { ascending });

  if (error) {
    console.error('Error fetching all songs:', error);
    return [];
  }

  return data.map(mapSong);
}

/**
 * Fetch all songs including uploader metadata for authenticated Admin panel
 */
export async function getAdminSongs(orderBy = 'created_at', ascending = false): Promise<Song[]> {
  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select('*')
    .order(orderBy, { ascending });

  if (error) {
    console.error('Error fetching admin songs:', error);
    return [];
  }

  return data.map(mapSong);
}

// Search songs (PostgREST syntax injection safe)
export async function searchSongs(query: string): Promise<Song[]> {
  const cleanQuery = query.replace(/[,.()*%]/g, ' ').trim();
  if (!cleanQuery) return [];

  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select(PUBLIC_SONG_COLUMNS)
    .or(`title.ilike.%${cleanQuery}%,artist.ilike.%${cleanQuery}%`)
    .limit(50);

  if (error) {
    console.error('Error searching songs:', error);
    return [];
  }

  return data.map(mapSong);
}

// Fetch specific songs by IDs
export async function getSongsByIds(ids: number[]): Promise<Song[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select(PUBLIC_SONG_COLUMNS)
    .in('id', ids);

  if (error) {
    console.error('Error fetching playlist songs:', error);
    return [];
  }

  return data.map(mapSong);
}

/**
 * Check if a guest uploader still has quota left (admins are exempt).
 */
async function ensureGuestUploadAllowed(uploaderFp?: string): Promise<void> {
  if (!uploaderFp || uploaderFp === 'admin') return;

  const { count, error } = await supabase
    .from(DB_TABLES.SONGS)
    .select('id', { count: 'exact', head: true })
    .eq('uploader_fp', uploaderFp);

  if (!error && typeof count === 'number' && count >= UPLOAD_LIMITS.MAX_SONGS_PER_GUEST) {
    throw new Error(`Upload limit reached (${UPLOAD_LIMITS.MAX_SONGS_PER_GUEST} tracks max per guest).`);
  }
}

/**
 * Upload a new song with validated audio and cover files or URLs
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
    // Enforce central validation rules
    const audioCheck = validateAudioFile(audioFile);
    if (!audioCheck.valid) {
      throw new Error(audioCheck.error);
    }

    if (cover instanceof File) {
      const imageCheck = validateImageFile(cover);
      if (!imageCheck.valid) {
        throw new Error(imageCheck.error);
      }
    }

    await ensureGuestUploadAllowed(uploaderFp);

    const timestamp = Date.now();
    const cleanAudioName = sanitizeFilename(audioFile.name, 'track');
    const audioFileName = `audio/${timestamp}-${cleanAudioName}`;

    // Store clean trimmed text — React handles JSX escaping natively
    const safeTitle = title.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120);
    const safeArtist = artist.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120);
    const safeCategory = category.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120);

    // 1. Upload audio file
    const { error: audioError } = await supabase.storage
      .from(STORAGE_BUCKETS.MUSIC_FILES)
      .upload(audioFileName, audioFile, {
        contentType: audioFile.type || 'audio/mpeg',
        upsert: false,
      });

    if (audioError) {
      console.error('Audio upload error:', audioError);
      throw new Error(`Audio Upload Failed: ${audioError.message}`);
    }
    uploadedAudioPath = audioFileName;

    // 2. Handle cover image (File object or validated URL string)
    let finalCoverUrl = '';

    if (cover instanceof File) {
      const cleanCoverName = sanitizeFilename(cover.name || 'cover.jpg', 'cover');
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
      const safeCoverUrl = sanitizeMediaUrl(cover.trim());
      if (!safeCoverUrl) {
        throw new Error('Invalid cover URL scheme. Only http(s) or app-relative paths allowed.');
      }
      finalCoverUrl = safeCoverUrl;

      // Best effort: download public HTTPS remote image to persist in Supabase Storage
      if (isPublicHttpsUrl(safeCoverUrl)) {
        try {
          let blob: Blob | null = null;
          try {
            const res = await fetch(safeCoverUrl);
            if (res.ok) blob = await res.blob();
          } catch {
            try {
              const proxyRes = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(safeCoverUrl)}&output=jpg`);
              if (proxyRes.ok) blob = await proxyRes.blob();
            } catch {
              // Ignore proxy failure
            }
          }

          if (
            blob &&
            blob.size > 0 &&
            blob.size <= UPLOAD_LIMITS.MAX_COVER_MB * 1024 * 1024 &&
            blob.type.startsWith('image/') &&
            blob.type !== 'image/svg+xml'
          ) {
            const rawExt = blob.type.split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'jpg';
            const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;
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
          finalCoverUrl = safeCoverUrl;
        }
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
          duration: isFinite(duration) ? duration : 0,
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

    return mapSong(newSong);
  } catch (error) {
    console.error('Upload song error:', error);
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
  const finalUpdates = { ...updates };

  if (finalUpdates.cover_url) {
    const safeUrl = sanitizeMediaUrl(finalUpdates.cover_url);
    if (!safeUrl) throw new Error('Invalid cover URL scheme');
    finalUpdates.cover_url = safeUrl;
  }

  if (newCover) {
    if (newCover instanceof File) {
      const imageCheck = validateImageFile(newCover);
      if (!imageCheck.valid) {
        throw new Error(imageCheck.error);
      }

      // 1. Get old song data to find old cover path
      const { data: song } = await supabase
        .from(DB_TABLES.SONGS)
        .select('cover_url')
        .eq('id', id)
        .single();

      // 2. Upload new cover with sanitized filename
      const timestamp = Date.now();
      const cleanCoverName = sanitizeFilename(newCover.name || 'cover.jpg', 'cover');
      const coverFileName = `covers/${timestamp}-${cleanCoverName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.MUSIC_FILES)
        .upload(coverFileName, newCover, {
          contentType: newCover.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Get new public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.MUSIC_FILES)
        .getPublicUrl(coverFileName);

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
      const safeUrl = sanitizeMediaUrl(newCover.trim());
      if (!safeUrl) throw new Error('Invalid cover URL scheme');
      (finalUpdates as any).cover_url = safeUrl;
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

  return mapSong(data);
}

/**
 * Delete a song and its associated files
 */
export async function deleteSong(id: number): Promise<void> {
  const { data: song, error: fetchError } = await supabase
    .from(DB_TABLES.SONGS)
    .select('url, cover_url')
    .eq('id', id)
    .single();

  if (fetchError || !song) {
    throw new Error('Song not found');
  }

  const { error: deleteError } = await supabase
    .from(DB_TABLES.SONGS)
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error('Failed to delete song');
  }

  try {
    const parsePath = (urlString: string) => {
      if (!urlString) return null;
      try {
        const urlPath = new URL(urlString).pathname;
        const idx = urlPath.indexOf(`/${STORAGE_BUCKETS.MUSIC_FILES}/`);
        if (idx !== -1) return urlPath.substring(idx + `/${STORAGE_BUCKETS.MUSIC_FILES}/`.length);
      } catch { /* ignore */ }
      return null;
    };

    const audioPath = parsePath(song.url);
    const coverPath = parsePath(song.cover_url);

    if (audioPath) {
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([audioPath]);
      if (error) console.error('CRITICAL: Orphaned audio file', error, audioPath);
    }
    if (coverPath) {
      const { error } = await supabase.storage.from(STORAGE_BUCKETS.MUSIC_FILES).remove([coverPath]);
      if (error) console.error('CRITICAL: Orphaned cover file', error, coverPath);
    }
  } catch (error) {
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
    .select(PUBLIC_SONG_COLUMNS)
    .order('play_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching trending songs:', error);
    return [];
  }

  return data.map(mapSong);
}
