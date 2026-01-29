import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
    videoSrc?: string;
    poster?: string;
    /**
     * 서버 썸네일로 교체:
     * (tSec) => `/api/thumb?sec=${Math.floor(tSec)}`
     */
    thumbnailUrlForTime?: (timeSec: number) => string;
    selectedItem?: PlayerItem | null;
    onDraftChange?: (draft: PlayerDraft) => void;
    onAddItem?: (item: PlayerItem) => void;
};

const SAMPLE_VIDEO =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export type PlayerDraft = {
    thumbnailTime: number | null;
    thumbnailUrl?: string;
    start: number;
    end: number;
};

export type PlayerItem = {
    id: string;
    thumbnailUrl: string;
    thumbnailTime: number;
    start: number;
    end: number;
};

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
    selectedItem,
    onDraftChange,
    onAddItem,
}: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);

    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
    const speedMenuRef = useRef<HTMLDivElement | null>(null);
    const lastAppliedItemIdRef = useRef<string | null>(null);
    const pendingSelectedItemRef = useRef<PlayerItem | null>(null);

    // filmstrip 모드(버튼/시크바 클릭으로만)
    const [filmOpen, setFilmOpen] = useState(false);

    // filmstrip 기준 시간(= 드래그/시크바로 이동)
    const [previewTime, setPreviewTime] = useState(0);
    const previewTimeRef = useRef(0);
    useEffect(() => {
        previewTimeRef.current = previewTime;
    }, [previewTime]);
    const [selectedThumbnailTime, setSelectedThumbnailTime] = useState<number | null>(null);
    const [rangeMode, setRangeMode] = useState(false);
    const [rangeStart, setRangeStart] = useState(0);
    const [rangeEnd, setRangeEnd] = useState(0);
    const [savedRange, setSavedRange] = useState<{ start: number; end: number } | null>(null);
    const [rangePlayActive, setRangePlayActive] = useState(false);
    const [rangeEditBase, setRangeEditBase] = useState<{ start: number; end: number } | null>(
        null
    );

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
    const rangeDraggingRef = useRef<"start" | "end" | null>(null);

    const progressPct = useMemo(() => {
        if (!duration) return 0;
        return clamp((current / duration) * 100, 0, 100);
    }, [current, duration]);

    const activeRange = useMemo(() => {
        if (!savedRange) return null;
        const start = Math.min(savedRange.start, savedRange.end);
        const end = Math.max(savedRange.start, savedRange.end);
        return { start, end };
    }, [savedRange]);

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

    function clampToActiveRange(timeSec: number) {
        if (!rangePlayActive || !activeRange) return timeSec;
        return clamp(timeSec, activeRange.start, activeRange.end);
    }

    const getThumbnail = useCallback(
        (timeSec: number) => {
            const bucket = Math.floor(timeSec);
            return thumbnailUrlForTime
                ? thumbnailUrlForTime(bucket)
                : makeFakeThumbnailDataUrl(bucket);
        },
        [thumbnailUrlForTime]
    );

    function setRangeStartSafe(timeSec: number) {
        const t = clamp(timeSec, 0, Math.max(0, duration - 0.001));
        setRangeStart(Math.min(t, rangeEnd));
    }

    function setRangeEndSafe(timeSec: number) {
        const t = clamp(timeSec, 0, Math.max(0, duration - 0.001));
        setRangeEnd(Math.max(t, rangeStart));
    }

    const seekTo = useCallback((timeSec: number) => {
        const v = videoRef.current;
        if (!v) return;
        const d = duration || v.duration || 0;
        v.currentTime = clamp(timeSec, 0, Math.max(0, d - 0.001));
    }, [duration]);

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

    function setPlaybackRateSafe(rate: number) {
        const v = videoRef.current;
        setPlaybackRate(rate);
        if (v) v.playbackRate = rate;
    }

    const applySelectedItem = useCallback((item: PlayerItem) => {
        const maxDuration = Math.max(0, (duration || videoRef.current?.duration || 0) - 0.001);
        if (maxDuration <= 0) {
            pendingSelectedItemRef.current = item;
            return;
        }
        const start = clamp(Math.min(item.start, item.end), 0, maxDuration);
        const end = clamp(Math.max(item.start, item.end), 0, maxDuration);
        const thumb = clamp(item.thumbnailTime, 0, maxDuration);
        setRangeStart(start);
        setRangeEnd(end);
        setSavedRange({ start, end });
        setRangeMode(false);
        setRangePlayActive(false);
        setSelectedThumbnailTime(thumb);
        setPreviewTime(thumb);
        seekTo(thumb);
        lastAppliedItemIdRef.current = item.id;
    }, [duration, seekTo]);

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
            if (v.duration && rangeEnd === 0) {
                setRangeStart(0);
                setRangeEnd(Math.min(5, v.duration));
            }
        };
        const onTime = () => {
            let t = v.currentTime || 0;
            if (rangePlayActive && activeRange) {
                if (t < activeRange.start) {
                    t = activeRange.start;
                    v.currentTime = activeRange.start;
                } else if (t >= activeRange.end) {
                    t = activeRange.end;
                    v.currentTime = activeRange.end;
                    v.pause();
                }
            }
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
    }, [filmOpen, rangeEnd, rangePlayActive, activeRange]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.playbackRate = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
        if (!selectedItem) return;
        if (selectedItem.id === lastAppliedItemIdRef.current) return;
        queueMicrotask(() => applySelectedItem(selectedItem));
    }, [selectedItem, applySelectedItem]);

    useEffect(() => {
        if (!pendingSelectedItemRef.current) return;
        if (duration <= 0) return;
        queueMicrotask(() => {
            if (!pendingSelectedItemRef.current) return;
            applySelectedItem(pendingSelectedItemRef.current);
            pendingSelectedItemRef.current = null;
        });
    }, [duration, applySelectedItem]);

    useEffect(() => {
        if (!speedMenuOpen) return;
        function onDocMouseDown(e: MouseEvent) {
            const target = e.target as Node | null;
            if (!speedMenuRef.current || !target) return;
            if (!speedMenuRef.current.contains(target)) {
                setSpeedMenuOpen(false);
            }
        }
        function onDocKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") setSpeedMenuOpen(false);
        }
        document.addEventListener("mousedown", onDocMouseDown);
        document.addEventListener("keydown", onDocKeyDown);
        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
            document.removeEventListener("keydown", onDocKeyDown);
        };
    }, [speedMenuOpen]);

    const playbackRates = useMemo(
        () => [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4],
        []
    );

    const addRange = savedRange ?? { start: rangeStart, end: rangeEnd };
    const addStart = Math.min(addRange.start, addRange.end);
    const addEnd = Math.max(addRange.start, addRange.end);

    const draftThumbnailUrl = useMemo(() => {
        if (selectedThumbnailTime == null) return undefined;
        return getThumbnail(selectedThumbnailTime);
    }, [selectedThumbnailTime, getThumbnail]);

    const canAdd = selectedThumbnailTime != null && addEnd > addStart && !!draftThumbnailUrl;

    useEffect(() => {
        if (!onDraftChange) return;
        onDraftChange({
            start: addStart,
            end: addEnd,
            thumbnailTime: selectedThumbnailTime,
            thumbnailUrl: draftThumbnailUrl,
        });
    }, [onDraftChange, addStart, addEnd, selectedThumbnailTime, draftThumbnailUrl]);

    function onAddCurrentSelection() {
        if (!onAddItem || !canAdd || selectedThumbnailTime == null || !draftThumbnailUrl) return;
        onAddItem({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            thumbnailUrl: draftThumbnailUrl,
            thumbnailTime: selectedThumbnailTime,
            start: addStart,
            end: addEnd,
        });
    }

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
        if (rangeMode) return;
        const t = clampToActiveRange(timeFromClientX(e.clientX));
        seekTo(t);
    }

    function onBarPointerDown(e: React.PointerEvent) {
        if (!duration) return;
        if (rangeMode) {
            const t = timeFromClientX(e.clientX);
            const distToStart = Math.abs(t - rangeStart);
            const distToEnd = Math.abs(t - rangeEnd);
            const handle = distToStart <= distToEnd ? "start" : "end";
            rangeDraggingRef.current = handle;
            if (handle === "start") setRangeStartSafe(t);
            else setRangeEndSafe(t);
            (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
            return;
        }
        barDraggingRef.current = true;
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);

        const t = clampToActiveRange(timeFromClientX(e.clientX));
        setPreviewTime(t);
        seekTo(t);
    }

    function onBarPointerMove(e: React.PointerEvent) {
        if (rangeMode) {
            if (!rangeDraggingRef.current) return;
            const t = timeFromClientX(e.clientX);
            if (rangeDraggingRef.current === "start") setRangeStartSafe(t);
            else setRangeEndSafe(t);
            return;
        }
        if (!barDraggingRef.current) return;
        const t = clampToActiveRange(timeFromClientX(e.clientX));
        setPreviewTime(t);
        seekTo(t);
    }

    function onBarPointerUp() {
        if (rangeMode) {
            rangeDraggingRef.current = null;
            return;
        }
        barDraggingRef.current = false;
    }

    function onRangeButtonClick() {
        if (!rangeMode) {
            setRangeEditBase({ start: rangeStart, end: rangeEnd });
            setRangeMode(true);
            setRangePlayActive(false);
            return;
        }
        if (!isRangeDirty) return;
        const start = Math.min(rangeStart, rangeEnd);
        const end = Math.max(rangeStart, rangeEnd);
        setSavedRange({ start, end });
        setRangeMode(false);
        rangeDraggingRef.current = null;
    }

    function onRangeCancelClick() {
        if (!rangeMode || !rangeEditBase) return;
        setRangeStart(rangeEditBase.start);
        setRangeEnd(rangeEditBase.end);
        setRangeMode(false);
        rangeDraggingRef.current = null;
    }

    function onRangePlayClick() {
        if (!activeRange) return;
        setRangePlayActive(true);
        setRangeMode(false);
        rangeDraggingRef.current = null;
        seekTo(activeRange.start);
        playVideo();
    }

    function onRangePlayCancelClick() {
        setRangePlayActive(false);
    }

    const rangeStartPct = useMemo(() => {
        if (!duration) return 0;
        return clamp((rangeStart / duration) * 100, 0, 100);
    }, [rangeStart, duration]);

    const rangeEndPct = useMemo(() => {
        if (!duration) return 0;
        return clamp((rangeEnd / duration) * 100, 0, 100);
    }, [rangeEnd, duration]);

    const isRangeDirty =
        rangeMode && rangeEditBase
            ? rangeEditBase.start !== rangeStart || rangeEditBase.end !== rangeEnd
            : false;

    const shouldReset = useMemo(() => {
        if (rangePlayActive && activeRange) {
            return current >= activeRange.end - 0.001;
        }
        return duration > 0 && current >= duration - 0.001;
    }, [rangePlayActive, activeRange, current, duration]);

    function onPlayButtonClick() {
        if (shouldReset) {
            const resetTo = rangePlayActive && activeRange ? activeRange.start : 0;
            pauseVideo();
            seekTo(resetTo);
            return;
        }
        onPlayPause();
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
                        <div
                            style={{
                                ...styles.rangeMarker,
                                left: `calc(${rangeStartPct}% - 1px)`,
                                opacity: rangeMode ? 1 : 0.65,
                            }}
                        />
                        <div
                            style={{
                                ...styles.rangeMarker,
                                left: `calc(${rangeEndPct}% - 1px)`,
                                opacity: rangeMode ? 1 : 0.65,
                            }}
                        />
                        {rangeMode && (
                            <div
                                style={{
                                    ...styles.rangeLabel,
                                    left: `calc(${rangeStartPct}% - 14px)`,
                                }}
                            >
                                {formatTime(rangeStart)}
                            </div>
                        )}
                        {rangeMode && (
                            <div
                                style={{
                                    ...styles.rangeLabel,
                                    left: `calc(${rangeEndPct}% - 14px)`,
                                }}
                            >
                                {formatTime(rangeEnd)}
                            </div>
                        )}
                        <div style={{ ...styles.fill, width: `${progressPct}%` }} />
                        <div style={{ ...styles.knob, left: `calc(${progressPct}% - 6px)` }} />
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button style={{
                                ...styles.btn,
                                color: 'black',
                            }} onClick={onPlayButtonClick}>
                                {shouldReset ? "초기화" : isPlaying && !filmOpen ? "⏸" : "▶️"}
                            </button>
                            <div style={styles.timeText}>
                                {formatTime(current)} / {formatTime(duration)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <div style={styles.speedWrap} ref={speedMenuRef}>
                                <button
                                    style={styles.speedBtn}
                                    onClick={() => setSpeedMenuOpen((prev) => !prev)}
                                    aria-haspopup="menu"
                                    aria-expanded={speedMenuOpen}
                                >
                                    배속 {playbackRate}
                                </button>
                                {speedMenuOpen && (
                                    <div style={styles.speedMenu} role="menu">
                                        {playbackRates.map((rate) => {
                                            const isActive = rate === playbackRate;
                                            return (
                                                <button
                                                    key={rate}
                                                    role="menuitemradio"
                                                    aria-checked={isActive}
                                                    style={{
                                                        ...styles.speedMenuItem,
                                                        ...(isActive ? styles.speedMenuItemActive : null),
                                                    }}
                                                    onClick={() => {
                                                        setPlaybackRateSafe(rate);
                                                        setSpeedMenuOpen(false);
                                                    }}
                                                >
                                                    <span>{rate}x</span>
                                                    {isActive && <span style={styles.speedCheck}>✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div style={{
                color: 'black'
            }}>
                <button
                    style={{
                        ...styles.btn,
                        color: 'black',
                    }}
                    onClick={() => (filmOpen ? closeFilmstrip() : openFilmstrip())}
                >
                    {filmOpen ? "썸네일 닫기" : "썸네일 선택"}
                </button>
                <button
                    style={{
                        ...styles.btn,
                        ...(rangeMode && !isRangeDirty ? styles.btnDisabled : null),
                        color: 'black',
                    }}
                    onClick={onRangeButtonClick}
                    disabled={rangeMode && !isRangeDirty}
                >
                    {rangeMode ? "구간 저장" : "구간 선택"}
                </button>
                {rangeMode && (
                    <button style={{
                        ...styles.btn,
                        color: 'black',
                    }} onClick={onRangeCancelClick}>
                        구간 선택 취소
                    </button>
                )}
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
                {savedRange && (
                    <div style={styles.savedRangeInfo}>
                        구간: {formatTime(savedRange.start)} ~ {formatTime(savedRange.end)}
                    </div>
                )}
                <button
                    style={{
                        ...styles.btn,
                        ...(rangePlayActive || !activeRange ? styles.btnDisabled : null),
                        color: 'black',
                    }}
                    onClick={onRangePlayClick}
                    disabled={rangePlayActive || !activeRange}
                >
                    구간재생
                </button>
                <button
                    style={{
                        ...styles.btn,
                        ...(!rangePlayActive ? styles.btnDisabled : null),
                        color: 'black',
                    }}
                    onClick={onRangePlayCancelClick}
                    disabled={!rangePlayActive}
                >
                    구간재생 취소
                </button>
            </div>
            <div style={styles.addSection}>
                <div style={styles.addStep}>
                    <div style={styles.addStepTitle}>Step 1. 구간 선택</div>
                    <div style={styles.addStepBody}>
                        {addEnd > addStart
                            ? `${formatTime(addStart)} ~ ${formatTime(addEnd)}`
                            : "구간을 선택하세요"}
                    </div>
                </div>
                <div style={styles.addStep}>
                    <div style={styles.addStepTitle}>Step 2. 썸네일 선택</div>
                    <div style={styles.addStepBody}>
                        {selectedThumbnailTime != null ? (
                            <div style={styles.addThumbRow}>
                                <img
                                    src={draftThumbnailUrl}
                                    alt=""
                                    draggable={false}
                                    style={styles.addThumbImg}
                                />
                                <div>{formatTime(selectedThumbnailTime)}</div>
                            </div>
                        ) : (
                            "썸네일을 선택하세요"
                        )}
                    </div>
                </div>
                <div style={styles.addActions}>
                    <button
                        style={{
                            ...styles.btn,
                            ...(canAdd ? null : styles.btnDisabled),
                            color: 'black',
                        }}
                        onClick={onAddCurrentSelection}
                        disabled={!canAdd}
                    >
                        추가
                    </button>
                </div>
            </div>
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
    btnDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    addSection: {
        marginTop: 16,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        color: "#111",
    },
    addStep: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 13,
    },
    addStepTitle: {
        fontWeight: 600,
    },
    addStepBody: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    addActions: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 4,
    },
    addThumbRow: {
        display: "flex",
        alignItems: "center",
        gap: 10,
    },
    addThumbImg: {
        width: 120,
        height: "auto",
        borderRadius: 8,
        border: "1px solid rgba(0,0,0,0.08)",
    },
    speedWrap: {
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
    },
    speedBtn: {
        appearance: "none",
        border: "none",
        background: "rgba(255,255,255,0.12)",
        color: "#fff",
        borderRadius: 10,
        padding: "6px 10px",
        cursor: "pointer",
        fontSize: 12,
        letterSpacing: 0.1,
    },
    speedMenu: {
        position: "absolute",
        right: 0,
        bottom: "calc(100% + 6px)",
        minWidth: 120,
        background: "rgba(20,20,20,0.98)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 10,
        padding: 6,
        boxShadow: "0 10px 22px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        zIndex: 5,
    },
    speedMenuItem: {
        appearance: "none",
        border: "none",
        background: "transparent",
        color: "rgba(255,255,255,0.9)",
        textAlign: "left",
        padding: "6px 8px",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    speedMenuItemActive: {
        background: "rgba(255,255,255,0.12)",
        color: "#fff",
    },
    speedCheck: {
        fontSize: 12,
        color: "#fff",
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
    rangeMarker: {
        position: "absolute",
        top: -10,
        width: 2,
        height: 20,
        background: "rgba(255,214,0,0.95)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
        borderRadius: 2,
        pointerEvents: "none",
    },
    rangeLabel: {
        position: "absolute",
        top: -28,
        fontSize: 11,
        padding: "2px 6px",
        borderRadius: 6,
        background: "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.12)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
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
        color: 'white',
        fontSize: 13,
        opacity: 0.9,
        userSelect: "none",
    },
    savedRangeInfo: {
        marginTop: 8,
        fontSize: 13,
        opacity: 0.9,
    },
};

const css = `
img { -webkit-user-drag: none; }
`;
