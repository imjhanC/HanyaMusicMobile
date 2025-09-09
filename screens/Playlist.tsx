import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";

const mockPlaylists = [
  { id: "1", name: "Chill Vibes", songs: 24 },
  { id: "2", name: "Workout Pump", songs: 18 },
  { id: "3", name: "Sunset Mood", songs: 12 },
];

const Playlist = () => {
  const [playlists, setPlaylists] = useState(mockPlaylists);

  const handleOpenPlaylist = (id: string) => {
    console.log("Opening playlist:", id);
    // 👉 Later: navigate to a PlaylistDetails screen with the songs inside
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📂 Playlists</Text>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.playlistCard}
            onPress={() => handleOpenPlaylist(item.id)}
          >
            <Text style={styles.playlistName}>{item.name}</Text>
            <Text style={styles.playlistCount}>{item.songs} songs</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No playlists yet. Start creating one!</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  playlistCard: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  playlistName: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  playlistCount: {
    fontSize: 14,
    color: "#aaa",
    marginTop: 4,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 40,
  },
});

export default Playlist;
