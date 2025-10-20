import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useMusicPlayer } from "../../services/MusicPlayer";

const API_BASE_URL = "https://instinctually-monosodium-shawnda.ngrok-free.app";

interface SearchResult {
  title: string;
  thumbnail_url: string;
  videoId: string;
  uploader: string;
  duration: string;
}

export default function SearchScreenAdv() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const { playTrack } = useMusicPlayer();

  // Debounced search (1 second delay after typing stops)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSearchResults([]);
    try {
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => playTrack(item)}>
      <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.trackUploader}>{item.uploader}</Text>
        <Text style={styles.trackDuration}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#121212", true);
      StatusBar.setBarStyle("light-content", true);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <View style={styles.searchBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <View style={styles.results}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1DB954" style={styles.loader} />
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.videoId}
            ListEmptyComponent={
              query.trim() ? (
                <Text style={styles.emptyText}>No results found</Text>
              ) : (
                <Text style={styles.emptyText}>Start typing to search</Text>
              )
            }
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b1b1bff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#fff",
    fontSize: 16,
  },
  results: {
    flex: 1,
    paddingHorizontal: 8,
  },
  loader: {
    marginTop: 50,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#aaa",
    fontSize: 16,
  },
  trackItem: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trackTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  trackUploader: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 2,
  },
  trackDuration: {
    color: "#aaa",
    fontSize: 12,
  },
  flatListContent: {
    paddingBottom: 140,
  },
});
