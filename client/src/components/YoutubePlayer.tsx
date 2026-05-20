import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let _apiLoaded = false;
let _apiReady = false;
const _readyQueue: (() => void)[] = [];

function loadYTApi(onReady: () => void) {
  if (_apiReady) { onReady(); return; }
  _readyQueue.push(onReady);
  if (!_apiLoaded) {
    _apiLoaded = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      _apiReady = true;
      if (prev) prev();
      _readyQueue.forEach((cb) => cb());
      _readyQueue.length = 0;
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  }
}

interface YoutubePlayerProps {
  videoId: string;
  title?: string;
  onUnavailable?: () => void;
}

export default function YoutubePlayer({ videoId, onUnavailable }: YoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    loadYTApi(() => {
      if (cancelled || !containerRef.current) return;

      const div = document.createElement("div");
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1 },
        events: {
          onReady: () => { if (!cancelled) setReady(true); },
          onStateChange: (e: any) => {
            // YT.PlayerState.PLAYING === 1 — pause the global audio player so they don't overlap
            if (e?.data === 1) {
              window.dispatchEvent(new CustomEvent("tunevault:pause-audio"));
            }
          },
          onError: () => {
            if (!cancelled) onUnavailable?.();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [videoId]);

  return (
    <div
      className={`aspect-video rounded-lg overflow-hidden shadow-md bg-black transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-60"}`}
      ref={containerRef}
      data-testid="video-youtube-wrapper"
      style={{ width: "100%", minHeight: "200px" }}
    />
  );
}
