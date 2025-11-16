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
  const [errorMessage, setErrorMessage] = useState("");
  const navigation = useNavigation();
  const { playTrack } = useMusicPlayer();

  // Debounced search (1 second delay)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
        setErrorMessage("");
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle search request
  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSearchResults([]);
    setErrorMessage("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setSearchResults(data);
        if (data.length === 0) setErrorMessage("no-results");
      } else {
        throw new Error("Invalid data format");
      }
    } catch (error) {
      console.error("Search failed:", error);
      setErrorMessage("server-error");
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
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery("");
              setSearchResults([]);
              setErrorMessage("");
              navigation.goBack();
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={22} color="#aaa" />
          </TouchableOpacity>
        )}
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
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={
                    errorMessage === "server-error"
                      ? "cloud-offline-outline"
                      : query.trim()
                      ? "musical-notes-outline"
                      : "search-outline"
                  }
                  size={64}
                  color="#555"
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.emptyTitle}>
                  {errorMessage === "server-error"
                    ? "No Response from Server"
                    : query.trim()
                    ? "No Results Found"
                    : "Start Typing to Search"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {errorMessage === "server-error"
                    ? "Please contact the admin for help."
                    : query.trim()
                    ? "Try a different keyword or check your spelling."
                    : "Discover music by searching above."}
                </Text>
              </View>
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
  clearButton: {
    marginLeft : 6,
  },
  results: {
    flex: 1,
    paddingHorizontal: 8,
  },
  loader: {
    marginTop: 50,
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

  // 🌟 Redesigned Empty State
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
});
