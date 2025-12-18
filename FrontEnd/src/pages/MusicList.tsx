import { useEffect, useState } from "react";
import { getMusicList } from "../services/musicApi";

interface Music {
  id: number;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

export default function MusicList() {
  const [list, setList] = useState<Music[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMusicList().then((data) => {
      setList(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Music List</h1>

      {list.map((music) => (
        <div key={music.id} style={{ marginBottom: "20px" }}>
          <img src={music.cover} width={100} />
          <h3>{music.title}</h3>
          <p>{music.artist}</p>

          <audio controls src={music.url}></audio>
        </div>
      ))}
    </div>
  );
}
