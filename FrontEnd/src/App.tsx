import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Player } from "./components/Player";
import { Settings } from "./components/Settings";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import MusicEditor from "./pages/MusicEditor";
import { usePlaylist } from "./hooks/usePlaylist";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { LoadingScreen } from "./components/LoadingScreen";
import { useEffect } from "react";

function MusicApp() {
  const { playlist, loading, addToPlaylist, removeFromPlaylist, removeMultipleFromPlaylist } = usePlaylist();
  const player = useAudioPlayer(playlist);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showBoot, setShowBoot] = useState(true);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowBoot(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (showBoot) return <LoadingScreen />;

  return (
      <Router>
        <div className="w-full min-h-screen flex items-start justify-center p-2 py-12 md:py-0 relative overflow-y-auto">
          <div className="retro-grid" />
          <div className="scanline" />
          <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          <Routes>
            <Route path="/" element={
              <Player 
                songs={playlist} 
                loading={loading} 
                player={player} 
                onOpenSettings={() => setIsSettingsOpen(true)}
                onAddToPlaylist={addToPlaylist}
                onRemoveFromPlaylist={removeFromPlaylist}
                onBulkRemove={removeMultipleFromPlaylist}
              />
            } />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/editor" element={<ProtectedRoute><MusicEditor /></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <MusicApp />
      </SettingsProvider>
    </AuthProvider>
  );
}
