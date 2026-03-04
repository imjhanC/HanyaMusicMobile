/**
 * VideoPlayer.tsx
 * Full-screen LANDSCAPE music-video player.
 *
 * Achieved by creating a landscape-sized view (H×W) and rotating it 90°
 * so it fills the portrait screen. No orientation library required.
 *
 * stream_url carries video+audio — <Video muted={false}> plays both.
 * onLoad → seeks to the `position` prop so playback continues from
 * wherever the mini-player was.
 */
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Video, { ResizeMode } from "react-native-video";
import { MVData } from "./MusicPlayerAdv";

// ────────────────────────────────────────────────────────────────────────────
const formatTime = (secs: number) => {
    if (!isFinite(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
};

// ────────────────────────────────────────────────────────────────────────────
interface VideoPlayerProps {
    mvData: MVData;
    /** Called with (currentPosition, realDuration) when collapsing back to mini-player */
    onClose: (currentPosition: number, realDuration: number) => void;
    isPlaying: boolean;
    onPlayPause: () => void;
    onSkipNext: () => void;
    onSkipPrevious: () => void;
    position: number;
    duration: number;
    onSeek: (seconds: number) => void;
    /** Fired immediately when video metadata reveals the actual duration */
    onDurationChange?: (duration: number) => void;
}

// ────────────────────────────────────────────────────────────────────────────
export default function VideoPlayer({
    mvData,
    onClose,
    isPlaying,
    onPlayPause,
    onSkipNext,
    onSkipPrevious,
    position,
    duration,
    onSeek,
    onDurationChange,
}: VideoPlayerProps) {
    const [barWidth, setBarWidth] = useState(0);
    const [previewSec, setPreviewSec] = useState<number | null>(null);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [realDuration, setRealDuration] = useState(duration);
    const [currentPosition, setCurrentPosition] = useState(position);

    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videoRef = useRef<any>(null);
    const positionRef = useRef(position);
    const realDurationRef = useRef(duration);
    const currentPositionRef = useRef(position);

    useEffect(() => { positionRef.current = position; }, [position]);
    useEffect(() => { realDurationRef.current = realDuration; }, [realDuration]);
    useEffect(() => { currentPositionRef.current = currentPosition; }, [currentPosition]);

    // ── Landscape geometry ────────────────────────────────────────────────
    // Portrait screen: narrow side = W, tall side = H
    // We create a canvas of size H×W (landscape), then apply:
    //   translateX = (W-H)/2   [negative → shifts left]
    //   translateY = (H-W)/2   [positive → shifts down]
    //   rotate(90deg)
    // This centres the rotated canvas on the portrait screen.
    const { width: screenW, height: screenH } = Dimensions.get("window");
    const W = Math.min(screenW, screenH); // portrait width  (narrow)
    const H = Math.max(screenW, screenH); // portrait height (tall)

    const landscapeTransform = [
        { translateX: (W - H) / 2 },   // always negative
        { translateY: (H - W) / 2 },   // always positive
        { rotate: "90deg" as const },
    ];

    // ── Progress bar ──────────────────────────────────────────────────────
    const activeDuration = realDuration > 0 ? realDuration : duration;
    const effectivePos = previewSec ?? currentPosition;
    const progress = activeDuration > 0 ? effectivePos / activeDuration : 0;
    const thumbLeft = Math.max(0, Math.min(progress * barWidth, barWidth)) - 8;

    // ── Controls auto-hide ────────────────────────────────────────────────
    const bumpControls = () => {
        setControlsVisible(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
    };

    useEffect(() => {
        bumpControls();
        return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    }, []);

    // ── Seek helpers ──────────────────────────────────────────────────────
    const calcSeek = (x: number) =>
        barWidth > 0 ? Math.max(0, Math.min(activeDuration, (x / barWidth) * activeDuration)) : 0;

    const handleSeek = (t: number) => {
        setPreviewSec(null);
        setCurrentPosition(t);
        if (videoRef.current) videoRef.current.seek(t);
        onSeek(t);
    };

    // Pass position + duration back to MusicPlayerAdv on collapse
    const handleClose = () => {
        onClose(currentPositionRef.current, realDurationRef.current);
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <StatusBar hidden />

            {/* Landscape canvas — rotated 90° */}
            <View style={[styles.landscape, { width: H, height: W, transform: landscapeTransform }]}>

                {/* Video — taps toggle controls */}
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFillObject}
                    onPress={bumpControls}
                >
                    <Video
                        ref={videoRef}
                        source={{ uri: mvData.stream_url }}
                        style={StyleSheet.absoluteFillObject}
                        muted={false}          // stream_url = video+audio combined
                        paused={!isPlaying}
                        resizeMode={ResizeMode.CONTAIN}
                        repeat={false}
                        ignoreSilentSwitch="ignore"
                        playInBackground={false}
                        playWhenInactive={false}
                        onLoad={(meta) => {
                            // Capture real duration from metadata
                            const d = meta?.duration;
                            if (d && d > 0) {
                                setRealDuration(d);
                                realDurationRef.current = d;
                                onDurationChange?.(d);
                            }
                            // Resume from where the mini-player was
                            const pos = positionRef.current;
                            if (pos > 1 && videoRef.current) {
                                videoRef.current.seek(pos);
                            }
                        }}
                        onProgress={(data) => setCurrentPosition(data.currentTime)}
                        progressUpdateInterval={500}
                        onError={(e) => console.error("[VideoPlayer] error:", e)}
                    />
                </TouchableOpacity>

                {/* Controls overlay */}
                {controlsVisible && (
                    <View style={styles.overlay} pointerEvents="box-none">

                        {/* Top bar */}
                        <View style={styles.topBar}>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.contractBtn}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="contract" size={22} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.titleBox}>
                                <Text style={styles.titleText} numberOfLines={1}>
                                    {mvData.title}
                                </Text>
                                {mvData.quality ? (
                                    <Text style={styles.qualityText}>{mvData.quality}</Text>
                                ) : null}
                            </View>
                        </View>

                        {/* Centre controls */}
                        <View style={styles.centerRow} pointerEvents="box-none">
                            <TouchableOpacity onPress={onSkipPrevious} style={styles.skipBtn}>
                                <Ionicons name="play-skip-back" size={36} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onPlayPause} style={styles.playCircle}>
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={46}
                                    color="#fff"
                                    style={!isPlaying ? { marginLeft: 5 } : {}}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={onSkipNext} style={styles.skipBtn}>
                                <Ionicons name="play-skip-forward" size={36} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom bar: progress slider */}
                        <View style={styles.bottomBar}>
                            <Text style={styles.timeText}>{formatTime(effectivePos)}</Text>

                            <View
                                style={styles.sliderWrapper}
                                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                                onStartShouldSetResponder={() => true}
                                onMoveShouldSetResponder={() => true}
                                onResponderGrant={(e) => {
                                    bumpControls();
                                    setPreviewSec(calcSeek(e.nativeEvent.locationX));
                                }}
                                onResponderMove={(e) =>
                                    setPreviewSec(calcSeek(e.nativeEvent.locationX))
                                }
                                onResponderRelease={(e) =>
                                    handleSeek(calcSeek(e.nativeEvent.locationX))
                                }
                            >
                                <View style={styles.sliderBg} />
                                <View style={[styles.sliderFg, { width: `${progress * 100}%` }]} />
                                {barWidth > 0 && (
                                    <View style={[styles.sliderThumb, { left: thumbLeft }]} />
                                )}
                            </View>

                            <Text style={styles.timeText}>{formatTime(activeDuration)}</Text>
                        </View>

                    </View>
                )}
            </View>
        </View>
    );
}

