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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useMusicPlayer } from "../../services/MusicPlayer";
import AsyncStorage from '@react-native-async-storage/async-storage';

// ENV import 
import { HANYAMUSIC_URL } from "@env";

const API_BASE_URL = HANYAMUSIC_URL;
const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 10;

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
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigation = useNavigation();
  const { playTrack } = useMusicPlayer() as { playTrack: (track: SearchResult) => void };

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  // Load search history from AsyncStorage
  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  // Save search history to AsyncStorage
  const saveSearchHistory = async (newHistory: string[]) => {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  // Add query to search history
  const addToSearchHistory = (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // Remove duplicate if exists, then add to front
    const updatedHistory = [
      trimmedQuery,
      ...searchHistory.filter(item => item !== trimmedQuery)
    ].slice(0, MAX_HISTORY_ITEMS);

    saveSearchHistory(updatedHistory);
  };

  // Clear all search history
  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  // Remove individual history item
  const removeHistoryItem = (item: string) => {
    const updatedHistory = searchHistory.filter(h => h !== item);
    saveSearchHistory(updatedHistory);
  };

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
    
    // Add to search history when search is initiated
    addToSearchHistory(query);

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
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackMeta}>
          {item.uploader} • {item.duration}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => setQuery(item)}
    >
      <Ionicons name="time-outline" size={20} color="#aaa" />
      <Text style={styles.historyText} numberOfLines={1}>
        {item}
      </Text>
      <TouchableOpacity
        onPress={() => removeHistoryItem(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#121212", true);
      StatusBar.setBarStyle("light-content", true);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      return () => {};
    }, [])
  );

  // Show search history when no query
  const showSearchHistory = !query.trim() && searchHistory.length > 0;

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
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={22} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.results}>
        {showSearchHistory ? (
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearSearchHistory}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchHistory}
              renderItem={renderHistoryItem}
              keyExtractor={(item, index) => `${item}-${index}`}
              contentContainerStyle={styles.historyList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : isLoading ? (
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
    marginLeft: 6,
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
    backgroundColor: "#121212",
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
    fontWeight: "600",
    marginBottom: 6,
  },
  trackMeta: {
    color: "#aaa",
    fontSize: 13,
  },
  flatListContent: {
    paddingBottom: 140,
  },
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
  // Search History Styles
  historyContainer: {
    flex: 1,
    paddingTop: 16,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  historyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  clearAllText: {
    color: "#1DB954",
    fontSize: 14,
    fontWeight: "600",
  },
  historyList: {
    paddingBottom: 140,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  historyText: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
});