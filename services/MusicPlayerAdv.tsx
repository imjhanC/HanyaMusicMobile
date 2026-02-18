import React, { useState, useRef } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import TrackPlayer, { useProgress } from "react-native-track-player";
import { useMusicPlayer } from "./MusicPlayer";

const formatTime = (secs: number) => {
  if (!isFinite(secs) || secs < 0) secs = 0;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function MusicPlayerAdv() {
  const { currentTrack, isAdvOpen, closeAdv } = useMusicPlayer();
  const { position, duration } = useProgress();
  const [barWidth, setBarWidth] = useState(0);
  const [previewSec, setPreviewSec] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Keep a ref to the latest seek target so we can hold it during the async gap
  const pendingSeekRef = useRef<number | null>(null);

  // While dragging OR while waiting for seek to settle, use preview/pending value
  const effectivePos = previewSec ?? pendingSeekRef.current ?? position;

  if (!isAdvOpen || !currentTrack) return null;

  const handleSeekFromX = async (x: number) => {
    if (barWidth <= 0 || !duration || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    const target = ratio * duration;

    // Hold this value in the ref so effectivePos doesn't snap back
    pendingSeekRef.current = target;

    await TrackPlayer.seekTo(target);

    // Only clear after seek is done AND the live position has caught up
    // Give TrackPlayer a short moment to reflect the new position
    setTimeout(() => {
      pendingSeekRef.current = null;
    }, 300);
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
          <Image source={{ uri: currentTrack.thumbnail_url }} style={styles.artwork} />
          <Text style={styles.title} numberOfLines={2}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.uploader}</Text>

          <View
            style={styles.progressContainer}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          >
            {/* Progress bar background */}
            <View style={styles.progressBarBg} />

            {/* Progress bar foreground */}
            <View
              style={[
                styles.progressBarFg,
                { width: `${(effectivePos / (duration || 1)) * 100 || 0}%` }
              ]}
            />

            {/* Circle thumb */}
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

            {/* Touchable seek area */}
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
                // Clear previewSec first — pendingSeekRef will hold the position
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
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center"
  },
  artist: {
    color: "#bbb",
    fontSize: 14,
    marginTop: 6
  },
  progressContainer: {
    width: "90%",
    height: 40,
    marginTop: 24,
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
});