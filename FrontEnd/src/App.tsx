import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Player } from "./components/Player";
import { Settings } from "./components/Settings";
import { Upload } from "./pages/Upload";
import { AdminLogin } from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import { NotFound } from "./pages/NotFound";
import { usePlaylist } from "./hooks/usePlaylist";
import { useLocalFiles } from "./hooks/useLocalFiles";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Analytics } from "@vercel/analytics/react"
import { LoadingScreen } from "./components/LoadingScreen";
import { useEffect } from "react";
import { HelmetProvider } from 'react-helmet-async';

import { Toaster } from "sonner";

function MusicApp() {
  const { playlist, loading, error, addToPlaylist, removeFromPlaylist, removeMultipleFromPlaylist, reorderPlaylist } = usePlaylist();
  const { localSongs, isScanning, hasStoredHandle, requestAccess, restoreAccess, removeLocalFiles, removeLocalFile, error: localError } = useLocalFiles();
  
  // Combine both sources
  const combinedSongs = [...playlist, ...localSongs];
  const player = useAudioPlayer(combinedSongs);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showBoot, setShowBoot] = useState(true);

  // Auto-play from URL ?track=ID
  useEffect(() => {
    if (!loading && !isScanning && combinedSongs.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get('track');
      if (trackId) {
        const id = parseInt(trackId, 10);
        const idx = combinedSongs.findIndex(s => s.id === id);
        if (idx !== -1 && player.index !== idx) {
          player.selectSong(idx);
          // Optional: Remove query from URL so refresh doesn't loop
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [loading, isScanning, combinedSongs.length]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowBoot(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const handleRemoveFromPlaylist = (id: number) => {
    if (id < 0) {
       removeLocalFile(id);
    } else {
       removeFromPlaylist(id);
    }
  };

  const handleBulkRemove = (ids: number[]) => {
    const localIds = ids.filter(id => id < 0);
    const globalIds = ids.filter(id => id > 0);
    localIds.forEach(removeLocalFile);
    if (globalIds.length > 0) {
       removeMultipleFromPlaylist(globalIds);
    }
  };

  if (showBoot) return <LoadingScreen />;

  return (
      <Router>
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: 'rgba(0, 0, 0, 0.8)', border: '1px solid rgba(var(--accent-rgb), 0.2)', color: 'white', backdropFilter: 'blur(10px)' } }} />
        <div className="w-full min-h-screen flex items-start justify-center p-2 py-12 md:py-0 relative">
          <div className="retro-grid" />
          <div className="scanline" />
          <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          <Routes>
            <Route path="/" element={
              <Player 
                songs={combinedSongs} 
                loading={loading}
                error={error || localError}
                player={player} 
                onOpenSettings={() => setIsSettingsOpen(true)}
                onAddToPlaylist={addToPlaylist}
                onRemoveFromPlaylist={handleRemoveFromPlaylist}
                onBulkRemove={handleBulkRemove}
                onReorderPlaylist={reorderPlaylist}
                localFilesInfo={{
                  requestAccess,
                  restoreAccess,
                  removeLocalFiles,
                  hasStoredHandle,
                  isScanning,
                  error: localError
                }}
              />
            } />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <HelmetProvider>
          <MusicApp />
          <Analytics 
            debug={true} 
            mode={import.meta.env.MODE === 'development' ? 'development' : 'production'} 
          />
        </HelmetProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
