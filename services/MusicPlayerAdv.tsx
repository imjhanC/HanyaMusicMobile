import React, { useState, useRef, useEffect } from "react";
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
// import { HANYAMUSIC_URL } from "@env";

const formatTime = (secs: number) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export interface MVData {
  stream_url: string;   // Cloudflare proxy URL — used for <Video> playback (supports 206 partial)
  video_url: string;    // Raw YouTube video URL (kept for reference)
  audio_url: string;
  title: string;
  duration: number;
  thumbnail_url: string;
  quality: string;
  stream_type: string;
  cached?: boolean;
}

// Constants for sync thresholds
const SYNC_THRESHOLD = 0.3; // seconds - when to trigger sync
const MAX_SYNC_ATTEMPTS = 3; // prevent infinite sync loops
const SYNC_COOLDOWN = 2000; // ms to wait between syncs

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

  const [barWidth, setBarWidth] = useState(0);
  const [previewSec, setPreviewSec] = useState<number | null>(null);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(true);
  const [titleContainerWidth, setTitleContainerWidth] = useState(0);

  // ── Video mode ────────────────────────────────────────────────────────────
  // stream_url = Cloudflare proxy, combined video+audio (206 partial content)
  // In video mode: <Video> owns playback entirely; TrackPlayer is paused/silent.
  const [mvData, setMvData] = useState<MVData | null>(null);
  const [isMVLoading, setIsMVLoading] = useState(false);
  const [mvError, setMVError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoKey, setVideoKey] = useState(0);
  const [videoBuffering, setVideoBuffering] = useState(false);
  // Standalone position/duration tracked from the video's onProgress
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  const videoPlayerRef = useRef<any>(null);
  const originalAudioUrlRef = useRef<string | null>(null);
  const originalTrackMetaRef = useRef<any>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const videoPausedRef = useRef(true);
  const isVideoModeRef = useRef(false);

  useEffect(() => { videoPausedRef.current = videoPaused; }, [videoPaused]);
  useEffect(() => { isVideoModeRef.current = mvData !== null; }, [mvData]);

  const isVideoMode = mvData !== null;

  // In video mode use the video's own position/duration; otherwise use TrackPlayer's
  const activePos = isVideoMode ? (previewSec ?? pendingSeekRef.current ?? videoPosition) : (previewSec ?? pendingSeekRef.current ?? position);
  const activeDur = isVideoMode ? videoDuration : duration;
  const effectivePos = activePos;
  const titleText = currentTrack?.title || currentTrack?.song_name || "";

  const setVideoPlaying = (playing: boolean) => {
    videoPausedRef.current = !playing;
    setVideoPaused(!playing);
  };

  useEffect(() => { setIsTitleOverflowing(true); }, [titleText]);

  // Reset video state on track change
  useEffect(() => {
    setMvData(null);
    setIsVideoReady(false);
    setVideoPlaying(false);
    setMVError(null);
    setIsFullscreen(false);
    setVideoPosition(0);
    setVideoDuration(0);
    originalAudioUrlRef.current = null;
    originalTrackMetaRef.current = null;
  }, [currentTrack?.title, currentTrack?.song_name]);

  // Handle video progress — this IS the source of truth in video mode
  const handleVideoProgress = (data: { currentTime: number }) => {
    if (!isSeekingRef.current) {
      setVideoPosition(data.currentTime);
    }
  };

  if (!isAdvOpen || !currentTrack) return null;

  const isPlaying = playbackState?.state === State.Playing && !isTransitioning;
  const showLoading = isTrackLoading || isTransitioning || (isVideoMode && (videoBuffering || !isVideoReady));

  const showPlayingIcon = isVideoMode ? !videoPaused : isPlaying;

  // ── Seek ─────────────────────────────────────────────────────────────────
  const handleSeekFromX = async (x: number) => {
    const seekDur = isVideoMode ? activeDur : duration;
    if (barWidth <= 0 || !seekDur || seekDur <= 0) return;
    const target = Math.max(0, Math.min(1, x / barWidth)) * seekDur;

    isSeekingRef.current = true;
    pendingSeekRef.current = target;

    try {
      if (isVideoMode) {
        // Video mode: only seek the video player — it owns audio too
        if (videoPlayerRef.current && isVideoReady) {
          videoPlayerRef.current.seek(target);
          setVideoPosition(target);
        }
      } else {
        // Audio mode: only seek TrackPlayer
        await TrackPlayer.seekTo(target);
      }
    } catch (error) {
      console.error("[Seek] error:", error);
    }

    setTimeout(() => {
      pendingSeekRef.current = null;
      isSeekingRef.current = false;
    }, 300);
  };

  const togglePlayPause = async () => {
    if (isVideoMode) {
      // Video mode: only control the video component — it owns playback/audio
      setVideoPlaying(videoPausedRef.current); // if paused → play, if playing → pause
    } else {
      const s = await TrackPlayer.getState();
      if (s === State.Playing) await TrackPlayer.pause();
      else await TrackPlayer.play();
    }
  };

  const handleSkipNext = async () => {
    if (isShuffle && queue.length > 1) {
      playTrack({ ...queue[Math.floor(Math.random() * queue.length)], isSearchBased: true });
    } else {
      await skipNext();
    }
  };

  const toggleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("once");
    else if (repeatMode === "once") setRepeatMode("track");
    else setRepeatMode("off");
  };

  // ── Video / Audio switch ──────────────────────────────────────────────────
  const handleVideoSwitch = async () => {
    if (isVideoMode) {
      // ── Switch BACK to audio ────────────────────────────────────────────
      const snapPos = videoPosition; // capture position before clearing state
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
          await new Promise(r => setTimeout(r, 150));
          await TrackPlayer.seekTo(snapPos);
          await TrackPlayer.play();
        } catch (e: any) {
          console.error("[MV] restore audio error:", e?.message || e);
          try { await TrackPlayer.play(); } catch (_) { }
        }
      }
      return;
    }

    // ── Switch TO video ───────────────────────────────────────────────────
    // stream_url is a Cloudflare proxy that combines video+audio into a single
    // HTTP-206 stream — no separate TrackPlayer audio needed.
    const songTitle = currentTrack?.title || currentTrack?.song_name || "";
    const artistName = currentTrack?.uploader || currentTrack?.artist_name || "";

    if (!songTitle) {
      setMVError("No song title — cannot search for MV.");
      return;
    }

    setIsMVLoading(true);
    setMVError(null);
    setIsVideoReady(false);
    setVideoBuffering(false);

    try {
      const API_BASE_URL = await ServiceManager.getHanyaMusicUrl();
      const reqUrl =
        `${API_BASE_URL}/search/exactwithMVMobile` +
        `?song_title=${encodeURIComponent(songTitle)}` +
        `&artist=${encodeURIComponent(artistName)}`;

      console.log("[MV] Fetching:", reqUrl);
      const res = await fetch(reqUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MVData = await res.json();

      if (!data.stream_url) throw new Error("Response missing stream_url");
      console.log("[MV] stream_url:", data.stream_url);
      console.log("[MV] quality:", data.quality, "| cached:", data.cached);

      // Snapshot current audio position for later restore
      const snapPos = position;
      originalAudioUrlRef.current = currentTrack.audio_url || currentTrack.url || "";
      originalTrackMetaRef.current = {
        title: currentTrack.title || currentTrack.song_name || "",
        artist: currentTrack.uploader || currentTrack.artist_name || "",
        artwork: currentTrack.thumbnail_url || currentTrack.thumbnail || "",
        snapPos,
      };

      // Pause TrackPlayer — video+audio will come from stream_url
      try { await TrackPlayer.pause(); } catch (_) { }

      // Pre-set duration from API data
      setVideoDuration(data.duration || 0);
      setVideoPosition(snapPos);

      // Mount video
      setVideoKey(prev => prev + 1);
      setMvData(data);
      setVideoPlaying(false); // will autoplay after load

    } catch (e: any) {
      console.error("[MV] error:", e?.message || e);
      setMVError("Couldn't load MV: " + (e?.message || "unknown error"));
      setVideoPlaying(false);
      // Resume audio on failure
      try { await TrackPlayer.play(); } catch (_) { }
    } finally {
      setIsMVLoading(false);
    }
  };

  const handleVideoLoad = (meta: any) => {
    console.log("[Video] Loaded. Duration:", meta?.duration);
    setIsVideoReady(true);
    setVideoBuffering(false);
    if (meta?.duration) setVideoDuration(meta.duration);

    // Seek to audio position then autoplay
    const snapPos = originalTrackMetaRef.current?.snapPos ?? 0;
    if (videoPlayerRef.current && snapPos > 0) {
      videoPlayerRef.current.seek(snapPos);
    }
    setTimeout(() => setVideoPlaying(true), 150);
  };

  const handleVideoBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    console.log("[Video] Buffering:", isBuffering);
    setVideoBuffering(isBuffering);
  };

  const handleVideoError = (e: any) => {
    console.error("[Video] Error:", e);
    setMVError("Video playback error — " + (e?.error?.localizedDescription || e?.error?.domain || JSON.stringify(e?.error || e)));
    setVideoBuffering(false);
  };

  const circlePosition = (effectivePos / (activeDur || 1)) * barWidth;
  const clampedPosition = Math.max(0, Math.min(circlePosition, barWidth));

  // ── Full-screen ───────────────────────────────────────────────────────────
  if (isFullscreen && mvData) {
    return (
      <VideoPlayer
        mvData={mvData}
        onClose={(pos, dur) => {
          // Sync position and duration back when user collapses to mini-player
          setVideoPosition(pos);
          if (dur > 0) setVideoDuration(dur);
          setIsFullscreen(false);
        }}
        onDurationChange={(dur) => {
          // Update duration immediately when video metadata is read
          if (dur > 0) setVideoDuration(dur);
        }}
        isPlaying={!videoPaused}
        onPlayPause={togglePlayPause}
        onSkipNext={handleSkipNext}
        onSkipPrevious={async () => skipPrevious()}
        position={effectivePos}
        duration={activeDur}
        onSeek={(t) => {
          isSeekingRef.current = true;
          pendingSeekRef.current = t;
          setVideoPosition(t);
          // Also seek the mini-player videoRef so it's in sync when collapsing
          if (videoPlayerRef.current) {
            videoPlayerRef.current.seek(t);
          }
          setTimeout(() => {
            pendingSeekRef.current = null;
            isSeekingRef.current = false;
          }, 300);
        }}
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <SafeAreaView style={styles.container} edges={["top"]}>

        <View style={styles.header}>
          <TouchableOpacity onPress={closeAdv} style={styles.headerButton}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Now Playing</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.content}>

          {isVideoMode && mvData ? (
            <View style={styles.videoContainer}>
              <Video
                ref={videoPlayerRef}
                key={`video-${videoKey}`}
                source={{ uri: mvData.stream_url }}
                style={styles.videoPlayer}
                muted={false}           // stream_url carries video+audio; play both
                paused={videoPaused}
                resizeMode={ResizeMode.CONTAIN}
                repeat={false}
                ignoreSilentSwitch="ignore"
                playInBackground={false}
                playWhenInactive={false}
                onLoad={handleVideoLoad}
                onProgress={handleVideoProgress}
                onError={handleVideoError}
                onBuffer={handleVideoBuffer}
                onSeek={(data) => {
                  console.log("[Video] Seek completed:", data.currentTime);
                  if (!isSeekingRef.current) setVideoPosition(data.currentTime);
                }}
                progressUpdateInterval={250}
                bufferConfig={{
                  minBufferMs: 2500,
                  maxBufferMs: 20000,
                  bufferForPlaybackMs: 1000,
                  bufferForPlaybackAfterRebufferMs: 2000,
                }}
              />
              {(videoBuffering || !isVideoReady) && (
                <View style={styles.videoLoadingOverlay}>
                  <ActivityIndicator size="large" color="#1DB954" />
                  {!isVideoReady && (
                    <Text style={styles.loadingText}>Loading video...</Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.expandButton}
                activeOpacity={0.8}
                onPress={() => setIsFullscreen(true)}
              >
                <Ionicons name="expand" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: currentTrack.thumbnail_url || currentTrack.thumbnail }}
              style={styles.artwork}
            />
          )}

          <View style={styles.titleRow}>
            <View
              style={styles.textContainer}
              onLayout={(e: LayoutChangeEvent) => setTitleContainerWidth(e.nativeEvent.layout.width)}
            >
              <TouchableOpacity
                style={[
                  styles.videoSwitchButton,
                  isVideoMode && styles.videoSwitchButtonActive,
                ]}
                activeOpacity={0.7}
                onPress={handleVideoSwitch}
                disabled={isMVLoading}
              >
                {isMVLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name={isVideoMode ? "musical-notes" : "videocam"}
                    size={14}
                    color="#fff"
                  />
                )}
                <Text style={styles.videoSwitchText}>
                  {isMVLoading ? "Loading…" : isVideoMode ? "Switch to audio" : "Switch to video"}
                </Text>
              </TouchableOpacity>

              {mvError != null && (
                <Text style={styles.mvErrorText}>{mvError}</Text>
              )}

              {isTitleOverflowing ? (
                <MarqueeTitle text={titleText} textStyle={styles.title} />
              ) : (
                <Text style={styles.title} numberOfLines={1}>{titleText}</Text>
              )}

              <Text
                style={[styles.title, { position: "absolute", opacity: 0, width: 3000 }]}
                numberOfLines={1}
                onTextLayout={(e) => {
                  if (titleContainerWidth > 0 && e.nativeEvent.lines[0]) {
                    setIsTitleOverflowing(e.nativeEvent.lines[0].width > titleContainerWidth);
                  }
                }}
              >
                {titleText}
              </Text>

              <Text style={styles.artist} numberOfLines={1}>
                {currentTrack.uploader || currentTrack.artist_name}
              </Text>
            </View>

            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <View
            style={styles.progressContainer}
            onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
          >
            <View style={styles.progressBarBg} />
            <View
              style={[
                styles.progressBarFg,
                { width: `${(effectivePos / (activeDur || 1)) * 100 || 0}%` },
              ]}
            />
            {barWidth > 0 && (
              <View style={[styles.progressThumb, { left: clampedPosition - 8 }]}>
                <View style={styles.progressThumbInner} />
              </View>
            )}
            <View
              style={styles.touchableArea}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const x = e.nativeEvent.locationX;
                if (duration) setPreviewSec(Math.max(0, Math.min(duration, (x / barWidth) * duration)));
              }}
              onResponderMove={(e) => {
                const x = e.nativeEvent.locationX;
                if (duration) setPreviewSec(Math.max(0, Math.min(duration, (x / barWidth) * duration)));
              }}
              onResponderRelease={async (e) => {
                const x = e.nativeEvent.locationX;
                setPreviewSec(null);
                await handleSeekFromX(x);
              }}
            />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(effectivePos || 0)}</Text>
            <Text style={styles.timeText}>{formatTime(activeDur || 0)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={() => setIsShuffle(!isShuffle)} style={styles.sideButton}>
              <Ionicons name="shuffle" size={24} color={isShuffle ? "#1DB954" : "#fff"} />
              {isShuffle && <View style={styles.activeDot} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => skipPrevious()} style={styles.skipButton}>
              <Ionicons name="play-skip-back" size={36} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playPauseButton}
              disabled={showLoading}
            >
              {showLoading ? (
                <ActivityIndicator size="large" color="#000" />
              ) : (
                <Ionicons
                  name={showPlayingIcon ? "pause" : "play"}
                  size={42}
                  color="#000"
                  style={!showPlayingIcon ? { marginLeft: 4 } : {}}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkipNext} style={styles.skipButton}>
              <Ionicons name="play-skip-forward" size={36} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleRepeat} style={styles.sideButton}>
              <Ionicons
                name="repeat"
                size={24}
                color={repeatMode === "once" || repeatMode === "track" ? "#1DB954" : "#fff"}
              />
              {(repeatMode === "once" || repeatMode === "track") && (
                <>
                  <View style={styles.activeDot} />
                  {repeatMode === "track" && <Text style={styles.repeatOneText}>1</Text>}
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: "#121212",
    zIndex: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingBottom: 90
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600"
  },
  content: {
    flex: 1,
    alignItems: "center",
    padding: 16
  },
  artwork: {
    width: 280,
    height: 280,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16
  },
  videoContainer: {
    width: Dimensions.get("window").width - 20,
    height: 200,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
  },
  videoPlayer: {
    width: "100%",
    height: "100%"
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 8,
    fontSize: 12,
  },
  expandButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 20,
  },
  textContainer: {
    flex: 1,
    alignItems: "flex-start"
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 20,
    marginTop: 30,
  },
  videoSwitchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(50,50,50,0.7)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginBottom: 8,
    minWidth: 150,
    zIndex: 1000,
    elevation: 10,
  },
  videoSwitchButtonActive: {
    backgroundColor: "rgba(29,185,84,0.25)",
    borderWidth: 1,
    borderColor: "#1DB954",
  },
  videoSwitchText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  mvErrorText: {
    color: "#ff6b6b",
    fontSize: 11,
    marginBottom: 4,
    flexShrink: 1
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "left"
  },
  artist: {
    color: "#bbb",
    fontSize: 16,
    marginBottom: -18,
    textAlign: "left"
  },
  progressContainer: {
    width: "90%",
    height: 30,
    marginTop: 30,
    justifyContent: "center",
    position: "relative",
  },
  progressBarBg: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
  },
  progressBarFg: {
    position: "absolute",
    left: 0,
    height: 4,
    backgroundColor: "#1DB954",
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
    top: "50%",
    marginTop: -8,
    elevation: 3,
  },
  progressThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1DB954"
  },
  touchableArea: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 30,
    top: "50%",
    marginTop: -15,
    backgroundColor: "transparent",
  },
  timeRow: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    color: "#aaa",
    fontSize: 12
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 10,
  },
  sideButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  skipButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center"
  },
  playPauseButton: {
    width: 65,
    height: 65,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1DB954",
  },
  repeatOneText: {
    position: "absolute",
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "bold",
    top: 8,
    right: 10,
  },
});