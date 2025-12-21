import { supabase, type Song } from '../lib/supabase';

/**
 * Fetch all songs from Supabase database
 */
// Fetch all songs
export async function getMusicList(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false });

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
    .from('songs')
    .select('*')
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
    .limit(20);

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
    .from('songs')
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
  coverFile: File
): Promise<Song> {
  try {
    // Generate unique filenames and sanitize them
    const sanitizeFilename = (name: string) => name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

    const timestamp = Date.now();
    const cleanAudioName = sanitizeFilename(audioFile.name);
    const cleanCoverName = sanitizeFilename(coverFile.name);

    const audioFileName = `audio/${timestamp}-${cleanAudioName}`;
    const coverFileName = `covers/${timestamp}-${cleanCoverName}`;

    // Upload audio file
    const { error: audioError } = await supabase.storage
      .from('music-files')
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
      .from('music-files')
      .upload(coverFileName, coverFile, {
        contentType: coverFile.type,
        upsert: false,
      });

    if (coverError) {
      console.error('Cover upload error:', coverError);
      // Cleanup: delete audio file if cover upload fails
      await supabase.storage.from('music-files').remove([audioFileName]);
      throw new Error(`Cover Upload Failed: ${coverError.message}`);
    }

    // Get public URLs
    const { data: audioUrlData } = supabase.storage
      .from('music-files')
      .getPublicUrl(audioFileName);

    const { data: coverUrlData } = supabase.storage
      .from('music-files')
      .getPublicUrl(coverFileName);

    // Insert song metadata into database
    const { data: newSong, error: dbError } = await supabase
      .from('songs')
      .insert([
        {
          title,
          artist,
          category,
          url: audioUrlData.publicUrl,
          cover_url: coverUrlData.publicUrl,
          duration,
          liked: false,
          lyrics: '',
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Cleanup: delete uploaded files if database insert fails
      await supabase.storage.from('music-files').remove([audioFileName, coverFileName]);
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
      .from('songs')
      .select('cover_url')
      .eq('id', id)
      .single();

    // 2. Upload new cover
    const timestamp = Date.now();
    const coverFileName = `covers/${timestamp}-${newCoverFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from('music-files')
      .upload(coverFileName, newCoverFile);

    if (uploadError) throw uploadError;

    // 3. Get new public URL
    const { data: urlData } = supabase.storage
      .from('music-files')
      .getPublicUrl(coverFileName);

    // Add to updates
    (finalUpdates as any).cover_url = urlData.publicUrl;

    // 4. Delete old cover file if it exists
    if (song?.cover_url) {
      try {
        const oldPath = song.cover_url.split('/music-files/')[1];
        if (oldPath) {
          await supabase.storage.from('music-files').remove([oldPath]);
        }
      } catch (err) {
        console.warn('Failed to delete old cover:', err);
      }
    }
  }

  const { data, error } = await supabase
    .from('songs')
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
    .from('songs')
    .select('url, cover_url')
    .eq('id', id)
    .single();

  if (fetchError || !song) {
    throw new Error('Song not found');
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('songs')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Delete error:', deleteError);
    throw new Error('Failed to delete song');
  }

  // Extract file paths from URLs and delete files from storage
  try {
    const audioPath = song.url.split('/music-files/')[1];
    const coverPath = song.cover_url.split('/music-files/')[1];

    if (audioPath) {
      await supabase.storage.from('music-files').remove([audioPath]);
    }
    if (coverPath) {
      await supabase.storage.from('music-files').remove([coverPath]);
    }
  } catch (error) {
    // File deletion is best effort, don't fail the whole operation
    console.warn('Failed to delete files from storage:', error);
  }
}
