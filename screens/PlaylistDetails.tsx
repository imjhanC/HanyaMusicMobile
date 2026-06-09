import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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
            <View style={styles.playlistImageFallback}>
              {playlist.image_url ? (
                <Image source={{ uri: playlist.image_url }} style={styles.playlistImage} />
              ) : (
                <Ionicons name="musical-notes" size={60} color="#666" />
              )}
            </View>
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
              <Ionicons name="play" size={24} color="#000" />
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
    paddingBottom: 100, // Space for player
  },
  playlistInfoContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  playlistImageFallback: {
    width: 160,
    height: 160,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 16,
    elevation: 5,
  },
  playlistImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
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
