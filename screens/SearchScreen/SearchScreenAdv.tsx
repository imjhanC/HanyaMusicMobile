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
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useMusicPlayer, GlobalMusicPlayer } from "../../services/MusicPlayer";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSharedValue } from 'react-native-reanimated';
import { ServiceManager } from "../../services/ServiceManager";
import { PlaylistApi, PlaylistResponse } from "../../services/PlaylistApi";

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 10;

interface SearchResult {
  title: string;
  thumbnail_url: string;
  videoId: string;
  uploader: string;
  duration: string;
}

interface RelatedArtist {
  artist_name: string;
  genre: string;
  image: string | null;
}

export default function SearchScreenAdv() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [relatedArtists, setRelatedArtists] = useState<RelatedArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const [isPlaylistModalVisible, setPlaylistModalVisible] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<PlaylistResponse[]>([]);
  const [isPlaylistsLoading, setIsPlaylistsLoading] = useState(false);
  const [trackToAdd, setTrackToAdd] = useState<SearchResult | null>(null);
  const navigation = useNavigation();
  const { playTrack, setCurrentScreen } = useMusicPlayer() as { playTrack: (track: SearchResult) => void; setCurrentScreen: (screen: string | null) => void };
  const drawerProgress = useSharedValue(0);

  // Track screen name for mini-player positioning
  useFocusEffect(
    React.useCallback(() => {
      setCurrentScreen('SearchAdv');
      return () => setCurrentScreen(null);
    }, [setCurrentScreen])
  );

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
    fetchSavedTracks();
  }, []);

  const fetchSavedTracks = async () => {
    try {
      const playlists = await PlaylistApi.getMyPlaylists();
      const allVideoIds = new Set<string>();
      await Promise.all(
        playlists.map(async (playlist) => {
          try {
            const tracks = await PlaylistApi.getTracks(playlist.id);
            tracks.forEach(t => allVideoIds.add(t.video_id));
          } catch (err) {
            console.error("Failed to fetch tracks for playlist", playlist.id, err);
          }
        })
      );
      setSavedVideoIds(allVideoIds);
    } catch (e) {
      console.error("Failed to fetch saved tracks:", e);
    }
  };

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
    setRelatedArtists([]);
    setErrorMessage("");

    // Add to search history when search is initiated
    addToSearchHistory(query);

    try {
      const API_BASE_URL = await ServiceManager.getHanyaMusicUrl();

      const searchPromise = fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`)
        .catch(e => { console.error("Search request failed:", e); return null; });
      const artistsPromise = fetch(`${API_BASE_URL}/getrelatedartists/${encodeURIComponent(query)}`)
        .catch(e => { console.error("Artists request failed:", e); return null; });

      const [searchResponse, artistsResponse] = await Promise.all([searchPromise, artistsPromise]);

      let searchSuccess = false;

      if (searchResponse && searchResponse.ok) {
        const contentType = searchResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await searchResponse.json();
          if (Array.isArray(data)) {
            setSearchResults(data);
            if (data.length === 0) setErrorMessage("no-results");
            searchSuccess = true;
          }
        }
      }

      if (!searchSuccess) {
        setErrorMessage("server-error");
      }

      if (artistsResponse && artistsResponse.ok) {
        const contentType = artistsResponse.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          try {
            const data = await artistsResponse.json();
            if (data && Array.isArray(data.related_artists)) {
              setRelatedArtists(data.related_artists);
            }
          } catch (e) {
            console.error("Failed to parse artists data:", e);
          }
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
      setErrorMessage("server-error");
    } finally {
      setIsLoading(false);
    }
  };

  const renderRelatedArtists = () => {
    if (relatedArtists.length === 0) return null;

    return (
      <View style={styles.relatedArtistsContainer}>
        <Text style={styles.relatedArtistsTitle}>Related Artists</Text>
        <FlatList
          horizontal
          data={relatedArtists}
          keyExtractor={(item, index) => `${item.artist_name}-${index}`}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.artistCard}
              onPress={() => {
                (navigation as any).navigate('HomeDrawer', {
                  screen: 'Main',
                  params: {
                    screen: 'Home',
                    params: {
                      screen: 'ArtistPage',
                      params: { artist_name: item.artist_name }
                    }
                  }
                });
              }}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.artistImage} />
              ) : (
                <View style={[styles.artistImage, styles.artistPlaceholder]}>
                  <Ionicons name="person" size={40} color="#888" />
                </View>
              )}
              <Text style={styles.artistName}>{item.artist_name}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  const handleOpenAddToPlaylist = async (track: SearchResult) => {
    setTrackToAdd(track);
    setPlaylistModalVisible(true);
    setIsPlaylistsLoading(true);
    try {
      const playlists = await PlaylistApi.getMyPlaylists();
      setUserPlaylists(playlists);
    } catch (e) {
      console.error("Failed to load playlists", e);
      Alert.alert("Error", "Could not load playlists. Please ensure you are logged in.");
    } finally {
      setIsPlaylistsLoading(false);
    }
  };

  const handleAddToPlaylist = async (playlistId: number) => {
    if (!trackToAdd) return;
    try {
      let finalImageUrl = trackToAdd.thumbnail_url || null;
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
        } catch (fetchErr) {
          console.error("Error fetching/encoding image:", fetchErr);
        }
      }

      let durationSeconds = 0;
      if (trackToAdd.duration) {
          const parts = trackToAdd.duration.split(':').reverse();
          let seconds = 0;
          for (let i = 0; i < parts.length; i++) {
              seconds += parseInt(parts[i]) * Math.pow(60, i);
          }
          durationSeconds = seconds;
      }

      const trackAddObj = {
        video_id: trackToAdd.videoId,
        title: trackToAdd.title,
        artist: trackToAdd.uploader,
        image_url: finalImageUrl || undefined,
        duration_seconds: durationSeconds || undefined
      };

      await PlaylistApi.addTrack(playlistId, trackAddObj);
      Alert.alert("Success", "Added to playlist!");
      setPlaylistModalVisible(false);
      setSavedVideoIds(prev => new Set(prev).add(trackToAdd.videoId));
    } catch (e: any) {
      console.error("Failed to add track to playlist", e);
      Alert.alert("Error", e?.response?.data?.detail || "Could not add track to playlist.");
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
      <TouchableOpacity 
        style={styles.addBtn}
        onPress={() => {
          if (!savedVideoIds.has(item.videoId)) {
            handleOpenAddToPlaylist(item);
          }
        }}
      >
        <Ionicons 
          name={savedVideoIds.has(item.videoId) ? "checkmark-circle" : "add-circle-outline"} 
          size={28} 
          color={savedVideoIds.has(item.videoId) ? "#1DB954" : "#fff"} 
        />
      </TouchableOpacity>
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
      fetchSavedTracks();
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
            ListHeaderComponent={renderRelatedArtists}
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
      <GlobalMusicPlayer drawerProgress={drawerProgress} />

      <Modal visible={isPlaylistModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Playlist</Text>
              <TouchableOpacity onPress={() => setPlaylistModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {isPlaylistsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#1DB954" />
              </View>
            ) : (
              <FlatList
                data={userPlaylists}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playlistItem}
                    onPress={() => handleAddToPlaylist(item.id)}
                  >
                    <Ionicons name="list-outline" size={24} color="#ccc" style={{ marginRight: 12 }} />
                    <View>
                      <Text style={styles.playlistItemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.playlistItemDesc}>{item.description}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyPlaylistsText}>
                    No playlists available. Please create one first!
                  </Text>
                }
                style={styles.playlistList}
              />
            )}
          </View>
        </View>
      </Modal>
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
  addBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  flatListContent: {
    paddingBottom: 140,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  modalLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  playlistList: {
    marginTop: 8,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  playlistItemName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  playlistItemDesc: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },
  emptyPlaylistsText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
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
  // Related Artists Styles
  relatedArtistsContainer: {
    marginBottom: 16,
    paddingTop: 12,
  },
  relatedArtistsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  artistCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 5,
    width: 120,
  },
  artistImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  artistPlaceholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  artistName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
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