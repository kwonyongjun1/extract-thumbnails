import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
    videoSrc?: string;
    poster?: string;
    /**
     * 서버 썸네일로 교체:
     * (tSec) => `/api/thumb?sec=${Math.floor(tSec)}`
     */
    thumbnailUrlForTime?: (timeSec: number) => string;
};

const SAMPLE_VIDEO =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function formatTime(sec: number) {
    if (!Number.isFinite(sec)) return "0:00";
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
    return `${m}:${String(r).padStart(2, "0")}:${String(r).padStart(2, "0")}`.replace(
        /^(\d+):(\d\d):(\d\d)$/,
        "$1:$3"
    ); // safety (keeps m:ss)
}

// 샘플용(서버 없이) 가짜 썸네일 생성
function makeFakeThumbnailDataUrl(timeSec: number, w = 160, h = 90) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const hue = Math.floor((timeSec * 23) % 360);
    ctx.fillStyle = `hsl(${hue} 60% 34%)`;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 6) * i);
        ctx.lineTo(w, (h / 6) * i);
        ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTime(timeSec), w / 2, h / 2);

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "600 12px ui-sans-serif, system-ui";
    ctx.textAlign = "left";
    ctx.fillText("Preview", 10, h - 11);

    return canvas.toDataURL("image/png");
}

