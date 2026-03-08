import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, Image, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
// Env 
// import { HANYAMUSIC_URL } from "@env";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useMusicPlayer } from "../services/MusicPlayer";

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
  errorMessage: string | null;
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

import { ServiceManager } from "../services/ServiceManager";

const Home = () => {
  const [data, setData] = useState<HomeScreenResult>({
    topGlobalArtists: [],
    topGlobalSongs: [],
    topCountrySongs: [],
    isLoading: true,
    errorMessage: null,
  });
  const [countryName, setCountryName] = useState("United States"); // default
  const [countryCode, setCountryCode] = useState("US"); // default

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { playTrack } = useMusicPlayer();

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, errorMessage: null }));

      // Providers and multi-service geolocation strategy
      const fetchGeoInfo = async () => {
        const providers = [
          { url: 'https://ipapi.co/json/', code: 'country_code', name: 'country_name' },
          { url: 'https://freeipapi.com/api/json', code: 'countryCode', name: 'countryName' },
          { url: 'http://ip-api.com/json', code: 'countryCode', name: 'country' }
        ];

        for (const provider of providers) {
          try {
            console.log(`Home: Trying ${provider.url}...`);
            const res = await fetch(provider.url);
            if (res.ok) {
              const geoData = await res.json();
              const cCode = geoData[provider.code];
              const cName = geoData[provider.name];
              if (cCode && cName) return { code: cCode, name: cName };
            }
          } catch (e) {
            console.warn(`Home: ${provider.url} failed:`, e);
          }
        }
        return null;
      };

      // 1. Start fetching API URL (force fresh) and Geolocation in parallel
      const apiUrlPromise = ServiceManager.getHanyaMusicUrl(true);
      const geoPromise = fetchGeoInfo();

      // 2. Start fetching artists and global songs AS SOON AS the API URL is ready
      // (Don't wait for geolocation!)
      const artistsPromise = apiUrlPromise.then(url => fetch(`${url}/topglobalartists`));
      const globalSongsPromise = apiUrlPromise.then(url => fetch(`${url}/topglobalsongs`));

      // 3. Wait for BOTH API URL and Geo to fetch country-specific songs
      const countrySongsPromise = Promise.all([apiUrlPromise, geoPromise]).then(async ([url, geo]) => {
        let detectedCountryCode = "US";
        if (geo) {
          detectedCountryCode = geo.code;
        } else {
          // Fallback if geo fails
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz === "Asia/Kuala_Lumpur") detectedCountryCode = "MY";
        }
        return fetch(`${url}/topcountrysongs/${detectedCountryCode}`);
      });

      // 4. Wait for all requests to complete
      const [artistsResponse, globalSongsResponse, countrySongsResponse, geoResult] = await Promise.all([
        artistsPromise,
        globalSongsPromise,
        countrySongsPromise,
        geoPromise
      ]);

      // Set country info for UI
      setCountryCode(geoResult?.code || "US");
      setCountryName(geoResult?.name || (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Kuala_Lumpur" ? "Malaysia" : "United States"));

      // Check each response individually for better error reporting
      if (!artistsResponse.ok) throw new Error(`Artists API error: ${artistsResponse.status}`);
      if (!globalSongsResponse.ok) throw new Error(`Global Songs API error: ${globalSongsResponse.status}`);
      if (!countrySongsResponse.ok) throw new Error(`Country Songs API error: ${countrySongsResponse.status}`);

      // Try to parse JSON while checking content-type
      const responses = [artistsResponse, globalSongsResponse, countrySongsResponse];
      const parsedData = await Promise.all(responses.map(async (res, index) => {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const type = ["Artists", "Global Songs", "Country Songs"][index];
          throw new Error(`${type} API returned unexpected format (not JSON)`);
        }
        return res.json();
      }));

      const [artistsData, globalSongsData, countrySongsData] = parsedData;

      setData({
        topGlobalArtists: artistsData.artists || [],
        topGlobalSongs: globalSongsData.songs || [],
        topCountrySongs: countrySongsData.songs || [],
        isLoading: false,
        errorMessage: null,
      });
    } catch (err) {
      console.error("Home: fetchHomeData error:", err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        errorMessage: err instanceof Error ? err.message : "An error occurred",
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

  if (data.errorMessage) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{data.errorMessage}</Text>
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
                <TouchableOpacity key={song.rank} activeOpacity={0.7} onPress={() => playTrack(song)}>
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
                <TouchableOpacity key={song.rank} activeOpacity={0.7} onPress={() => playTrack(song)}>
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