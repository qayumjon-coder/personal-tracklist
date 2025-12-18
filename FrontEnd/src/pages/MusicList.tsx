import { useEffect, useState } from "react";
import { getMusicList } from "../services/musicApi";
import type { Song } from "../types/Song";

export default function MusicList() {
  const [list, setList] = useState<Song[]>([]);
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
          <img src={music.cover_url} width={100} />
          <h3>{music.title}</h3>
          <p>{music.artist}</p>

          <audio controls src={music.url}></audio>
        </div>
      ))}
    </div>
  );
}
