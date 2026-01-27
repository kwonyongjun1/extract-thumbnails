import React, { useEffect, useMemo, useRef } from "react";
import Hls from "hls.js";

export type MediaType = "mp4" | "hls" | "auto";

export type MediaPlayerProps = {
  src: string | null;                 // media URL (mp4 or m3u8)
  type?: MediaType;                   // default: auto (detect by extension/mime hint)
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
  poster?: string;

  // callbacks
  onReady?: () => void;               // fired when playback is ready enough
  onError?: (err: unknown) => void;
  onTimeUpdate?: (currentTimeSec: number) => void;

  // styling
  className?: string;
  style?: React.CSSProperties;
};

function detectType(src: string): MediaType {
  const s = src.toLowerCase();
  if (s.includes(".m3u8")) return "hls";
  if (s.includes(".mp4")) return "mp4";
  return "auto";
}

function MediaPlayer({
  src,
  type = "auto",
  autoPlay = false,
  muted = false,
  controls = true,
  playsInline = true,
  preload = "metadata",
  poster,
  onReady,
  onError,
  onTimeUpdate,
  className,
  style,
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const resolvedType = useMemo(() => {
    if (!src) return "auto" as MediaType;
    if (type !== "auto") return type;
    return detectType(src);
  }, [src, type]);

  // Helper: cleanup HLS instance
  const destroyHls = () => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {
        // ignore
      }
      hlsRef.current = null;
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // reset previous state
    destroyHls();
    video.removeAttribute("src");
    video.load();

    if (!src) return;

    // Common "ready" signal
    const handleCanPlay = () => onReady?.();
    const handleError = () => onError?.(video.error ?? new Error("Video error"));
    const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("timeupdate", handleTimeUpdate);

    const cleanupEvents = () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };

    const attachMp4 = () => {
      destroyHls();
      video.src = src;
    };

    const attachHls = () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        destroyHls();
        video.src = src;
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data?.fatal) onError?.(data);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          onReady?.();
        });

        hls.loadSource(src);
        hls.attachMedia(video);
        return;
      }

      onError?.(new Error("HLS not supported in this browser"));
    };

    if (resolvedType === "mp4") {
      attachMp4();
    } else if (resolvedType === "hls") {
      attachHls();
    } else {
      const guessed = detectType(src);
      if (guessed === "hls") attachHls();
      else attachMp4();
    }

    return () => {
      cleanupEvents();
      destroyHls();
    };
  }, [src, resolvedType]);

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      poster={poster}
      width="100%"
      height="100%"
    />
  );
}

export default MediaPlayer;
