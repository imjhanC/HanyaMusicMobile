import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from "react-native";

const trendingSongs = [
  { id: "1", title: "Africa", artist: "Toto" },
  { id: "2", title: "Blinding Lights", artist: "The Weeknd" },
  { id: "3", title: "Die For You", artist: "The Weeknd" },
];

const Home = () => {
  const [search, setSearch] = useState("");

  const handleSearch = () => {
    console.log("Searching for:", search);
    // TODO: connect to your API
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎵 HanyaMusic</Text>
      <Text style={styles.subHeader}>Find your vibe</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for songs or artists"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
      <FlatList
        data={trendingSongs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.songCard}>
            <Text style={styles.songTitle}>{item.title}</Text>
            <Text style={styles.songArtist}>{item.artist}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#292929ff",
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  subHeader: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    color: "#fff",
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: "#1db954",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  songCard: {
    backgroundColor: "#1e1e1e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  songTitle: {
    fontSize: 16,
    color: "#fff",
  },
  songArtist: {
    fontSize: 14,
    color: "#aaa",
  },
});

export default Home;
