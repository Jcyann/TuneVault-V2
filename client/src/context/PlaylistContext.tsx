import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Tune } from "@shared/schema";

export type PlayMode = "shuffle" | "chronological";

interface PlaylistContextValue {
  playlist: Tune[];
  originalOrder: Tune[];
  currentIndex: number;
  isActive: boolean;
  playMode: PlayMode;
  startPlaylist: (tunes: Tune[], mode?: PlayMode) => void;
  enqueue: (tunes: Tune[]) => number;
  next: () => void;
  prev: () => void;
  setIndex: (i: number) => void;
  reshuffle: () => void;
  setPlayMode: (mode: PlayMode) => void;
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
  const [originalOrder, setOriginalOrder] = useState<Tune[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playMode, setPlayModeState] = useState<PlayMode>("shuffle");

  const startPlaylist = useCallback((tunes: Tune[], mode: PlayMode = "shuffle") => {
    const withAudio = tunes.filter((t) => t.audioUrl || t.locItemId);
    if (withAudio.length === 0) return;
    setOriginalOrder(withAudio);
    setPlayModeState(mode);
    setPlaylist(mode === "shuffle" ? shuffle(withAudio) : [...withAudio]);
    setCurrentIndex(0);
  }, []);

  const enqueue = useCallback((tunes: Tune[]) => {
    const withAudio = tunes.filter((t) => t.audioUrl || t.locItemId);
    if (withAudio.length === 0) return 0;
    let added = 0;
    setPlaylist((p) => {
      if (p.length === 0) {
        setOriginalOrder(withAudio);
        setPlayModeState("chronological");
        setCurrentIndex(0);
        added = withAudio.length;
        return [...withAudio];
      }
      const existing = new Set(p.map((t) => t.id));
      const fresh = withAudio.filter((t) => !existing.has(t.id));
      added = fresh.length;
      if (fresh.length === 0) return p;
      setOriginalOrder((o) => [...o, ...fresh]);
      return [...p, ...fresh];
    });
    return added;
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

  const setPlayMode = useCallback((mode: PlayMode) => {
    setPlayModeState(mode);
    setCurrentIndex(0);
    setPlaylist(mode === "shuffle" ? shuffle(originalOrder) : [...originalOrder]);
  }, [originalOrder]);

  const dismiss = useCallback(() => {
    setPlaylist([]);
    setOriginalOrder([]);
    setCurrentIndex(0);
  }, []);

  return (
    <PlaylistContext.Provider
      value={{
        playlist,
        originalOrder,
        currentIndex,
        isActive: playlist.length > 0,
        playMode,
        startPlaylist,
        enqueue,
        next,
        prev,
        setIndex: setCurrentIndex,
        reshuffle,
        setPlayMode,
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
