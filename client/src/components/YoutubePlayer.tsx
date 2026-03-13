import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

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

export default function YoutubePlayer({ videoId, title, onUnavailable }: YoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBlocked(false);
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
          onError: (e: any) => {
            if (!cancelled) {
              if (e.data === 100) {
                // Video removed or private — hide entirely
                onUnavailable?.();
              } else if ([101, 150].includes(e.data)) {
                // Embedding disabled — show Watch on YouTube fallback
                setBlocked(true);
              }
            }
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

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (blocked) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden shadow-md bg-black relative flex items-center justify-center" data-testid="video-blocked-fallback">
        <img
          src={thumbnailUrl}
          alt={title ?? "Video thumbnail"}
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="relative z-10 text-center px-4">
          <p className="text-white text-sm font-medium mb-3">This video can't be played here due to the creator's settings.</p>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            data-testid="link-watch-youtube"
          >
            <ExternalLink className="w-4 h-4" />
            Watch on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`aspect-video rounded-lg overflow-hidden shadow-md bg-black transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-60"}`}
      ref={containerRef}
      data-testid="video-youtube-wrapper"
      style={{ width: "100%", minHeight: "200px" }}
    />
  );
}