// ────────────────────────────────────────────────────────────────────────────
const GREEN = "#1DB954";

const styles = StyleSheet.create({
    root: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "#000",
        zIndex: 99999,
        overflow: "hidden",
    },
    landscape: {
        position: "absolute",
        top: 0,
        left: 0,
        backgroundColor: "#000",
        overflow: "hidden",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
        backgroundColor: "rgba(0,0,0,0.30)",
    },
    // Top bar
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 8,
    },
    contractBtn: {
        padding: 10,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 24,
        marginRight: 12,
    },
    titleBox: { flex: 1 },
    titleText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 20,
    },
    qualityText: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 11,
        marginTop: 2,
    },
    // Centre
    centerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
    },
    skipBtn: {
        padding: 12,
        backgroundColor: "rgba(0,0,0,0.40)",
        borderRadius: 40,
    },
    playCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${GREEN}CC`,
        alignItems: "center",
        justifyContent: "center",
        elevation: 8,
    },
    // Bottom
    bottomBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 18,
        gap: 10,
    },
    timeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
        minWidth: 40,
        textAlign: "center",
    },
    sliderWrapper: {
        flex: 1,
        height: 36,
        justifyContent: "center",
        position: "relative",
    },
    sliderBg: {
        position: "absolute",
        left: 0, right: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.30)",
    },
    sliderFg: {
        position: "absolute",
        left: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: GREEN,
    },
    sliderThumb: {
        position: "absolute",
        top: "50%",
        marginTop: -8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#fff",
        elevation: 5,
    },
});