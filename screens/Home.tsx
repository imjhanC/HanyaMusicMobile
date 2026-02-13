import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, Image, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
// Env 
import { HANYAMUSIC_URL } from "@env";
import { useNavigation, NavigationProp } from "@react-navigation/native";

const API_BASE_URL = HANYAMUSIC_URL;

// For top Global Artists 
interface Artist {
  rank: number;
  artist_name: string;
  thumbnail: string;
}

// For top Global Songs
interface GlobalSong {
  rank: number;
  song_name: string;
  artist_name: string;
  thumbnail: string;
  preview_url: string;
}

interface Song {
  rank: number;
  song_name: string;
  artist_name: string;
  thumbnail: string;
  preview_url: string;
}

type RootStackParamList = {
  TopCountrySongs: { songs: Song[]; countryName: string };
  TopGlobalArtists: { artists: Artist[] };
  TopGlobalSongs: { GlobalSongs: GlobalSong[] };
};

interface HomeScreenResult {
  topGlobalArtists: Artist[];
  topGlobalSongs: Song[];
  topCountrySongs: Song[];
  isLoading: boolean;
  error: string | null;
}

const ArtistCard = React.memo(({ artist }: { artist: Artist }) => (
  <View style={styles.artistCard}>
    <Image
      source={{ uri: artist.thumbnail }}
      style={styles.artistImage}
    />
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>#{artist.rank}</Text>
    </View>
    <Text style={styles.cardTitle} numberOfLines={2}>
      {artist.artist_name}
    </Text>
  </View>
));

const SongCard = React.memo(({ song }: { song: Song }) => (
  <View style={styles.card}>
    <Image
      source={{ uri: song.thumbnail }}
      style={styles.cardImage}
    />
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>#{song.rank}</Text>
    </View>
    <Text style={styles.cardTitle} numberOfLines={1}>
      {song.song_name}
    </Text>
    <Text style={styles.cardSubtitle} numberOfLines={1}>
      {song.artist_name}
    </Text>
  </View>
));

const Home = () => {
  const [data, setData] = useState<HomeScreenResult>({
    topGlobalArtists: [],
    topGlobalSongs: [],
    topCountrySongs: [],
    isLoading: true,
    error: null,
  });
  const [countryName, setCountryName] = useState("United States"); // default
  const [countryCode, setCountryCode] = useState("US"); // default

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch country information from IP API
      const ipResponse = await fetch('http://ip-api.com/json');
      const ipData = await ipResponse.json();

      const detectedCountryCode = ipData.countryCode || "US";
      const detectedCountryName = ipData.country || "United States";

      setCountryCode(detectedCountryCode);
      setCountryName(detectedCountryName);

      // Fetch all three endpoints in parallel
      const [artistsResponse, globalSongsResponse, countrySongsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/topglobalartists`),
        fetch(`${API_BASE_URL}/topglobalsongs`),
        fetch(`${API_BASE_URL}/topcountrysongs/${detectedCountryCode}`),
      ]);

      // Check if all responses are ok
      if (!artistsResponse.ok || !globalSongsResponse.ok || !countrySongsResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      // Parse all responses
      const [artistsData, globalSongsData, countrySongsData] = await Promise.all([
        artistsResponse.json(),
        globalSongsResponse.json(),
        countrySongsResponse.json(),
      ]);

      setData({
        topGlobalArtists: artistsData.artists || [],
        topGlobalSongs: globalSongsData.songs || [],
        topCountrySongs: countrySongsData.songs || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }));
    }
  };

  if (data.isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (data.error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{data.error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchHomeData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Top Global Artists Section */}
        <TouchableOpacity activeOpacity={0.9}
          onPress={() => navigation.navigate('TopGlobalArtists', {
            artists: data.topGlobalArtists
          })}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Global Artists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {data.topGlobalArtists.slice(0, 10).map((artist) => (
                <TouchableOpacity key={artist.rank} activeOpacity={0.7}>
                  <ArtistCard artist={artist} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>

        {/* Top Global Songs Section */}
        <TouchableOpacity activeOpacity={0.9}
          onPress={() => navigation.navigate('TopGlobalSongs', {
            GlobalSongs: data.topGlobalSongs
          })}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Global Songs</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {data.topGlobalSongs.slice(0, 10).map((song) => (
                <TouchableOpacity key={song.rank} activeOpacity={0.7}>
                  <SongCard song={song} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>

        {/* Top Country Songs Section */}
        <TouchableOpacity activeOpacity={0.9}
          onPress={() => navigation.navigate('TopCountrySongs', {
            songs: data.topCountrySongs,
            countryName: countryName
          })}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Songs in {countryName}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              {data.topCountrySongs.slice(0, 10).map((song) => (
                <TouchableOpacity key={song.rank} activeOpacity={0.7}>
                  <SongCard song={song} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingBottom: 50,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  card: {
    width: 140,
    marginRight: 12,
    position: "relative",
  },
  cardImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    backgroundColor: "#282828",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginTop: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#b3b3b3",
    marginTop: 4,
  },
  artistCard: {
    width: 140,
    marginRight: 12,
    alignItems: "center",
    position: "relative",
  },
  artistImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#282828",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rankText: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "bold",
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryButton: {
    backgroundColor: "#1DB954",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Home;