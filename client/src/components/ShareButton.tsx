/**
 * ShareButton — a discreet share icon that uses the native Web Share API
 * when available (mobile / modern browsers) and falls back to clipboard copy.
 *
 * Props:
 *   url      – the URL to share (defaults to window.location.href)
 *   title    – optional share title
 *   className – extra classes for the button element
 *   size     – icon size in pixels (default 14)
 */

import { useState, useCallback } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  url?: string;
  title?: string;
  className?: string;
  size?: number;
  "aria-label"?: string;
}

export default function ShareButton({
  url,
  title,
  className = "",
  size = 14,
  "aria-label": ariaLabel = "Share",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    const target = url ?? window.location.href;
    const shareData: ShareData = { url: target, ...(title ? { title } : {}) };

    // Native share sheet (iOS / Android / some desktop)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(target);
    } catch {
      // Older browsers
      const el = document.createElement("textarea");
      el.value = target;
      el.style.cssText = "position:fixed;top:-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url, title]);

  return (
    <button
      onClick={share}
      aria-label={copied ? "Link copied!" : ariaLabel}
      title={copied ? "Link copied!" : "Share"}
      className={`transition-colors text-muted-foreground hover:text-foreground ${className}`}
    >
      {copied
        ? <Check style={{ width: size, height: size }} className="text-green-500" />
        : <Share2 style={{ width: size, height: size }} />
      }
    </button>
  );
}
