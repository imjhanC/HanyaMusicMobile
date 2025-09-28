import React, { useState } from "react";
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
  const effectivePos = previewSec ?? position;

  if (!isAdvOpen || !currentTrack) return null;

  const handleSeekFromX = async (x: number) => {
    if (barWidth <= 0 || !duration || duration <= 0) return;
    const ratio = Math.max(0, Math.min(1, x / barWidth));
    const target = ratio * duration;
    await TrackPlayer.seekTo(target);
  };

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
              await handleSeekFromX(x);
              setPreviewSec(null);
            }}
          >
            <View style={styles.progressBarBg} />
            <View style={[styles.progressBarFg, { width: `${(effectivePos / (duration || 1)) * 100 || 0}%` }]} />
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
    bottom: 90, // leave room for bottom tab
    justifyContent: "flex-end",
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
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
  headerButton: { width: 40, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  content: { flex: 1, alignItems: "center", padding: 16 },
  artwork: { width: 280, height: 280, borderRadius: 12, marginTop: 12, marginBottom: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center" },
  artist: { color: "#bbb", fontSize: 14, marginTop: 6 },
  progressContainer: { width: "90%", height: 10, marginTop: 24, justifyContent: "center" },
  progressBarBg: { position: "absolute", left: 0, right: 0, height: 4, backgroundColor: "#333", borderRadius: 2 },
  progressBarFg: { position: "absolute", left: 0, height: 4, backgroundColor: "#1DB954", borderRadius: 2 },
  timeRow: { width: "90%", flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  timeText: { color: "#aaa", fontSize: 12 },
});