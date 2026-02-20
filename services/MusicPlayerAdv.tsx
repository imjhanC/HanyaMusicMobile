import React, { useState, useRef, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import TrackPlayer, {
  useProgress,
  usePlaybackState,
  State,
  RepeatMode
} from "react-native-track-player";
import { useMusicPlayer, MarqueeTitle } from "./MusicPlayer";

const formatTime = (secs: number) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isTitleOverflowing, setIsTitleOverflowing] = useState(true); // default to marquee while measuring
  const [titleContainerWidth, setTitleContainerWidth] = useState(0);

  // Keep a ref to the latest seek target so we can hold it during the async gap
  const pendingSeekRef = useRef<number | null>(null);

  // While dragging OR while waiting for seek to settle, use preview/pending value
  const effectivePos = previewSec ?? pendingSeekRef.current ?? position;

  // Title overflow detection — reset to marquee (true) whenever the title changes
  const titleText = currentTrack?.title || currentTrack?.song_name || '';
  useEffect(() => {
    setIsTitleOverflowing(true);
  }, [titleText]);

  if (!isAdvOpen || !currentTrack) return null;

  const isPlaying = playbackState?.state === State.Playing && !isTransitioning;
  const showLoading = isTrackLoading || isTransitioning;

  const handleSeekFromX = async (x: number) => {
    if (barWidth <= 0 || !duration || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    const target = ratio * duration;

    pendingSeekRef.current = target;
    await TrackPlayer.seekTo(target);

    setTimeout(() => {
      pendingSeekRef.current = null;
    }, 300);
  };

  const togglePlayPause = async () => {
    const currentState = await TrackPlayer.getState();
    if (currentState === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleSkipNext = async () => {
    if (isShuffle && queue.length > 1) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      playTrack({ ...queue[randomIndex], isSearchBased: true });
    } else {
      await skipNext();
    }
  };

  const handleSkipPrevious = async () => {
    await skipPrevious();
  };

  const toggleRepeat = () => {
    if (repeatMode === "off") setRepeatMode("once");       // 1 press: repeat once then next
    else if (repeatMode === "once") setRepeatMode("track"); // 2 presses: repeat forever ("1")
    else setRepeatMode("off");                             // 3 presses: off
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const circlePosition = (effectivePos / (duration || 1)) * barWidth;
  const clampedPosition = Math.max(0, Math.min(circlePosition, barWidth));

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
          <Image source={{ uri: currentTrack.thumbnail_url || currentTrack.thumbnail }} style={styles.artwork} />

          <View style={styles.titleRow}>
            <View
              style={styles.textContainer}
              onLayout={(e) => setTitleContainerWidth(e.nativeEvent.layout.width)}
            >
              {isTitleOverflowing ? (
                <MarqueeTitle
                  text={titleText}
                  textStyle={styles.title}
                />
              ) : (
                <Text style={styles.title} numberOfLines={1}>{titleText}</Text>
              )}
              {/* Invisible text with unconstrained width to measure natural text width */}
              <Text
                style={[styles.title, { position: 'absolute', opacity: 0, width: 3000 }]}
                numberOfLines={1}
                onTextLayout={(e) => {
                  if (titleContainerWidth > 0 && e.nativeEvent.lines[0]) {
                    setIsTitleOverflowing(e.nativeEvent.lines[0].width > titleContainerWidth);
                  }
                }}
              >
                {titleText}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>{currentTrack.uploader || currentTrack.artist_name}</Text>
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View
            style={styles.progressContainer}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          >
            <View style={styles.progressBarBg} />
            <View
              style={[
                styles.progressBarFg,
                { width: `${(effectivePos / (duration || 1)) * 100 || 0}%` }
              ]}
            />
            {barWidth > 0 && (
              <View
                style={[
                  styles.progressThumb,
                  { left: clampedPosition - 8 },
                ]}
              >
                <View style={styles.progressThumbInner} />
              </View>
            )}
            <View
              style={styles.touchableArea}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                setIsDragging(true);
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
                setIsDragging(false);
                await handleSeekFromX(x);
              }}
            />
          </View>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(effectivePos || 0)}</Text>
            <Text style={styles.timeText}>{formatTime(duration || 0)}</Text>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.sideButton}>
              <Ionicons
                name="shuffle"
                size={24}
                color={isShuffle ? "#1DB954" : "#fff"}
              />
              {isShuffle && <View style={styles.activeDot} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkipPrevious} style={styles.skipButton}>
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
                  name={isPlaying ? "pause" : "play"}
                  size={42}
                  color="#000"
                  style={!isPlaying ? { marginLeft: 4 } : {}}
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
                color={(repeatMode === "once" || repeatMode === "track") ? "#1DB954" : "#fff"}
              />
              {(repeatMode === "once" || repeatMode === "track") && (
                <>
                  <View style={styles.activeDot} />
                  {repeatMode === "track" && (
                    <Text style={styles.repeatOneText}>1</Text>
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

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#121212",
    zIndex: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingBottom: 90,
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
    justifyContent: "center",
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 50,
  },
  textContainer: {
    flex: 1,
    alignItems: "flex-start",
    marginBottom: 0,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "left",
  },
  artist: {
    color: "#bbb",
    fontSize: 16,
    marginBottom: -10, // dont set to marginTop 
    textAlign: "left"
  },
  progressContainer: {
    width: "90%",
    height: 30,
    marginTop: 20,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  progressThumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1DB954",
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
    marginTop: 8
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
    justifyContent: "center",
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