export default function YouTubeFilmstripPlayer_Final({
    videoSrc = SAMPLE_VIDEO,
    poster,
    thumbnailUrlForTime,
}: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);

    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // filmstrip 모드(버튼/시크바 클릭으로만)
    const [filmOpen, setFilmOpen] = useState(false);

    // filmstrip 기준 시간(= 드래그/시크바로 이동)
    const [previewTime, setPreviewTime] = useState(0);
    const previewTimeRef = useRef(0);
    useEffect(() => {
        previewTimeRef.current = previewTime;
    }, [previewTime]);
    const [selectedThumbnailTime, setSelectedThumbnailTime] = useState<number | null>(null);

    // ===== Filmstrip UI/드래그(유튜브 느낌) =====
    const filmCount = 9; // 보이는 썸네일 개수
    const filmStepSec = 1; // 한 칸 이동 시 시간(서버 썸네일 촘촘하면 1 권장)
    const thumbW = 120; // 사이드 썸네일 폭
    const centerW = 160; // 가운데 썸네일 폭
    const gap = 6;

    // 드래그 상태
    const filmDraggingRef = useRef(false);
    const filmLastXRef = useRef(0);
    const filmAccumDxRef = useRef(0); // translate 누적(스냅용)
    const filmTotalDxRef = useRef(0); // 클릭 판별용 총 이동량
    const filmDownTimeRef = useRef<number | null>(null);

    const [filmTranslatePx, setFilmTranslatePx] = useState(0);

    // rAF로 translate 렌더링 부담 줄이기
    const rafRef = useRef<number | null>(null);
    const pendingTranslateRef = useRef(0);
    function setTranslateRaf(px: number) {
        pendingTranslateRef.current = px;
        if (rafRef.current != null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            setFilmTranslatePx(pendingTranslateRef.current);
        });
    }

    // ===== Seekbar 드래그 =====
    const barDraggingRef = useRef(false);

    const progressPct = useMemo(() => {
        if (!duration) return 0;
        return clamp((current / duration) * 100, 0, 100);
    }, [current, duration]);

    function getBarRect() {
        const el = barRef.current;
        return el ? el.getBoundingClientRect() : null;
    }

    function timeFromClientX(clientX: number) {
        const rect = getBarRect();
        if (!rect || duration <= 0) return 0;
        const x = clamp(clientX - rect.left, 0, rect.width);
        return (x / rect.width) * duration;
    }

    function getThumbnail(timeSec: number) {
        const bucket = Math.floor(timeSec);
        return thumbnailUrlForTime
            ? thumbnailUrlForTime(bucket)
            : makeFakeThumbnailDataUrl(bucket);
    }

    function seekTo(timeSec: number) {
        const v = videoRef.current;
        if (!v) return;
        const d = duration || v.duration || 0;
        v.currentTime = clamp(timeSec, 0, Math.max(0, d - 0.001));
    }

    function pauseVideo() {
        const v = videoRef.current;
        if (!v) return;
        if (!v.paused) v.pause();
    }

    function playVideo() {
        const v = videoRef.current;
        if (!v) return;
        v.play();
    }

    // filmstrip 열기/닫기
    function openFilmstrip(atTime?: number) {
        const t = clamp(
            typeof atTime === "number" ? atTime : (videoRef.current?.currentTime ?? current),
            0,
            Math.max(0, duration - 0.001)
        );
        pauseVideo();
        setFilmOpen(true);
        setPreviewTime(t);
        // translate/drag state reset
        filmAccumDxRef.current = 0;
        setFilmTranslatePx(0);
    }

    function closeFilmstrip() {
        setFilmOpen(false);
        filmAccumDxRef.current = 0;
        setFilmTranslatePx(0);
    }

    function onPlayPause() {
        // filmstrip 열려있으면: 닫고 재생
        if (filmOpen) {
            closeFilmstrip();
            playVideo();
            return;
        }
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play();
        else v.pause();
    }

    // video events
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const onLoaded = () => {
            setDuration(v.duration || 0);
            setCurrent(v.currentTime || 0);
            setPreviewTime(v.currentTime || 0);
        };
        const onTime = () => {
            const t = v.currentTime || 0;
            setCurrent(t);
            // filmstrip이 닫혀있을 때만 previewTime이 재생시간을 따라감
            if (!filmOpen) setPreviewTime(t);
        };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        v.addEventListener("loadedmetadata", onLoaded);
        v.addEventListener("timeupdate", onTime);
        v.addEventListener("play", onPlay);
        v.addEventListener("pause", onPause);

        return () => {
            v.removeEventListener("loadedmetadata", onLoaded);
            v.removeEventListener("timeupdate", onTime);
            v.removeEventListener("play", onPlay);
            v.removeEventListener("pause", onPause);
        };
    }, [filmOpen]);

    // ===== filmstrip 썸네일 리스트(현재 previewTime 기준) =====
    const filmTimes = useMemo(() => {
        const mid = Math.floor(filmCount / 2);
        const base = previewTime;
        const arr: number[] = [];
        for (let i = 0; i < filmCount; i++) {
            const t = base + (i - mid) * filmStepSec;
            arr.push(clamp(t, 0, Math.max(0, duration - 0.001)));
        }
        return arr;
    }, [previewTime, duration, filmCount, filmStepSec]);

    // ===== “유튜브스러운” 스냅 드래그 =====
    // 칸 기준 px:
    // - 실제로는 가운데가 더 크지만 “스냅 기준”은 사이드 thumbW+gap로 두면 감각이 안정적임
    const slotPx = thumbW + gap;

    function stepPreview(deltaSteps: number) {
        if (!duration) return;
        const next = clamp(
            previewTimeRef.current + deltaSteps * filmStepSec,
            0,
            Math.max(0, duration - 0.001)
        );
        previewTimeRef.current = next;
        setPreviewTime(next);
        seekTo(next);
    }

    function onFilmPointerDown(e: React.PointerEvent) {
        if (!duration) return;
        filmDraggingRef.current = true;
        pauseVideo(); // filmstrip 열려있는 동안은 일시정지 유지

        filmLastXRef.current = e.clientX;
        filmAccumDxRef.current = 0;
        filmTotalDxRef.current = 0;
        const target = (e.target as HTMLElement | null)?.closest?.("[data-time]");
        const raw = target?.getAttribute?.("data-time");
        const parsed = raw != null ? Number(raw) : NaN;
        filmDownTimeRef.current = Number.isFinite(parsed) ? parsed : null;
        setTranslateRaf(0);

        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    }

    function onFilmPointerMove(e: React.PointerEvent) {
        if (!filmDraggingRef.current) return;

        const dx = e.clientX - filmLastXRef.current;
        filmLastXRef.current = e.clientX;
        filmTotalDxRef.current += Math.abs(dx);

        // 누적 이동(리스트가 손가락을 따라 움직이게)
        filmAccumDxRef.current += dx;
        setTranslateRaf(filmAccumDxRef.current);

        // 스냅: 한 칸 넘는 동안 반복 처리
        // 오른쪽->왼쪽 드래그: accum이 -slotPx 이하가 되면 "앞으로 한 칸"
        while (filmAccumDxRef.current <= -slotPx) {
            filmAccumDxRef.current += slotPx; // 되돌려서 끊김 없이 계속 드래그
            setTranslateRaf(filmAccumDxRef.current);
            stepPreview(+1);
        }
        // 왼쪽->오른쪽 드래그: accum이 +slotPx 이상이면 "뒤로 한 칸"
        while (filmAccumDxRef.current >= slotPx) {
            filmAccumDxRef.current -= slotPx;
            setTranslateRaf(filmAccumDxRef.current);
            stepPreview(-1);
        }
    }

    function onFilmPointerUp() {
        filmDraggingRef.current = false;
        // 드래그가 거의 없었으면 클릭으로 간주
        if (filmTotalDxRef.current < 6 && filmDownTimeRef.current != null) {
            setPreviewTime(filmDownTimeRef.current);
            seekTo(filmDownTimeRef.current);
            setSelectedThumbnailTime(filmDownTimeRef.current);
        }
        filmDownTimeRef.current = null;
        // 손 떼면 살짝 스냅 복귀(transition은 CSS로)
        filmAccumDxRef.current = 0;
        setTranslateRaf(0);
    }

    // ===== Seekbar 동작(hover 없음) =====
    function onBarClick(e: React.MouseEvent) {
        if (!duration) return;
        const t = timeFromClientX(e.clientX);
        seekTo(t);
    }

    function onBarPointerDown(e: React.PointerEvent) {
        if (!duration) return;
        barDraggingRef.current = true;
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);

        const t = timeFromClientX(e.clientX);
        setPreviewTime(t);
        seekTo(t);
    }

    function onBarPointerMove(e: React.PointerEvent) {
        if (!barDraggingRef.current) return;
        const t = timeFromClientX(e.clientX);
        setPreviewTime(t);
        seekTo(t);
    }

    function onBarPointerUp() {
        barDraggingRef.current = false;
    }

    return (
        <div style={styles.shell}>
            <style>{css}</style>
            <div style={styles.player}>
                <video
                    ref={videoRef}
                    src={videoSrc}
                    poster={poster}
                    style={styles.video}
                    playsInline
                    onClick={onPlayPause}
                />
                <div style={styles.controls}>
                    {filmOpen && (
                        <div
                            style={styles.filmstripWrap}
                            onPointerDown={onFilmPointerDown}
                            onPointerMove={onFilmPointerMove}
                            onPointerUp={onFilmPointerUp}
                        >
                            <div
                                style={{
                                    ...styles.filmstrip,
                                    transform: `translateX(${filmTranslatePx}px)`,
                                }}
                            >
                                {filmTimes.map((t, idx) => {
                                    const url = getThumbnail(t);
                                    const isCenter = idx === Math.floor(filmCount / 2);
                                    return (
                                        <div
                                            key={`${Math.floor(t)}-${idx}`}
                                            style={{
                                                ...styles.filmThumb,
                                                width: isCenter ? centerW : thumbW,
                                                ...(isCenter ? styles.filmThumbCenter : null),
                                            }}
                                            title={formatTime(t)}
                                            data-time={t}
                                        >
                                            <img src={url} alt="" draggable={false} style={styles.filmImg} />
                                            {isCenter && (
                                                <div style={styles.filmTimeBadge}>{formatTime(previewTime)}</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div
                        ref={barRef}
                        style={styles.seekBar}
                        onClick={onBarClick}
                        onPointerDown={onBarPointerDown}
                        onPointerMove={onBarPointerMove}
                        onPointerUp={onBarPointerUp}
                    >
                        <div style={styles.track} />
                        <div style={{ ...styles.fill, width: `${progressPct}%` }} />
                        <div style={{ ...styles.knob, left: `calc(${progressPct}% - 6px)` }} />
                    </div>

                    <div style={styles.topRow}>
                        <button
                            style={styles.btn}
                            onClick={() => (filmOpen ? closeFilmstrip() : openFilmstrip())}
                        >
                            {filmOpen ? "썸네일 닫기" : "썸네일 선택"}
                        </button>

                        <div style={styles.timeText}>
                            {formatTime(current)} / {formatTime(duration)}
                        </div>

                        <div style={{ flex: 1 }} />

                        <button style={styles.btn} onClick={onPlayPause}>
                            {isPlaying && !filmOpen ? "⏸" : "▶️"}
                        </button>
                    </div>
                </div>
            </div>

            {selectedThumbnailTime != null && (
                <div style={styles.selectedThumbWrap}>
                    <img
                        src={getThumbnail(selectedThumbnailTime)}
                        alt=""
                        draggable={false}
                        style={styles.selectedThumbImg}
                    />
                    <div style={styles.selectedThumbTime}>{formatTime(selectedThumbnailTime)}</div>
                </div>
            )}
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    shell: {
        width: "min(980px, 100%)",
        margin: "24px auto",
        padding: 12,
        color: "#fff",
        fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    },
    player: {
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: "#000",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    },
    video: {
        width: "100%",
        height: "auto",
        display: "block",
        background: "#000",
    },
    controls: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "10px 10px 10px",
        background:
            "linear-gradient(to top, rgba(0,0,0,0.84), rgba(0,0,0,0.22), rgba(0,0,0,0))",
    },
    topRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
    },
    btn: {
        appearance: "none",
        border: "none",
        background: "rgba(255,255,255,0.12)",
        color: "#fff",
        borderRadius: 10,
        padding: "8px 10px",
        cursor: "pointer",
        fontSize: 13,
    },
    timeText: {
        fontSize: 12,
        opacity: 0.9,
        userSelect: "none",
    },

    filmstripWrap: {
        marginBottom: 10,
        padding: "8px 8px 10px",
        borderRadius: 12,
        background: "rgba(15,15,15,0.82)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
        overflow: "hidden",
        touchAction: "none", // 드래그 필수
    },
    filmstrip: {
        display: "flex",
        gap: 6,
        alignItems: "flex-end",
        justifyContent: "center",
        willChange: "transform",
    },
    filmThumb: {
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.10)",
        opacity: 0.9,
        flex: "0 0 auto",
        transform: "translateZ(0)",
    },
    filmThumbCenter: {
        opacity: 1,
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
    },
    filmImg: {
        width: "100%",
        height: "auto",
        display: "block",
        userSelect: "none",
    },
    filmTimeBadge: {
        position: "absolute",
        left: 8,
        bottom: 8,
        fontSize: 12,
        padding: "4px 8px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.65)",
        border: "1px solid rgba(255,255,255,0.14)",
    },

    seekBar: {
        position: "relative",
        height: 18,
        cursor: "pointer",
        touchAction: "none",
    },
    track: {
        position: "absolute",
        left: 0,
        right: 0,
        top: "50%",
        height: 4,
        transform: "translateY(-50%)",
        borderRadius: 999,
        background: "rgba(255,255,255,0.25)",
    },
    fill: {
        position: "absolute",
        left: 0,
        top: "50%",
        height: 4,
        transform: "translateY(-50%)",
        borderRadius: 999,
        background: "rgba(255, 0, 0, 0.95)",
    },
    knob: {
        position: "absolute",
        top: "50%",
        width: 12,
        height: 12,
        transform: "translateY(-50%)",
        borderRadius: 999,
        background: "rgba(255,255,255,0.95)",
        boxShadow: "0 0 0 3px rgba(0,0,0,0.25)",
        pointerEvents: "none",
    },

    note: {
        marginTop: 10,
        fontSize: 13,
        opacity: 0.9,
        lineHeight: 1.5,
    },
    selectedThumbWrap: {
        marginTop: 10,
        padding: 10,
        borderRadius: 12,
        background: "rgba(15,15,15,0.82)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
    },
    selectedThumbImg: {
        width: 220,
        height: "auto",
        borderRadius: 10,
        display: "block",
        border: "1px solid rgba(255,255,255,0.10)",
    },
    selectedThumbTime: {
        fontSize: 13,
        opacity: 0.9,
        userSelect: "none",
    },
};

const css = `
img { -webkit-user-drag: none; }
`;
