import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Vibration, // 👈 added for haptic feedback
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { PlaylistApi, PlaylistResponse, TrackAdd, TrackResponse } from "../services/PlaylistApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackShape {
  videoId?: string;
  title?: string;
  song_name?: string;
  uploader?: string;
  artist_name?: string;
  thumbnail_url?: string;
  thumbnail?: string;
  audio_url?: string;
  url?: string;
}

interface PlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  currentTrack: TrackShape | null;
  duration?: number;
}

const LIKED_SONGS_NAME = "Liked Songs";
const SHEET_HEIGHT = 520;
const CLOSE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlaylistModal({
  visible,
  onClose,
  currentTrack,
  duration = 0,
}: PlaylistModalProps) {
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [playlists, setPlaylists] = useState<PlaylistResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedMap, setSavedMap] = useState<Record<number, TrackResponse | null>>({});
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const isClosing = useRef(false);
  const startYRef = useRef(0);
  const isDragging = useRef(false);

  // ── Slide animation when modal visibility changes ──────────────────────────
  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
      }).start();
      loadData();
    } else {
      isClosing.current = true;
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isClosing.current = false;
      });
    }
  }, [visible]);

  // ── PanResponder for draggable handle – follows finger exactly, vibrates on hold ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Haptic feedback when user grabs the handle
        Vibration.vibrate(1000); // short 10ms vibration

        // Get exact current position and stop any ongoing animation
        // @ts-ignore – _value is stable across RN versions
        const currentY = slideAnim._value;
        startYRef.current = currentY;
        isDragging.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isClosing.current || !isDragging.current) return;
        let newY = startYRef.current + gestureState.dy;
        // Clamp to prevent swiping beyond fully open (0) or fully closed (SHEET_HEIGHT)
        newY = Math.max(0, Math.min(SHEET_HEIGHT, newY));
        slideAnim.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isClosing.current || !isDragging.current) return;
        isDragging.current = false;
        // @ts-ignore
        const currentY = slideAnim._value;
        const isDraggingDown = gestureState.dy > 0;
        const shouldClose =
          currentY > CLOSE_THRESHOLD ||
          (isDraggingDown && gestureState.vy > VELOCITY_THRESHOLD);

        if (shouldClose) {
          onClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 60,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  // ── Load playlists and check if current track is saved ─────────────────────
  const loadData = useCallback(async () => {
    if (!currentTrack) return;
    setLoading(true);
    try {
      const all = await PlaylistApi.getMyPlaylists();
      const sorted = [
        ...all.filter((p) => p.name === LIKED_SONGS_NAME),
        ...all.filter((p) => p.name !== LIKED_SONGS_NAME),
      ];
      setPlaylists(sorted);

      const videoId = currentTrack.videoId ?? "";
      const title = currentTrack.title || currentTrack.song_name || "";
      const map: Record<number, TrackResponse | null> = {};
      await Promise.all(
        sorted.map(async (pl) => {
          try {
            const tracks = await PlaylistApi.getTracks(pl.id);
            const found = tracks.find(
              (t) =>
                (videoId && t.video_id === videoId) ||
                (!videoId && t.title === title)
            );
            map[pl.id] = found ?? null;
          } catch {
            map[pl.id] = null;
          }
        })
      );
      setSavedMap(map);
    } catch (e) {
      console.error("[PlaylistModal] loadData error:", e);
    } finally {
      setLoading(false);
    }
  }, [currentTrack]);

  // ── Toggle add / remove track ──────────────────────────────────────────────
  const handleToggle = useCallback(
    async (playlist: PlaylistResponse) => {
      if (!currentTrack || togglingId === playlist.id) return;
      setTogglingId(playlist.id);
      const existingTrack = savedMap[playlist.id];
      try {
        if (existingTrack) {
          await PlaylistApi.removeTrack(playlist.id, existingTrack.id);
          setSavedMap((prev) => ({ ...prev, [playlist.id]: null }));
        } else {
          let finalImageUrl = currentTrack.thumbnail_url || currentTrack.thumbnail || undefined;
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
            } catch {
              // keep original URL as fallback
            }
          }
          const trackAdd: TrackAdd = {
            video_id: currentTrack.videoId || String(Date.now()),
            title: currentTrack.title || currentTrack.song_name || "Unknown",
            artist: currentTrack.uploader || currentTrack.artist_name || undefined,
            image_url: finalImageUrl,
            duration_seconds: duration ? Math.floor(duration) : undefined,
          };
          const saved = await PlaylistApi.addTrack(playlist.id, trackAdd);
          setSavedMap((prev) => ({ ...prev, [playlist.id]: saved }));
        }
      } catch (e: any) {
        if (e?.response?.status === 409) {
          setSavedMap((prev) => ({ ...prev, [playlist.id]: { id: -1 } as TrackResponse }));
        }
        console.error("[PlaylistModal] toggle error:", e);
      } finally {
        setTogglingId(null);
      }
    },
    [currentTrack, savedMap, togglingId, duration]
  );

  // ── Render playlist row ────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: PlaylistResponse }) => {
    const isLiked = item.name === LIKED_SONGS_NAME;
    const isSaved = !!savedMap[item.id];
    const isToggling = togglingId === item.id;

    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={() => handleToggle(item)}>
        <View style={[styles.rowThumb, isLiked && styles.rowThumbLiked]}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.rowThumbImg} />
          ) : isLiked ? (
            <Ionicons name="heart" size={22} color="#fff" />
          ) : (
            <Ionicons name="musical-notes" size={22} color="#444" />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, isLiked && styles.rowNameLiked]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.rowDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {isToggling ? (
          <ActivityIndicator size="small" color="#1DB954" />
        ) : (
          <Ionicons
            name={isSaved ? "checkmark-circle" : "add-circle-outline"}
            size={26}
            color={isSaved ? "#1DB954" : "#555"}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Draggable handle – vibrates on press, follows finger exactly */}
        <View style={styles.handleArea} {...panResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Save to playlist</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color="#888" />
          </TouchableOpacity>
        </View>

        {currentTrack && (
          <View style={styles.trackPreview}>
            <Image
              source={{ uri: currentTrack.thumbnail_url || currentTrack.thumbnail }}
              style={styles.trackPreviewImg}
            />
            <View style={styles.trackPreviewInfo}>
              <Text style={styles.trackPreviewTitle} numberOfLines={1}>
                {currentTrack.title || currentTrack.song_name}
              </Text>
              <Text style={styles.trackPreviewArtist} numberOfLines={1}>
                {currentTrack.uploader || currentTrack.artist_name || "Unknown artist"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#1DB954" />
          </View>
        ) : (
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No playlists found. Create one first!</Text>
            }
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    overflow: "hidden",
  },
  handleArea: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  trackPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 12,
  },
  trackPreviewImg: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: "#2a2a2a",
  },
  trackPreviewInfo: {
    flex: 1,
  },
  trackPreviewTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  trackPreviewArtist: {
    color: "#888",
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#2a2a2a",
    marginHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  rowThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#252525",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  rowThumbLiked: {
    backgroundColor: "#1a0a40",
  },
  rowThumbImg: {
    width: "100%",
    height: "100%",
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    color: "#e8e8e8",
    fontWeight: "500",
  },
  rowNameLiked: {
    color: "#fff",
    fontWeight: "700",
  },
  rowDesc: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  emptyText: {
    color: "#555",
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
  },
});