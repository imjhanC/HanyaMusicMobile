import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useMusicPlayer } from '../services/MusicPlayer';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL = 'https://instinctually-monosodium-shawnda.ngrok-free.app';

interface SearchResult {
  title: string;
  thumbnail_url: string;
  videoId: string;
  uploader: string;
  duration: string;
}

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const { playTrack, currentTrack } = useMusicPlayer(); // assumes you have currentTrack
  const navigation = useNavigation();

  // ✅ Hide/show header based on states
  useEffect(() => {
    const shouldHideHeader =
      isInputFocused || isLoading || searchResults.length > 0 || !!currentTrack;

    navigation.setOptions({ headerShown: !shouldHideHeader });
  }, [isInputFocused, isLoading, searchResults, currentTrack, navigation]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setSearchResults([]);
    try {
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.trackItem} onPress={() => playTrack(item)}>
      <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.trackUploader}>{item.uploader}</Text>
        <Text style={styles.trackDuration}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a song..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        />
        <Button title="Search" onPress={handleSearch} color="#1DB954" />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#1DB954" style={styles.loader} />
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.videoId}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No results found. Start by searching for a song.</Text>
          }
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  searchContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#282828' },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#333',
    borderRadius: 5,
    paddingHorizontal: 10,
    color: '#fff',
    marginRight: 10,
  },
  loader: { marginTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#aaa' },
  trackItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  thumbnail: { width: 60, height: 60, borderRadius: 4, marginRight: 10 },
  trackInfo: { flex: 1, justifyContent: 'center' },
  trackTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  trackUploader: { color: '#aaa', fontSize: 14 },
  trackDuration: { color: '#aaa', fontSize: 12, marginTop: 4 },
  flatListContent: { paddingBottom: 140 },
});

export default SearchScreen;
