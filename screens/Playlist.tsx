import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { launchImageLibrary } from "react-native-image-picker";
import { PlaylistApi, PlaylistResponse } from "../services/PlaylistApi";
import { useAuth } from "../services/Auth/AuthProvider";

const LIKED_SONGS_NAME = "Liked Songs";

const Playlist = () => {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const [playlists, setPlaylists] = useState<PlaylistResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [isModalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [newPlaylistImage, setNewPlaylistImage] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlaylists = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const data = await PlaylistApi.getMyPlaylists();
      setPlaylists(data);
    } catch (error) {
      console.error("Error fetching playlists", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlaylists();
    }, [isAuthenticated])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaylists();
  };

  const handleOpenPlaylist = (id: number) => {
    navigation.navigate("PlaylistDetails", { playlistId: id });
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setNewPlaylistImage(null);
    setModalVisible(true);
  };

  const openEditModal = (playlist: PlaylistResponse) => {
    setIsEditing(true);
    setEditingId(playlist.id);
    setNewPlaylistName(playlist.name);
    setNewPlaylistDesc(playlist.description || "");
    setNewPlaylistImage(null);
    setModalVisible(true);
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setNewPlaylistImage(result.assets[0]);
    }
  };

  const handleSavePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Playlist name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUri = newPlaylistImage?.uri;
      const imageType = newPlaylistImage?.type;
      const imageName = newPlaylistImage?.fileName || 'upload.jpg';

      if (isEditing && editingId) {
        const updated = await PlaylistApi.updatePlaylist(editingId, newPlaylistName, newPlaylistDesc, undefined, imageUri, imageType, imageName);
        setPlaylists((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await PlaylistApi.createPlaylist(newPlaylistName, newPlaylistDesc, false, imageUri, imageType, imageName);
        setPlaylists((prev) => [created, ...prev]);
      }
      setModalVisible(false);
    } catch (error) {
      console.error("Error saving playlist", error);
      Alert.alert("Error", "Could not save playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlaylist = (id: number) => {
    Alert.alert(
      "Delete playlist",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await PlaylistApi.deletePlaylist(id);
              setPlaylists((prev) => prev.filter((p) => p.id !== id));
            } catch (error) {
              console.error("Error deleting playlist", error);
              Alert.alert("Error", "Could not delete playlist");
            }
          },
        },
      ]
    );
  };

  const handleLongPressPlaylist = (item: PlaylistResponse) => {
    Alert.alert(
      "Playlist Options",
      `What would you like to do with "${item.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Edit", onPress: () => openEditModal(item) },
        { text: "Delete", style: "destructive", onPress: () => handleDeletePlaylist(item.id) },
      ]
    );
  };

  // Separate liked songs from user playlists
  const likedSongsPlaylist = playlists.find(
    (p) => p.name === LIKED_SONGS_NAME
  );
  const userPlaylists = playlists.filter(
    (p) => p.name !== LIKED_SONGS_NAME
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="lock-closed-outline" size={40} color="#333" />
        <Text style={styles.emptyTitle}>Sign in to see your playlists</Text>
        <Text style={styles.emptySubtitle}>Your music library will appear here</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1DB954" />
          </View>
        ) : (
          <FlatList
            key={3}
            data={userPlaylists}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            numColumns={3}
            columnWrapperStyle={styles.columnWrapper}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#1DB954"
              />
            }
            ListHeaderComponent={
              <>
                {/* Liked Songs card — always shown, no edit/delete */}
                {likedSongsPlaylist && (
                  <TouchableOpacity
                    style={styles.likedCard}
                    onPress={() => handleOpenPlaylist(likedSongsPlaylist.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.likedIconWrap}>
                      <Ionicons name="heart" size={26} color="#fff" />
                    </View>
                    <View style={styles.likedInfo}>
                      <Text style={styles.likedName}>Liked songs</Text>
                      <Text style={styles.likedMeta}>
                        {likedSongsPlaylist.description || "Your saved tracks"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}

                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>My Playlists</Text>
                  <TouchableOpacity onPress={openCreateModal} hitSlop={{ top: 10, bottom: 10, left: 30, right: 10 }}>
                    <Ionicons name="add" size={31} color="#ffffffff" />
                  </TouchableOpacity>
                </View>
              </>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.playlistItem}
                onPress={() => handleOpenPlaylist(item.id)}
                onLongPress={() => handleLongPressPlaylist(item)}
                activeOpacity={0.7}
              >
                {/* Thumbnail */}
                <View style={styles.thumb}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumbImage} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="musical-notes" size={30} color="#444" />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text style={styles.itemDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="musical-notes-outline" size={38} color="#2a2a2a" />
                <Text style={styles.emptyTitle}>No playlists yet</Text>
                <Text style={styles.emptySubtitle}>Tap Create to build your first one</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Create / Edit Modal — bottom sheet style */}
        <Modal
          visible={isModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalSheet}
              activeOpacity={1}
              onPress={() => { }}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {isEditing ? "Edit playlist" : "New playlist"}
              </Text>

              <View style={styles.imagePickerContainer}>
                <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                  {newPlaylistImage ? (
                    <Image source={{ uri: newPlaylistImage.uri }} style={styles.pickerImage} />
                  ) : (isEditing && editingId && playlists.find(p => p.id === editingId)?.image_url) ? (
                    <Image source={{ uri: playlists.find(p => p.id === editingId)?.image_url as string }} style={styles.pickerImage} />
                  ) : (
                    <View style={styles.pickerPlaceholder}>
                      <Ionicons name="camera-outline" size={32} color="#555" />
                      <Text style={styles.pickerText}>Add Image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Playlist name"
                placeholderTextColor="#555"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor="#555"
                value={newPlaylistDesc}
                onChangeText={setNewPlaylistDesc}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSave}
                  onPress={handleSavePlaylist}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.btnSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#111",
  },
  container: {
    flex: 1,
    backgroundColor: "#111",
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.3,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1DB954",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 14,
  },

  // List
  listContent: {
    paddingBottom: 110,
  },

  // Liked Songs card
  likedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1060",
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  likedIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  likedInfo: {
    flex: 1,
  },
  likedName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 3,
  },
  likedMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },

  // Section label
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 16,
    color: "#444",
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Playlist grid
  columnWrapper: {
    justifyContent: "space-between",
  },
  playlistItem: {
    width: "31%",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  thumb: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#1e1e1e",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    width: "100%",
  },
  itemName: {
    fontSize: 14,
    color: "#e0e0e0",
    fontWeight: "600",
    marginBottom: 4,
    marginTop: -3,
  },
  itemDesc: {
    fontSize: 12,
    color: "#a0a0a0",
    lineHeight: 16,
  },

  // Empty state
  emptyWrap: {
    alignItems: "center",
    paddingTop: 48,
    gap: 8,
  },
  emptyTitle: {
    color: "#444",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 8,
  },
  emptySubtitle: {
    color: "#333",
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 3,
    backgroundColor: "#333",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#262626",
    color: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#262626',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerImage: {
    width: '100%',
    height: '100%',
  },
  pickerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#262626",
    borderRadius: 10,
  },
  btnCancelText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSave: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#1DB954",
    borderRadius: 10,
  },
  btnSaveText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default Playlist;