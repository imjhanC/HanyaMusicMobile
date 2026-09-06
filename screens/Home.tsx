import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
  Image,
  RefreshControl,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useMusicPlayer } from "../services/MusicPlayer";
import { ServiceManager } from "../services/ServiceManager";

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
  ArtistPage: { artist_name: string };
};

interface HomeScreenResult {
  topGlobalArtists: Artist[];
  topGlobalSongs: Song[];
  topCountrySongs: Song[];
  isLoading: boolean;
  errorMessage: string | null;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll: () => void }) => (
  <View style={styles.sectionHeaderContainer}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
      <Text style={styles.seeAllText}>See All</Text>
      <Ionicons name="chevron-forward" size={16} color="#1DB954" />
    </TouchableOpacity>
  </View>
);

const ArtistCard = React.memo(({ artist, onPress }: { artist: Artist; onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.artistCard} onPress={onPress}>
    <View style={styles.artistImageWrapper}>
      <Image source={{ uri: artist.thumbnail }} style={styles.artistImage} />
      <LinearGradient
        colors={["#1DB954", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.artistRankBadge}
      >
        <Text style={styles.artistRankText}>#{artist.rank}</Text>
      </LinearGradient>
    </View>
    <Text style={styles.artistName} numberOfLines={1}>
      {artist.artist_name}
    </Text>
    <Text style={styles.artistSubtext}>Artist</Text>
  </TouchableOpacity>
));

const SongCard = React.memo(({ song, onPress }: { song: Song; onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.8} style={styles.songCard} onPress={onPress}>
    <View style={styles.songImageContainer}>
      <Image source={{ uri: song.thumbnail }} style={styles.songImage} />
      <View style={styles.songRankBadge}>
        <Text style={styles.songRankText}>#{song.rank}</Text>
      </View>
      <View style={styles.playButtonOverlay}>
        <Ionicons name="play-sharp" size={16} color="#000" style={{ marginLeft: 2 }} />
      </View>
    </View>
    <Text style={styles.songTitle} numberOfLines={1}>
      {song.song_name}
    </Text>
    <Text style={styles.songArtist} numberOfLines={1}>
      {song.artist_name}
    </Text>
  </TouchableOpacity>
));

const LoadingSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonHeader} />
    {[1, 2, 3].map((sectionIndex) => (
      <View key={sectionIndex} style={styles.skeletonSection}>
        <View style={styles.skeletonTitle} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4].map((itemIndex) => (
            <View key={itemIndex} style={styles.skeletonCard} />
          ))}
        </ScrollView>
      </View>
    ))}
  </View>
);

