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
  Modal,
  FlatList,
  Alert,
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
import VisualizerPlayer from "./VisualizerPlayer";
import { PlaylistApi, PlaylistResponse, TrackAdd } from "./PlaylistApi";

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
export type DisplayMode = "audio" | "video" | "visualizer";

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
  const [displayMode, setDisplayMode] = useState<DisplayMode>("audio");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  // ── Playlist Modal State ──────────────────────────────────────────────────
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<PlaylistResponse[]>([]);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());

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
  const videoPositionRef = useRef(0);

  useEffect(() => { videoPausedRef.current = videoPaused; }, [videoPaused]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isVideoMode = displayMode === "video";
  const isVisualizerMode = displayMode === "visualizer";
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
    setDisplayMode("audio");
    setIsModeDropdownOpen(false);
    setPlaylistModalVisible(false);
    setMvData(null);
    setIsVideoReady(false);
    setVideoPaused(true);
    videoPausedRef.current = true;
    setMVError(null);
    setIsFullscreen(false);
    setVideoPosition(0);
    videoPositionRef.current = 0;
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
          videoPositionRef.current = target;
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
  const handleModeChange = useCallback(async (newMode: DisplayMode) => {
    if (newMode === displayMode) {
      setIsModeDropdownOpen(false);
      return;
    }

    const prevMode = displayMode;
    setDisplayMode(newMode);
    setIsModeDropdownOpen(false);

    if (prevMode === "video") {
      // ── Restore audio ────────────────────────────────────────────────────
      const snapPos = videoPositionRef.current;

      setMvData(null);
      setIsVideoReady(false);
      setVideoPlaying(false);
      setMVError(null);
      setIsFullscreen(false);
      setVideoBuffering(false);
      setVideoPosition(0);
      videoPositionRef.current = 0;
      setVideoDuration(0);

      try {
        await TrackPlayer.seekTo(snapPos);
        await TrackPlayer.play();
      } catch (e: any) {
        console.error("[MV] restore audio error:", e?.message ?? e);
        try { await TrackPlayer.play(); } catch (_) { }
      }

      if (newMode === "visualizer") return;
    }

    if (newMode === "video") {
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
        videoPositionRef.current = snapPos;
        setVideoKey((k) => k + 1);
        setMvData(data);
        setVideoPlaying(false); // autoplay triggered by onLoad
      } catch (e: any) {
        console.error("[MV] error:", e?.message ?? e);
        setMVError("Couldn't load MV: " + (e?.message ?? "unknown error"));
        setDisplayMode("audio");
        setVideoPlaying(false);
        try { await TrackPlayer.play(); } catch (_) { }
      } finally {
        setIsMVLoading(false);
      }
    }
  }, [displayMode, currentTrack, position, setVideoPlaying, videoPosition]);

  // ── Video callbacks ───────────────────────────────────────────────────────
  const handleVideoLoad = useCallback((meta: any) => {
    console.log("[Video] Loaded. Duration:", meta?.duration);
    setIsVideoReady(true);
    setVideoBuffering(false);
    if (meta?.duration) setVideoDuration(meta.duration);

    const snapPos = videoPositionRef.current;
    if (videoRef.current && snapPos > 0) videoRef.current.seek(snapPos);
    setTimeout(() => setVideoPlaying(true), VIDEO_AUTOPLAY_DELAY_MS);
  }, [setVideoPlaying]);

  const handleVideoProgress = useCallback(({ currentTime }: { currentTime: number }) => {
    if (!isSeekingRef.current) {
      setVideoPosition(currentTime);
      videoPositionRef.current = currentTime;
    }
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
    if (!isSeekingRef.current) {
      setVideoPosition(currentTime);
      videoPositionRef.current = currentTime;
    }
  }, []);

  // ── Fullscreen sync ───────────────────────────────────────────────────────
  const handleFullscreenClose = useCallback((pos: number, dur: number) => {
    setVideoPosition(pos);
    videoPositionRef.current = pos;
    if (dur > 0) setVideoDuration(dur);
    setIsFullscreen(false);
  }, []);

  const handleFullscreenSeek = useCallback((t: number) => {
    isSeekingRef.current = true;
    pendingSeekRef.current = t;
    setVideoPosition(t);
    videoPositionRef.current = t;
    videoRef.current?.seek(t);
    setTimeout(() => {
      pendingSeekRef.current = null;
      isSeekingRef.current = false;
    }, SEEK_SETTLE_MS);
  }, []);

  const fetchSavedTracks = async () => {
    try {
      const playlists = await PlaylistApi.getMyPlaylists();
      const allVideoIds = new Set<string>();
      await Promise.all(
        playlists.map(async (playlist) => {
          try {
            const tracks = await PlaylistApi.getTracks(playlist.id);
            tracks.forEach(t => allVideoIds.add(t.video_id));
          } catch (err) {
            console.error("Failed to fetch tracks for playlist", playlist.id, err);
          }
        })
      );
      setSavedVideoIds(allVideoIds);
    } catch (e) {
      console.error("Failed to fetch saved tracks:", e);
    }
  };

  useEffect(() => {
    if (isAdvOpen) {
      fetchSavedTracks();
    }
  }, [isAdvOpen, currentTrack?.videoId]);

  // ── Playlist Functions ────────────────────────────────────────────────────
  const handleOpenAddToPlaylist = async () => {
    setPlaylistModalVisible(true);
    setIsPlaylistsLoading(true);
    try {
      const playlists = await PlaylistApi.getMyPlaylists();
      setUserPlaylists(playlists);
    } catch (e) {
      console.error("Failed to load playlists", e);
      Alert.alert("Error", "Could not load playlists. Please ensure you are logged in.");
    } finally {
      setIsPlaylistsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!currentTrack) return;
    try {
      let finalImageUrl = currentTrack.thumbnail_url || currentTrack.thumbnail || null;
      if (finalImageUrl && finalImageUrl.startsWith("http")) {
        try {
          const res = await fetch(finalImageUrl);
          const blob = await res.blob();
          finalImageUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.error("Error fetching/encoding image:", fetchErr);
        }
      }

      const trackAdd: TrackAdd = {
        video_id: currentTrack.videoId || String(Date.now()), // Fallback ID if missing
        title: currentTrack.title || currentTrack.song_name || "Unknown",
        artist: currentTrack.uploader || currentTrack.artist_name || null,
        image_url: finalImageUrl,
        duration_seconds: Math.floor(isVideoMode ? videoDuration : duration) || undefined
      };

      await PlaylistApi.addTrack(playlistId, trackAdd);
      Alert.alert("Success", "Added to playlist!");
      setPlaylistModalVisible(false);
      const trackId = currentTrack.videoId || trackAdd.video_id;
      if (trackId) {
        setSavedVideoIds(prev => new Set(prev).add(trackId));
      }
    } catch (e: any) {
      console.error("Failed to add track to playlist", e);
      Alert.alert("Error", e?.response?.data?.detail || "Could not add track to playlist.");
    }
  };

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

          {/* ── Artwork / Video / Visualizer ─────────────────────────────── */}
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
          ) : isVisualizerMode ? (
            <View style={styles.videoWrapper}>
              <VisualizerPlayer isPlaying={isAudioPlaying} />
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
              {/* Video / Audio / Visualizer mode pill (dropdown) */}
              <View style={{ zIndex: 100 }}>
                <TouchableOpacity
                  style={[styles.modePill, isVideoMode && styles.modePillActive, isVisualizerMode && styles.modePillVisActive]}
                  activeOpacity={0.7}
                  onPress={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  disabled={isMVLoading}
                >
                  {isMVLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name={isVideoMode ? "videocam" : isVisualizerMode ? "pulse" : "musical-notes"}
                      size={13}
                      color="#fff"
                    />
                  )}
                  <Text style={styles.modePillText}>
                    {isMVLoading
                      ? "Loading…"
                      : displayMode === "video"
                        ? "Video"
                        : displayMode === "visualizer"
                          ? "Visualizer"
                          : "Audio"}{" "}▼
                  </Text>
                </TouchableOpacity>

                {isModeDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleModeChange("audio")}>
                      <Ionicons name="musical-notes" size={14} color="#ccc" style={styles.dropdownIcon} />
                      <Text style={styles.dropdownItemText}>Audio</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleModeChange("video")}>
                      <Ionicons name="videocam" size={14} color="#ccc" style={styles.dropdownIcon} />
                      <Text style={styles.dropdownItemText}>Video</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleModeChange("visualizer")}>
                      <Ionicons name="pulse" size={14} color="#ccc" style={styles.dropdownIcon} />
                      <Text style={styles.dropdownItemText}>Visualizer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

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
              onPress={() => {
                if (currentTrack.videoId && !savedVideoIds.has(currentTrack.videoId)) {
                  handleOpenAddToPlaylist();
                }
              }}
            >
              <Ionicons
                name={currentTrack.videoId && savedVideoIds.has(currentTrack.videoId) ? "checkmark-circle" : "add-circle-outline"}
                size={30}
                color={currentTrack.videoId && savedVideoIds.has(currentTrack.videoId) ? "#1DB954" : "#fff"}
              />
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

        {/* ── Add to Playlist Modal ──────────────────────────────────────── */}
        <Modal visible={isPlaylistModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add to Playlist</Text>
                <TouchableOpacity onPress={() => setPlaylistModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {isPlaylistsLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#1DB954" />
                </View>
              ) : (
                <FlatList
                  data={userPlaylists}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.playlistItem}
                      onPress={() => handleAddToPlaylist(item.id)}
                    >
                      <Ionicons name="list-outline" size={24} color="#ccc" style={{ marginRight: 12 }} />
                      <View>
                        <Text style={styles.playlistItemName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.playlistItemDesc}>{item.description}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyPlaylistsText}>
                      No playlists available. Please create one first!
                    </Text>
                  }
                  style={styles.playlistList}
                />
              )}
            </View>
          </View>
        </Modal>

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
    zIndex: 100,
    elevation: 100,
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
    marginLeft: 7,
    alignSelf: "flex-end",
    marginBottom: 6,
  },

  // Mode pill
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  modePillActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  modePillVisActive: {
    backgroundColor: "rgba(29, 185, 84, 0.2)",
  },
  modePillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  dropdownMenu: {
    position: "absolute",
    top: 36,
    left: 0,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingVertical: 8,
    width: 140,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownItemText: {
    color: "#ccc",
    fontSize: 14,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  playlistList: {
    marginTop: 8,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  playlistItemName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  playlistItemDesc: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },
  emptyPlaylistsText: {
    color: "#888",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
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
    marginRight: 30,
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