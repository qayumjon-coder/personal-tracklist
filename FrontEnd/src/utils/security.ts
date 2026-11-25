import { UPLOAD_LIMITS } from './constants';

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/webm',
]);

export const ALLOWED_AUDIO_EXTENSIONS = /\.(mp3|wav|flac|ogg|m4a|aac|webm)$/i;

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * Validate an uploaded audio file for size and format.
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > UPLOAD_LIMITS.MAX_AUDIO_MB) {
    return {
      valid: false,
      error: `Audio file is too big (${sizeMB.toFixed(2)} MB). Max limit is ${UPLOAD_LIMITS.MAX_AUDIO_MB}MB.`,
    };
  }
  const hasValidMime = file.type ? ALLOWED_AUDIO_MIME_TYPES.has(file.type.toLowerCase()) : false;
  const hasValidExt = ALLOWED_AUDIO_EXTENSIONS.test(file.name);
  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported audio format. Allowed: MP3, WAV, FLAC, OGG, M4A, AAC.',
    };
  }
  return { valid: true };
}

/**
 * Validate an uploaded cover image file for size and safe raster MIME type (blocks SVG/HTML).
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > UPLOAD_LIMITS.MAX_COVER_MB) {
    return {
      valid: false,
      error: `Cover image is too big (${sizeMB.toFixed(2)} MB). Max limit is ${UPLOAD_LIMITS.MAX_COVER_MB}MB.`,
    };
  }
  const mime = file.type?.toLowerCase() || '';
  if (mime === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return {
      valid: false,
      error: 'SVG images are not permitted for security reasons. Use JPG, PNG, or WEBP.',
    };
  }
  const hasValidMime = mime ? ALLOWED_IMAGE_MIME_TYPES.has(mime) : false;
  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.test(file.name);
  if (!hasValidMime && (!mime && hasValidExt) === false) {
    return {
      valid: false,
      error: 'Unsupported image format. Allowed: JPG, PNG, WEBP, GIF, AVIF.',
    };
  }
  return { valid: true };
}

/**
 * Check whether a URL is a safe media/cover URL (http:, https:, or app-relative /path).
 */
export function sanitizeMediaUrl(url?: string | null, allowBlob = false): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  if (allowBlob && trimmed.startsWith('blob:')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Returns true if the URL uses https: and does not target localhost or private IP ranges.
 */
export function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely format a CSS url("...") value after scheme validation and quote escaping.
 */
export function sanitizeCssUrl(url?: string | null): string | null {
  const safe = sanitizeMediaUrl(url, true);
  if (!safe) return null;
  const escaped = safe.replace(/["'()\\\n\r]/g, '');
  return `url("${escaped}")`;
}

/**
 * Sanitize storage filenames, preserving extension and falling back cleanly on non-ASCII names.
 */
export function sanitizeFilename(name: string, fallback = 'file'): string {
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx > 0 ? name.slice(dotIdx).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() : '';
  const base = (dotIdx > 0 ? name.slice(0, dotIdx) : name)
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return `${base || fallback}${ext}`;
}

/**
 * Neutralize spreadsheet formula injection and properly quote CSV cells.
 */
export function escapeCsvCell(value: unknown): string {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Strip CR/LF control characters to prevent M3U directive injection.
 */
export function sanitizeM3uLine(value?: string | null): string {
  return (value || '').replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Strictly validate Spotify / SoundCloud import URLs by parsed hostname over HTTPS.
 */
export function isTrustedMusicDomain(url: string, provider: 'spotify' | 'soundcloud'): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (provider === 'spotify') {
      return (host === 'open.spotify.com' || host === 'spotify.com') && parsed.pathname.includes('/track/');
    }
    return (
      host === 'soundcloud.com' ||
      host === 'www.soundcloud.com' ||
      host === 'm.soundcloud.com' ||
      host === 'on.soundcloud.com'
    ) && parsed.pathname.length > 1;
  } catch {
    return false;
  }
}
