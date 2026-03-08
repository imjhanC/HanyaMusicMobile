import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  LayoutChangeEvent,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Video, { ResizeMode } from "react-native-video";
import TrackPlayer, {
  useProgress,
  usePlaybackState,
  State,
} from "react-native-track-player";
import { useMusicPlayer, MarqueeTitle } from "./MusicPlayer";
import VideoPlayer from "./VideoPlayer";
import { ServiceManager } from "./ServiceManager";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MVData {
  stream_url: string;     // Cloudflare proxy URL — supports HTTP 206 partial content
  video_url: string;      // Raw YouTube URL (kept for reference)
  audio_url: string;
  title: string;
  duration: number;
  thumbnail_url: string;
  quality: string;
  stream_type: string;
  cached?: boolean;
}

type RepeatMode = "off" | "once" | "track";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const SEEK_SETTLE_MS = 300;
const VIDEO_AUTOPLAY_DELAY_MS = 150;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatTime = (secs: number): string => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};


// ─── MusicPlayerAdv ───────────────────────────────────────────────────────────

export default function MusicPlayerAdv() {
  const {
    currentTrack,
    isAdvOpen,
    closeAdv,
    isTrackLoading,
    isTransitioning,
    queue,
    playTrack,
    skipNext,
    skipPrevious,
    repeatMode,
    setRepeatMode,
  } = useMusicPlayer();

  const { position, duration } = useProgress();
  const playbackState = usePlaybackState();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [barWidth, setBarWidth] = useState(0);
  const [previewSec, setPreviewSec] = useState<number | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [titleContainerWidth, setTitleContainerWidth] = useState(0);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(true);

  // ── Video state ───────────────────────────────────────────────────────────
  const [mvData, setMvData] = useState<MVData | null>(null);
  const [isMVLoading, setIsMVLoading] = useState(false);
  const [mvError, setMVError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoKey, setVideoKey] = useState(0);
  const [videoBuffering, setVideoBuffering] = useState(false);
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<any>(null);
  const originalAudioUrlRef = useRef<string | null>(null);
  const originalTrackMetaRef = useRef<any>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const videoPausedRef = useRef(true);

  useEffect(() => { videoPausedRef.current = videoPaused; }, [videoPaused]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isVideoMode = mvData !== null;
  const isAudioPlaying = playbackState?.state === State.Playing && !isTransitioning;

  const activePos = isVideoMode
    ? (previewSec ?? pendingSeekRef.current ?? videoPosition)
    : (previewSec ?? pendingSeekRef.current ?? position);

  const activeDur = isVideoMode ? videoDuration : duration;

  const showLoading =
    isTrackLoading ||
    isTransitioning ||
    (isVideoMode && (videoBuffering || !isVideoReady));

  const showPlayingIcon = isVideoMode ? !videoPaused : isAudioPlaying;
  const progressFraction = activeDur > 0 ? activePos / activeDur : 0;
  const thumbLeft = Math.max(0, Math.min(progressFraction * barWidth, barWidth)) - 8;

  const titleText = currentTrack?.title || currentTrack?.song_name || "";
  const artistText = currentTrack?.uploader || currentTrack?.artist_name || "";

  useEffect(() => {
    setIsTitleOverflowing(true); // reset whenever track changes
  }, [titleText]);

  // ── Reset on track change ─────────────────────────────────────────────────
  useEffect(() => {
    setMvData(null);
    setIsVideoReady(false);
    setVideoPaused(true);
    videoPausedRef.current = true;
    setMVError(null);
    setIsFullscreen(false);
    setVideoPosition(0);
    setVideoDuration(0);
    originalAudioUrlRef.current = null;
    originalTrackMetaRef.current = null;
  }, [currentTrack?.title, currentTrack?.song_name]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setVideoPlaying = useCallback((playing: boolean) => {
    videoPausedRef.current = !playing;
    setVideoPaused(!playing);
  }, []);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = useCallback(async (x: number) => {
    if (barWidth <= 0 || !activeDur || activeDur <= 0) return;
    const target = Math.max(0, Math.min(1, x / barWidth)) * activeDur;

    isSeekingRef.current = true;
    pendingSeekRef.current = target;

    try {
      if (isVideoMode) {
        if (videoRef.current && isVideoReady) {
          videoRef.current.seek(target);
          setVideoPosition(target);
        }
      } else {
        await TrackPlayer.seekTo(target);
      }
    } catch (err) {
      console.error("[Seek] error:", err);
    }

    setTimeout(() => {
      pendingSeekRef.current = null;
      isSeekingRef.current = false;
    }, SEEK_SETTLE_MS);
  }, [activeDur, barWidth, isVideoMode, isVideoReady]);

  // ── Play / Pause ──────────────────────────────────────────────────────────
  const togglePlayPause = useCallback(async () => {
    if (isVideoMode) {
      setVideoPlaying(videoPausedRef.current);
    } else {
      const s = await TrackPlayer.getState();
      if (s === State.Playing) await TrackPlayer.pause();
      else await TrackPlayer.play();
    }
  }, [isVideoMode, setVideoPlaying]);

  // ── Skip next (shuffle-aware) ─────────────────────────────────────────────
  const handleSkipNext = useCallback(async () => {
    if (isShuffle && queue.length > 1) {
      const random = queue[Math.floor(Math.random() * queue.length)];
      playTrack({ ...random, isSearchBased: true });
    } else {
      await skipNext();
    }
  }, [isShuffle, queue, playTrack, skipNext]);

  // ── Repeat cycle ──────────────────────────────────────────────────────────
  const cycleRepeat = useCallback(() => {
    const next: Record<RepeatMode, RepeatMode> = {
      off: "once",
      once: "track",
      track: "off",
    };
    setRepeatMode(next[repeatMode as RepeatMode] ?? "off");
  }, [repeatMode, setRepeatMode]);

  // ── Video: switch to / from MV ────────────────────────────────────────────
  const handleVideoSwitch = useCallback(async () => {
    if (isVideoMode) {
      // ── Restore audio ────────────────────────────────────────────────────
      const snapPos = videoPosition;
      const savedUrl = originalAudioUrlRef.current;
      const savedMeta = originalTrackMetaRef.current;

      setMvData(null);
      setIsVideoReady(false);
      setVideoPlaying(false);
      setMVError(null);
      setIsFullscreen(false);
      setVideoBuffering(false);
      setVideoPosition(0);
      setVideoDuration(0);

      if (savedUrl && savedMeta) {
        try {
          await TrackPlayer.reset();
          await TrackPlayer.add({
            url: savedUrl,
            title: savedMeta.title,
            artist: savedMeta.artist,
            artwork: savedMeta.artwork,
          });
          await new Promise((r) => setTimeout(r, 150));
          await TrackPlayer.seekTo(snapPos);
          await TrackPlayer.play();
        } catch (e: any) {
          console.error("[MV] restore audio error:", e?.message ?? e);
          try { await TrackPlayer.play(); } catch (_) { }
        }
      }
      return;
    }

    // ── Fetch MV ─────────────────────────────────────────────────────────
    const songTitle = currentTrack?.title || currentTrack?.song_name || "";
    const artist = currentTrack?.uploader || currentTrack?.artist_name || "";

    if (!songTitle) {
      setMVError("No song title — cannot search for MV.");
      return;
    }

    setIsMVLoading(true);
    setMVError(null);
    setIsVideoReady(false);
    setVideoBuffering(false);

    try {
      const baseUrl = await ServiceManager.getHanyaMusicUrl();
      const reqUrl =
        `${baseUrl}/search/exactwithMVMobile` +
        `?song_title=${encodeURIComponent(songTitle)}` +
        `&artist=${encodeURIComponent(artist)}`;

      console.log("[MV] Fetching:", reqUrl);
      const res = await fetch(reqUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) throw new Error("MV API returned non-JSON");

      const data: MVData = await res.json();
      if (!data.stream_url) throw new Error("Response missing stream_url");

      console.log("[MV] stream_url:", data.stream_url, "| quality:", data.quality, "| cached:", data.cached);

      // Snapshot audio before handing off to video
      const snapPos = position;
      originalAudioUrlRef.current = currentTrack?.audio_url || currentTrack?.url || "";
      originalTrackMetaRef.current = {
        title: currentTrack?.title || currentTrack?.song_name || "",
        artist: currentTrack?.uploader || currentTrack?.artist_name || "",
        artwork: currentTrack?.thumbnail_url || currentTrack?.thumbnail || "",
        snapPos,
      };

      // Pause TrackPlayer — stream_url carries video + audio
      try { await TrackPlayer.pause(); } catch (_) { }

      setVideoDuration(data.duration || 0);
      setVideoPosition(snapPos);
      setVideoKey((k) => k + 1);
      setMvData(data);
      setVideoPlaying(false); // autoplay triggered by onLoad
    } catch (e: any) {
      console.error("[MV] error:", e?.message ?? e);
      setMVError("Couldn't load MV: " + (e?.message ?? "unknown error"));
      setVideoPlaying(false);
      try { await TrackPlayer.play(); } catch (_) { }
    } finally {
      setIsMVLoading(false);
    }
  }, [isVideoMode, currentTrack, position, setVideoPlaying, videoPosition]);

  // ── Video callbacks ───────────────────────────────────────────────────────
  const handleVideoLoad = useCallback((meta: any) => {
    console.log("[Video] Loaded. Duration:", meta?.duration);
    setIsVideoReady(true);
    setVideoBuffering(false);
    if (meta?.duration) setVideoDuration(meta.duration);

    const snapPos = originalTrackMetaRef.current?.snapPos ?? 0;
    if (videoRef.current && snapPos > 0) videoRef.current.seek(snapPos);
    setTimeout(() => setVideoPlaying(true), VIDEO_AUTOPLAY_DELAY_MS);
  }, [setVideoPlaying]);

  const handleVideoProgress = useCallback(({ currentTime }: { currentTime: number }) => {
    if (!isSeekingRef.current) setVideoPosition(currentTime);
  }, []);

  const handleVideoBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    console.log("[Video] Buffering:", isBuffering);
    setVideoBuffering(isBuffering);
  }, []);

  const handleVideoError = useCallback((e: any) => {
    console.error("[Video] Error:", e);
    setMVError(
      "Video playback error — " +
      (e?.error?.localizedDescription || e?.error?.domain || JSON.stringify(e?.error ?? e))
    );
    setVideoBuffering(false);
  }, []);

  const handleVideoSeekComplete = useCallback(({ currentTime }: { currentTime: number }) => {
    console.log("[Video] Seek completed:", currentTime);
    if (!isSeekingRef.current) setVideoPosition(currentTime);
  }, []);

  // ── Fullscreen sync ───────────────────────────────────────────────────────
  const handleFullscreenClose = useCallback((pos: number, dur: number) => {
    setVideoPosition(pos);
    if (dur > 0) setVideoDuration(dur);
    setIsFullscreen(false);
  }, []);

  const handleFullscreenSeek = useCallback((t: number) => {
    isSeekingRef.current = true;
    pendingSeekRef.current = t;
    setVideoPosition(t);
    videoRef.current?.seek(t);
    setTimeout(() => {
      pendingSeekRef.current = null;
      isSeekingRef.current = false;
    }, SEEK_SETTLE_MS);
  }, []);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isAdvOpen || !currentTrack) return null;

  // ── Fullscreen render ─────────────────────────────────────────────────────
  if (isFullscreen && mvData) {
    return (
      <VideoPlayer
        mvData={mvData}
        onClose={handleFullscreenClose}
        onDurationChange={(dur) => { if (dur > 0) setVideoDuration(dur); }}
        isPlaying={!videoPaused}
        onPlayPause={togglePlayPause}
        onSkipNext={handleSkipNext}
        onSkipPrevious={async () => skipPrevious()}
        position={activePos}
        duration={activeDur}
        onSeek={handleFullscreenSeek}
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <SafeAreaView style={styles.container} edges={["top"]}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={closeAdv}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.content}>

          {/* ── Artwork / Video ─────────────────────────────────────────── */}
          {isVideoMode && mvData ? (
            <View style={styles.videoWrapper}>
              <Video
                ref={videoRef}
                key={`mv-${videoKey}`}
                source={{ uri: mvData.stream_url }}
                style={StyleSheet.absoluteFill}
                muted={false}
                paused={videoPaused}
                resizeMode={ResizeMode.CONTAIN}
                repeat={false}
                ignoreSilentSwitch="ignore"
                playInBackground={false}
                playWhenInactive={false}
                progressUpdateInterval={250}
                bufferConfig={{
                  minBufferMs: 2500,
                  maxBufferMs: 20000,
                  bufferForPlaybackMs: 1000,
                  bufferForPlaybackAfterRebufferMs: 2000,
                }}
                onLoad={handleVideoLoad}
                onProgress={handleVideoProgress}
                onBuffer={handleVideoBuffer}
                onError={handleVideoError}
                onSeek={handleVideoSeekComplete}
              />

              {(videoBuffering || !isVideoReady) && (
                <View style={styles.videoOverlay}>
                  <ActivityIndicator size="large" color="#1DB954" />
                  {!isVideoReady && (
                    <Text style={styles.videoLoadingLabel}>Loading video…</Text>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.expandBtn}
                activeOpacity={0.8}
                onPress={() => setIsFullscreen(true)}
              >
                <Ionicons name="expand" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: currentTrack.thumbnail_url || currentTrack.thumbnail }}
              style={styles.artwork}
            />
          )}

          {/* ── Track info ─────────────────────────────────────────────── */}
          <View style={styles.infoRow}>
            <View
              style={styles.infoLeft}
              onLayout={(e: LayoutChangeEvent) =>
                setTitleContainerWidth(e.nativeEvent.layout.width)
              }
            >
              {/* Video / Audio mode pill */}
              <TouchableOpacity
                style={[styles.modePill, isVideoMode && styles.modePillActive]}
                activeOpacity={0.7}
                onPress={handleVideoSwitch}
                disabled={isMVLoading}
              >
                {isMVLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isVideoMode ? "musical-notes" : "videocam"}
                    size={13}
                    color="#fff"
                  />
                )}
                <Text style={styles.modePillText}>
                  {isMVLoading
                    ? "Loading…"
                    : isVideoMode
                      ? "Switch to audio"
                      : "Switch to video"}
                </Text>
              </TouchableOpacity>

              {mvError && <Text style={styles.errorText}>{mvError}</Text>}

              {/* Scrolling title */}
              {isTitleOverflowing ? (
                <MarqueeTitle text={titleText} textStyle={styles.trackTitle} />
              ) : (
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {titleText}
                </Text>
              )}

              {/* Invisible measuring text */}
              <Text
                style={[
                  styles.trackTitle,
                  { position: "absolute", opacity: 0, width: 3000, zIndex: -1 },
                ]}
                numberOfLines={1}
                onTextLayout={(e) => {
                  if (titleContainerWidth > 0 && e.nativeEvent.lines[0]) {
                    setIsTitleOverflowing(
                      e.nativeEvent.lines[0].width > titleContainerWidth
                    );
                  }
                }}
              >
                {titleText}
              </Text>

              <Text style={styles.trackArtist} numberOfLines={1}>
                {artistText}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add-circle-outline" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Progress bar ────────────────────────────────────────────── */}
          <View
            style={styles.progressWrap}
            onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
          >
            <View style={styles.progressTrack} />
            <View
              style={[
                styles.progressFill,
                { width: `${progressFraction * 100}%` },
              ]}
            />
            {barWidth > 0 && (
              <View style={[styles.thumb, { left: thumbLeft }]} />
            )}
            <View
              style={styles.progressTouchArea}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const x = e.nativeEvent.locationX;
                const dur = isVideoMode ? activeDur : duration;
                if (dur) setPreviewSec(Math.max(0, Math.min(dur, (x / barWidth) * dur)));
              }}
              onResponderMove={(e) => {
                const x = e.nativeEvent.locationX;
                const dur = isVideoMode ? activeDur : duration;
                if (dur) setPreviewSec(Math.max(0, Math.min(dur, (x / barWidth) * dur)));
              }}
              onResponderRelease={async (e) => {
                setPreviewSec(null);
                await handleSeek(e.nativeEvent.locationX);
              }}
            />
          </View>

          {/* ── Time ───────────────────────────────────────────────────── */}
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(activePos)}</Text>
            <Text style={styles.timeText}>{formatTime(activeDur)}</Text>
          </View>

          {/* ── Controls ────────────────────────────────────────────────── */}
          <View style={styles.controls}>
            {/* Shuffle */}
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => setIsShuffle((v) => !v)}
            >
              <Ionicons
                name="shuffle"
                size={24}
                color={isShuffle ? "#1DB954" : "#fff"}
              />
              {isShuffle && <View style={styles.dot} />}
            </TouchableOpacity>

            {/* Previous */}
            <TouchableOpacity style={styles.skipBtn} onPress={() => skipPrevious()}>
              <Ionicons name="play-skip-back" size={36} color="#fff" />
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              style={styles.playBtn}
              onPress={togglePlayPause}
              disabled={showLoading}
              activeOpacity={0.85}
            >
              {showLoading ? (
                <ActivityIndicator size="large" color="#000" />
              ) : (
                <Ionicons
                  name={showPlayingIcon ? "pause" : "play"}
                  size={42}
                  color="#000"
                  style={!showPlayingIcon ? { marginLeft: 4 } : undefined}
                />
              )}
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipNext}>
              <Ionicons name="play-skip-forward" size={36} color="#fff" />
            </TouchableOpacity>

            {/* Repeat */}
            <TouchableOpacity style={styles.sideBtn} onPress={cycleRepeat}>
              <Ionicons
                name="repeat"
                size={24}
                color={repeatMode !== "off" ? "#1DB954" : "#fff"}
              />
              {repeatMode !== "off" && (
                <>
                  <View style={styles.dot} />
                  {repeatMode === "track" && (
                    <Text style={styles.repeatOneLabel}>1</Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0e0e0e",
    zIndex: 9999,
  },
  container: {
    flex: 1,
    paddingBottom: 90,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },

  // Header
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Artwork
  artwork: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 20,
  },

  // Video
  videoWrapper: {
    width: SCREEN_WIDTH - 20,
    height: 205,
    borderRadius: 14,
    marginTop: 49.5,
    marginBottom: 57.5,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoLoadingLabel: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 8,
  },
  expandBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 7,
    borderRadius: 20,
  },

  // Track info
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 16,
    minHeight: 80,
  },
  infoLeft: {
    flex: 1,
    minWidth: 0, // critical: lets flex children shrink below their natural width
    alignItems: "flex-start",
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    alignSelf: "flex-end",
  },

  // Mode pill
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "transparent",
    height: 32,
    minWidth: 150,
  },
  modePillActive: {
    backgroundColor: "rgba(29,185,84,0.15)",
    borderColor: "#1DB954",
  },
  modePillText: {
    color: "#e0e0e0",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 11,
    marginBottom: 4,
  },

  // Title & artist
  trackTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 1,
    marginRight: 20,
    lineHeight: 25,
  },
  trackArtist: {
    color: "#888",
    fontSize: 15,
    marginBottom: -10,
    fontWeight: "500",
  },

  // Progress bar
  progressWrap: {
    width: "90%",
    height: 30,
    marginTop: 28,
    justifyContent: "center",
    position: "relative",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#2d2d2d",
    borderRadius: 2,
  },
  progressFill: {
    position: "absolute",
    left: 0,
    height: 3,
    backgroundColor: "#1DB954",
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    top: "50%",
    marginTop: -7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  progressTouchArea: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 30,
    top: "50%",
    marginTop: -15,
    backgroundColor: "transparent",
  },

  // Time
  timeRow: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  timeText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginTop: -2,
  },

  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 12,
  },
  sideBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  skipBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  dot: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1DB954",
  },
  repeatOneLabel: {
    position: "absolute",
    color: "#1DB954",
    fontSize: 10,
    fontWeight: "800",
    top: 8,
    right: 9,
    letterSpacing: -0.5,
  },
});