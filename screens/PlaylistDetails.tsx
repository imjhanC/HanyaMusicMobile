import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { launchImageLibrary } from "react-native-image-picker";
import { PlaylistApi, TrackResponse, PlaylistResponse } from "../services/PlaylistApi";
import { useMusicPlayer } from "../services/MusicPlayer";
import { useAuth } from "../services/Auth/AuthProvider";

type RootStackParamList = {
  PlaylistDetails: { playlistId: number };
};

type PlaylistDetailsRouteProp = RouteProp<RootStackParamList, "PlaylistDetails">;

export default function PlaylistDetails() {
  const route = useRoute<PlaylistDetailsRouteProp>();
  const navigation = useNavigation();
  const { playlistId } = route.params;

  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [tracks, setTracks] = useState<TrackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { playTrack, setQueue, currentTrack } = useMusicPlayer();
  const { user } = useAuth();

  useEffect(() => {
    fetchPlaylistDetails();
  }, [playlistId]);

  const fetchPlaylistDetails = async () => {
    try {
      setLoading(true);
      const [playlistData, tracksData] = await Promise.all([
        PlaylistApi.getPlaylist(playlistId),
        PlaylistApi.getTracks(playlistId),
      ]);
      setPlaylist(playlistData);
      setTracks(tracksData);
    } catch (error) {
      console.error("Failed to load playlist details", error);
      Alert.alert("Error", "Could not load playlist details");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (track: TrackResponse, index: number) => {
    try {
      const queueTracks = tracks.map(t => ({
        videoId: t.video_id,
        title: t.title,
        uploader: t.artist,
        thumbnail_url: t.image_url,
        duration: t.duration_seconds
      }));
      setQueue(queueTracks);
      await playTrack(queueTracks[index]);
    } catch (error) {
      console.error("Error playing track", error);
    }
  };

  const handleChangeImage = () => {
    if (!isOwner) return;
    launchImageLibrary(
      { mediaType: "photo", quality: 0.8, selectionLimit: 1 },
      async (response) => {
        if (response.didCancel || !response.assets || response.assets.length === 0) return;
        const asset = response.assets[0];
        if (!asset.uri) return;
        try {
          setUploading(true);
          const updated = await PlaylistApi.updatePlaylist(
            playlistId,
            undefined,
            undefined,
            undefined,
            asset.uri,
            asset.type || "image/jpeg",
            asset.fileName || "cover.jpg"
          );
          setPlaylist(updated);
        } catch (error) {
          console.error("Failed to update playlist image", error);
          Alert.alert("Error", "Could not update playlist image");
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      handlePlayTrack(tracks[0], 0);
    }
  };

  const handleRemoveTrack = async (trackId: number) => {
    Alert.alert(
      "Remove Track",
      "Are you sure you want to remove this track from the playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await PlaylistApi.removeTrack(playlistId, trackId);
              setTracks(prev => prev.filter(t => t.id !== trackId));
            } catch (error) {
              console.error("Error removing track", error);
              Alert.alert("Error", "Could not remove track");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Playlist not found</Text>
      </View>
    );
  }

  const isOwner = user?.id === playlist.user_id;


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{playlist.name}</Text>
      </View>

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.playlistInfoContainer}>
            {/* ── Cover Art ── */}
            <View style={styles.coverWrapper}>
              {/* Glow ring */}
              <View style={[
                styles.glowRing,
                isOwner && { borderColor: uploading ? "#666" : "#1DB954" }
              ]} />

              <TouchableOpacity
                style={styles.coverTouchable}
                onPress={isOwner ? handleChangeImage : undefined}
                activeOpacity={isOwner ? 0.85 : 1}
                disabled={uploading}
              >
                {/* Artwork or placeholder */}
                {playlist.image_url ? (
                  <Image source={{ uri: playlist.image_url }} style={styles.coverImage} />
                ) : (
                  <LinearGradient
                    colors={["#1a1a2e", "#16213e", "#0f3460"]}
                    style={styles.coverPlaceholder}
                  >
                    <Ionicons name="musical-notes" size={72} color="rgba(255,255,255,0.18)" />
                  </LinearGradient>
                )}

                {/* Dark gradient overlay for owner */}
                {isOwner && (
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.72)"]}
                    style={styles.coverGradientOverlay}
                  >
                    {uploading ? (
                      <ActivityIndicator size="large" color="#1DB954" />
                    ) : (
                      <View style={styles.cameraHintRow}>
                        <View style={styles.cameraBadge}>
                          <Ionicons name="camera" size={20} color="#fff" />
                        </View>
                        <Text style={styles.changePhotoLabel}>Change Cover</Text>
                      </View>
                    )}
                  </LinearGradient>
                )}
              </TouchableOpacity>

              {/* Floating upload badge (top-right corner) */}
              {isOwner && !uploading && (
                <View style={styles.editBadge}>
                  <Ionicons name="pencil" size={11} color="#fff" />
                </View>
              )}
            </View>

            {/* Tap hint below image */}
            {isOwner && (
              <Text style={styles.tapHint}>
                {uploading ? "Uploading…" : "Tap cover to change"}
              </Text>
            )}

            <Text style={styles.playlistTitle}>{playlist.name}</Text>
            {playlist.description ? (
              <Text style={styles.playlistDescription}>{playlist.description}</Text>
            ) : null}
            <Text style={styles.playlistStats}>{tracks.length} songs</Text>

            <TouchableOpacity
              style={[styles.playAllBtn, tracks.length === 0 && styles.playAllBtnDisabled]}
              onPress={handlePlayAll}
              disabled={tracks.length === 0}
            >
              <Ionicons name="play" size={22} color="#000" />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item, index }) => {
          const isPlaying = currentTrack?.videoId === item.video_id ||
            (currentTrack?.title === item.title && currentTrack?.uploader === item.artist);
          return (
            <TouchableOpacity style={styles.trackItem} onPress={() => handlePlayTrack(item, index)}>
              <Image
                source={{ uri: item.image_url || "https://via.placeholder.com/150" }}
                style={styles.trackImage}
              />
              <View style={styles.trackDetails}>
                <Text style={[styles.trackTitle, isPlaying && { color: '#1DB954' }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {item.artist || "Unknown Artist"}
                </Text>
              </View>
              {isOwner && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => handleRemoveTrack(item.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tracks in this playlist yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 40,
    backgroundColor: "rgba(18, 18, 18, 0.9)",
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    flex: 1,
  },
  listContent: {
    paddingBottom: 170, // Space for player
  },
  playlistInfoContainer: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  // ── Cover art wrapper
  coverWrapper: {
    position: "relative",
    marginBottom: 6,
  },
  glowRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    // shadow for the glow effect
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#1DB954",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
    }),
  },
  coverTouchable: {
    width: 200,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    // card shadow
    ...Platform.select({
      android: { elevation: 16 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
      },
    }),
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  coverGradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 12,
  },
  cameraHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cameraBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(29,185,84,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  editBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#121212",
  },
  tapHint: {
    fontSize: 11,
    color: "#1DB954",
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.4,
    opacity: 0.85,
  },
  playlistTitle: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  playlistDescription: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 8,
  },
  playlistStats: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  playAllBtn: {
    flexDirection: "row",
    backgroundColor: "#1DB954",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  playAllBtnDisabled: {
    backgroundColor: "#333",
  },
  playAllText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
    justifyContent: "center",
  },
  trackTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: "#aaa",
  },
  moreButton: {
    padding: 8,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
});
