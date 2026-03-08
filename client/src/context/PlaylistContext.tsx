import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Tune } from "@shared/schema";

interface PlaylistContextValue {
  playlist: Tune[];
  currentIndex: number;
  isActive: boolean;
  startPlaylist: (tunes: Tune[]) => void;
  next: () => void;
  prev: () => void;
  setIndex: (i: number) => void;
  reshuffle: () => void;
  dismiss: () => void;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<Tune[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const startPlaylist = useCallback((tunes: Tune[]) => {
    const withAudio = tunes.filter((t) => t.audioUrl || t.locItemId);
    if (withAudio.length === 0) return;
    setPlaylist(shuffle(withAudio));
    setCurrentIndex(0);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % playlist.length);
  }, [playlist.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const reshuffle = useCallback(() => {
    setPlaylist((p) => shuffle(p));
    setCurrentIndex(0);
  }, []);

  const dismiss = useCallback(() => {
    setPlaylist([]);
    setCurrentIndex(0);
  }, []);

  return (
    <PlaylistContext.Provider
      value={{
        playlist,
        currentIndex,
        isActive: playlist.length > 0,
        startPlaylist,
        next,
        prev,
        setIndex: setCurrentIndex,
        reshuffle,
        dismiss,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
  return ctx;
}