const Home = () => {
  const [data, setData] = useState<HomeScreenResult>({
    topGlobalArtists: [],
    topGlobalSongs: [],
    topCountrySongs: [],
    isLoading: true,
    errorMessage: null,
  });
  const [countryName, setCountryName] = useState("United States");
  const [countryCode, setCountryCode] = useState("US");
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { playTrack } = useMusicPlayer();

  const fetchHomeData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setData(prev => ({ ...prev, isLoading: true, errorMessage: null }));
      }

      const fetchGeoInfo = async () => {
        const providers = [
          { url: 'http://ip-api.com/json', code: 'countryCode', name: 'country' }
        ];

        for (const provider of providers) {
          try {
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

      const apiUrlPromise = ServiceManager.getHanyaMusicUrl(true);
      const geoPromise = fetchGeoInfo();
      const artistsPromise = apiUrlPromise.then(url => fetch(`${url}/topglobalartists`));
      const globalSongsPromise = apiUrlPromise.then(url => fetch(`${url}/topglobalsongs`));
      const countrySongsPromise = Promise.all([apiUrlPromise, geoPromise]).then(async ([url, geo]) => {
        let detectedCountryCode = "US";
        if (geo) {
          detectedCountryCode = geo.code;
        } else {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz === "Asia/Kuala_Lumpur") detectedCountryCode = "MY";
        }
        return fetch(`${url}/topcountrysongs/${detectedCountryCode}`);
      });

      const [artistsResponse, globalSongsResponse, countrySongsResponse, geoResult] = await Promise.all([
        artistsPromise,
        globalSongsPromise,
        countrySongsPromise,
        geoPromise
      ]);

      setCountryCode(geoResult?.code || "US");
      setCountryName(geoResult?.name || (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Kuala_Lumpur" ? "Malaysia" : "United States"));

      if (!artistsResponse.ok) throw new Error(`Artists API error: ${artistsResponse.status}`);
      if (!globalSongsResponse.ok) throw new Error(`Global Songs API error: ${globalSongsResponse.status}`);
      if (!countrySongsResponse.ok) throw new Error(`Country Songs API error: ${countrySongsResponse.status}`);

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
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData(true);
  }, [fetchHomeData]);

  if (data.isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F12" />
        <LoadingSkeleton />
      </View>
    );
  }

  if (data.errorMessage) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0F12" />
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={54} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{data.errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchHomeData(false)} activeOpacity={0.8}>
            <LinearGradient
              colors={["#1DB954", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryGradient}
            >
              <Ionicons name="refresh-sharp" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const showArtists = activeFilter === "All" || activeFilter === "Artists";
  const showGlobal = activeFilter === "All" || activeFilter === "Global";
  const showLocal = activeFilter === "All" || activeFilter === "Local";

  // Featured Hero Track (Top #1 Global Song)
  const heroTrack = data.topGlobalSongs.length > 0 ? data.topGlobalSongs[0] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F12" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DB954"
            colors={["#1DB954"]}
          />
        }
      >
        {/* Ambient Top Header Banner */}
        <LinearGradient
          colors={["rgba(29, 185, 84, 0.18)", "rgba(15, 23, 42, 0.08)", "rgba(13, 15, 18, 0)"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerTitleRow}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.headerSubtitle}>Discover today's top music & artists</Text>
            </View>
            <View style={styles.musicNoteBadge}>
              <Ionicons name="musical-notes" size={20} color="#1DB954" />
            </View>
          </View>

          {/* Quick Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsRow}>
            {["All", "Artists", "Global", "Local"].map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.8}
                  style={[styles.chip, isActive && styles.chipActive]}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {filter === "Local" ? `Top in ${countryName}` : filter === "Global" ? "Global Charts" : filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </LinearGradient>

        {/* Hero Spotlight Card (#1 Track) */}
        {activeFilter === "All" && heroTrack && (
          <View style={styles.heroSection}>
            <LinearGradient
              colors={["#1E293B", "#0F172A", "#1E2229"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroBadgeRow}>
                <View style={styles.spotlightTag}>
                  <Ionicons name="sparkles-sharp" size={12} color="#1DB954" style={{ marginRight: 4 }} />
                  <Text style={styles.spotlightText}>#1 GLOBAL SPOTLIGHT</Text>
                </View>
              </View>

              <View style={styles.heroContentRow}>
                <Image source={{ uri: heroTrack.thumbnail }} style={styles.heroImage} />
                <View style={styles.heroMetaInfo}>
                  <Text style={styles.heroSongTitle} numberOfLines={1}>
                    {heroTrack.song_name}
                  </Text>
                  <Text style={styles.heroArtistName} numberOfLines={1}>
                    {heroTrack.artist_name}
                  </Text>
                  <TouchableOpacity
                    style={styles.heroPlayBtn}
                    onPress={() => playTrack(heroTrack)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="play" size={16} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.heroPlayText}>Play Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Top Global Artists Section */}
        {showArtists && data.topGlobalArtists.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Top Global Artists"
              onSeeAll={() =>
                navigation.navigate("TopGlobalArtists", {
                  artists: data.topGlobalArtists,
                })
              }
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {data.topGlobalArtists.slice(0, 10).map((artist) => (
                <ArtistCard
                  key={artist.rank}
                  artist={artist}
                  onPress={() =>
                    navigation.navigate("ArtistPage", { artist_name: artist.artist_name })
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Global Songs Section */}
        {showGlobal && data.topGlobalSongs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Top Global Songs"
              onSeeAll={() =>
                navigation.navigate("TopGlobalSongs", {
                  GlobalSongs: data.topGlobalSongs,
                })
              }
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {data.topGlobalSongs.slice(0, 10).map((song) => (
                <SongCard key={song.rank} song={song} onPress={() => playTrack(song)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Top Country Songs Section */}
        {showLocal && data.topCountrySongs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={`Top Songs in ${countryName}`}
              onSeeAll={() =>
                navigation.navigate("TopCountrySongs", {
                  songs: data.topCountrySongs,
                  countryName: countryName,
                })
              }
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {data.topCountrySongs.slice(0, 10).map((song) => (
                <SongCard key={song.rank} song={song} onPress={() => playTrack(song)} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0F12",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 14,
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "400",
  },
  musicNoteBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(29, 185, 84, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(29, 185, 84, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipsRow: {
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1E2229",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#2D333F",
  },
  chipActive: {
    backgroundColor: "#1DB954",
    borderColor: "#1DB954",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  // Hero Spotlight Section
  heroSection: {
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D333F",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  heroBadgeRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  spotlightTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 185, 84, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(29, 185, 84, 0.3)",
  },
  spotlightText: {
    color: "#1DB954",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#1E2229",
    marginRight: 14,
  },
  heroMetaInfo: {
    flex: 1,
  },
  heroSongTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  heroArtistName: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 10,
  },
  heroPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#1DB954",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroPlayText: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "700",
  },
  // Section Headers
  section: {
    marginBottom: 24,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1DB954",
    marginRight: 2,
  },
  horizontalList: {
    paddingHorizontal: 18,
  },
  // Artist Card Styles
  artistCard: {
    width: 124,
    marginRight: 16,
    alignItems: "center",
  },
  artistImageWrapper: {
    position: "relative",
    marginBottom: 10,
  },
  artistImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1E2229",
    borderWidth: 2,
    borderColor: "#1DB954",
  },
  artistRankBadge: {
    position: "absolute",
    bottom: 0,
    right: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  artistRankText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  artistName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  artistSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    textAlign: "center",
  },
  // Song Card Styles
  songCard: {
    width: 140,
    marginRight: 16,
  },
  songImageContainer: {
    position: "relative",
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    backgroundColor: "#1E2229",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  songImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  songRankBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(13, 15, 18, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  songRankText: {
    color: "#1DB954",
    fontSize: 11,
    fontWeight: "800",
  },
  playButtonOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  songArtist: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  // Skeleton Loader Styles
  skeletonContainer: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 18,
  },
  skeletonHeader: {
    width: "100%",
    height: 80,
    borderRadius: 16,
    backgroundColor: "#1E2229",
    marginBottom: 24,
  },
  skeletonSection: {
    marginBottom: 28,
  },
  skeletonTitle: {
    width: 160,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#1E2229",
    marginBottom: 16,
  },
  skeletonCard: {
    width: 130,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#1E2229",
    marginRight: 16,
  },
  // Error Card Styles
  errorCard: {
    backgroundColor: "#1E2229",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D333F",
    width: "100%",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  errorText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  retryGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default Home;