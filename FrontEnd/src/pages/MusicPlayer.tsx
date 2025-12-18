import { useEffect, useState } from "react";
import { getMusicList } from "../services/musicApi";

interface Music {
  id: number;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

export default function MusicPlayer() {
  const [musicList, setMusicList] = useState<Music[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMusicList()
      .then((data) => {
        setMusicList(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Music List</h2>
      {musicList.map((music) => (
        <div key={music.id}>
          <img src={music.cover} width={80} />
          <p>{music.title}</p>
          <p>{music.artist}</p>

          {/* Audio player */}
          <audio controls src={music.url}></audio>
        </div>
      ))}
    </div>
  );
}
