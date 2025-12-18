interface TrackInfoProps {
  title: string;
  artist: string;
  coverUrl?: string;
}

export function TrackInfo({ title, artist, coverUrl }: TrackInfoProps) {
  return (
    <div className="mb-5">
      {/* Cover Image (optional, if you want to show it here) */}
      {coverUrl && (
        <img
          src={coverUrl}
          alt={`${title} cover`}
          className="w-full h-80 object-cover rounded-2xl shadow-xl mb-6 
                      transition-transform hover:scale-[1.02]"
        />
      )}

      {/* Track Title */}
      <h2 className="text-2xl font-bold text-white mb-1 truncate">
        {title}
      </h2>

      {/* Artist Name */}
      <p className="text-gray-400 text-lg truncate">{artist}</p>
    </div>
  );
}
