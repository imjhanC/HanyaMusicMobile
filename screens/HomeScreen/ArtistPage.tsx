import React, { useEffect, useState } from 'react';
import { View, Text, SectionList, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ServiceManager } from '../../services/ServiceManager';
import { useMusicPlayer } from '../../services/MusicPlayer';

interface SongDetails {
    song_name: string;
    release_date: string;
    release_month: string;
    release_year: number;
    thumbnail: string;
    preview_url: string;
}

interface TopSongDetails {
    song_name: string;
    album_name: string;
    preview_url: string;
    release_date: string;
    thumbnail: string;
}

interface ArtistData {
    artist: string;
    total_songs: number;
    total_albums: number;
    albums: Record<string, SongDetails[]>;
    sample_thumbnails: string[];
    top_10_songs?: TopSongDetails[];
}

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

const ArtistPage = ({ route, navigation }: any) => {
    const { artist_name } = route.params;
    const insets = useSafeAreaInsets();
    const scrollY = React.useRef(new Animated.Value(0)).current;
    const [artistData, setArtistData] = useState<ArtistData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showAllTopSongs, setShowAllTopSongs] = useState(false);
    const { playTrack } = useMusicPlayer();

    useEffect(() => {
        if (artist_name) {
            fetchArtistData();
        } else {
            setErrorMessage("Invalid artist name provided.");
            setIsLoading(false);
        }
    }, [artist_name]);

    const fetchArtistData = async () => {
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const baseUrl = await ServiceManager.getHanyaMusicUrl();
            const url = `${baseUrl}/getartistssongs/${encodeURIComponent(artist_name)}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch artist data: ${response.status}`);
            }

            const data = await response.json();
            setArtistData(data);
        } catch (error) {
            console.error("ArtistPage: fetch error", error);
            setErrorMessage(error instanceof Error ? error.message : "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1DB954" />
            </SafeAreaView>
        );
    }

    if (errorMessage || !artistData) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Text style={styles.errorText}>{errorMessage || "Artist not found"}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchArtistData}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.retryButton, { marginTop: 10, backgroundColor: '#333' }]} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const sections = Object.keys(artistData.albums).map(albumName => ({
        title: albumName,
        data: artistData.albums[albumName]
    }));

    const renderHeader = () => {
        const recentReleases = Object.keys(artistData.albums).map(albumName => {
            const firstSong = artistData.albums[albumName][0];
            const dateValue = new Date(firstSong.release_date).getTime() || firstSong.release_year;
            return {
                albumName,
                releaseDateVal: dateValue,
                releaseYear: firstSong.release_year,
                releaseMonth: firstSong.release_month,
                thumbnail: firstSong.thumbnail,
                songs: artistData.albums[albumName],
            };
        }).sort((a, b) => b.releaseDateVal - a.releaseDateVal).slice(0, 5);

        return (
            <View style={styles.headerContainer}>
                {/* Banner/Thumbnails */}
                <View style={styles.bannerContainer}>
                    {artistData.sample_thumbnails && artistData.sample_thumbnails.length > 0 ? (
                        <Image source={{ uri: artistData.sample_thumbnails[0] }} style={styles.bannerImage} />
                    ) : (
                        <View style={styles.bannerPlaceholder} />
                    )}
                    <View style={styles.bannerOverlay}>
                        <Text style={styles.artistNameMain}>{artistData.artist}</Text>
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{artistData.total_songs}</Text>
                                <Text style={styles.statLabel}>Songs</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{artistData.total_albums}</Text>
                                <Text style={styles.statLabel}>Albums</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Top Songs by artist */}
                {artistData.top_10_songs && artistData.top_10_songs.length > 0 && (
                    <View style={styles.topSongsContainer}>
                        <Text style={[styles.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>
                            Top Songs by {artistData.artist}
                        </Text>
                        {artistData.top_10_songs.slice(0, showAllTopSongs ? 10 : 6).map((song, index) => {
                            const isPartiallyHidden = !showAllTopSongs && index === 5;

                            const cardContent = (
                                <TouchableOpacity
                                    style={[styles.topSongCard, isPartiallyHidden && { opacity: 0.2 }]}
                                    activeOpacity={isPartiallyHidden ? 1 : 0.7}
                                    onPress={() => {
                                        if (isPartiallyHidden) {
                                            setShowAllTopSongs(true);
                                        } else {
                                            playTrack({
                                                rank: 0,
                                                song_name: song.song_name,
                                                artist_name: artistData.artist,
                                                thumbnail: song.thumbnail,
                                                preview_url: song.preview_url
                                            });
                                        }
                                    }}
                                >
                                    <Text style={styles.topSongRank}>{index + 1}</Text>
                                    <Image source={{ uri: song.thumbnail }} style={styles.songThumbnail} />
                                    <View style={styles.songInfo}>
                                        <Text style={styles.songName} numberOfLines={1}>{song.song_name}</Text>
                                        <Text style={styles.songMeta} numberOfLines={1}>{song.album_name}</Text>
                                    </View>
                                </TouchableOpacity>
                            );

                            if (isPartiallyHidden) {
                                return (
                                    <View key={index} style={{ height: 45, overflow: 'hidden' }}>
                                        {cardContent}
                                    </View>
                                );
                            }

                            return <React.Fragment key={index}>{cardContent}</React.Fragment>;
                        })}
                        {artistData.top_10_songs.length > 5 && (
                            <TouchableOpacity
                                style={styles.seeMoreButton}
                                onPress={() => setShowAllTopSongs(!showAllTopSongs)}
                            >
                                <Text style={styles.seeMoreText}>
                                    {showAllTopSongs ? "Show less" : "See more"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* All Releases */}
                {recentReleases.length > 0 && (
                    <View style={styles.releasesContainer}>
                        <View style={styles.releasesHeader}>
                            <Text style={styles.sectionTitle}>All releases</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('AlbumPage', { artistName: artistData.artist, albums: artistData.albums })}>
                                <Text style={styles.showAllText}>Show all</Text>
                            </TouchableOpacity>
                        </View>
                        {recentReleases.map((release, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.releaseCard}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('ArtistAlbumSongs', { 
                                    artistName: artistData.artist, 
                                    albumName: release.albumName, 
                                    thumbnail: release.thumbnail, 
                                    releaseMonth: release.releaseMonth, 
                                    releaseYear: release.releaseYear, 
                                    songs: release.songs 
                                })}
                            >
                                <Image source={{ uri: release.thumbnail }} style={styles.releaseThumbnail} />
                                <View style={styles.songInfo}>
                                    <Text style={styles.songName} numberOfLines={1}>{release.albumName}</Text>
                                    <Text style={styles.songMeta} numberOfLines={1}>{release.releaseYear}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {Object.keys(artistData.albums).length > 5 && (
                            <TouchableOpacity 
                                style={styles.seeAllReleasesButton}
                                onPress={() => navigation.navigate('AlbumPage', { artistName: artistData.artist, albums: artistData.albums })}
                            >
                                <Text style={styles.seeAllReleasesText} numberOfLines={1}>See all releases</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    const renderSongItem = ({ item }: { item: SongDetails }) => (
        <TouchableOpacity
            style={styles.songCard}
            activeOpacity={0.7}
            onPress={() => playTrack({
                rank: 0,
                song_name: item.song_name,
                artist_name: artistData.artist,
                thumbnail: item.thumbnail,
                preview_url: item.preview_url
            })}
        >
            <Image source={{ uri: item.thumbnail }} style={styles.songThumbnail} />
            <View style={styles.songInfo}>
                <Text style={styles.songName} numberOfLines={1}>{item.song_name}</Text>
                <Text style={styles.songMeta} numberOfLines={1}>
                    {item.release_month} {item.release_year}
                </Text>
            </View>
            <Ionicons name="play-circle" size={32} color="#1DB954" style={styles.playIcon} />
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: { section: any }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>{section.title}</Text>
        </View>
    );

    const headerBackgroundColor = scrollY.interpolate({
        inputRange: [150, 250],
        outputRange: ['rgba(18, 18, 18, 0)', 'rgba(18, 18, 18, 1)'],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [150, 250],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const backButtonBgColor = scrollY.interpolate({
        inputRange: [150, 250],
        outputRange: ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0)'],
        extrapolate: 'clamp',
    });

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <Animated.View style={[styles.animatedHeader, { backgroundColor: headerBackgroundColor, paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Animated.View style={[styles.backButton, { backgroundColor: backButtonBgColor }]}>
                        <Ionicons name="arrow-back" size={26} color="#fff" />
                    </Animated.View>
                </TouchableOpacity>
                <Animated.Text style={[styles.headerTitle, { opacity: headerTitleOpacity }]} numberOfLines={1}>
                    {artistData.artist}
                </Animated.Text>
            </Animated.View>

            <AnimatedSectionList
                sections={sections}
                keyExtractor={(item: unknown, index: number) => (item as SongDetails).song_name + index}
                renderItem={renderSongItem as any}
                renderSectionHeader={renderSectionHeader}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    centerContainer: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    animatedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    backButton: {
        padding: 4,
        marginRight: 12,
        marginLeft: 8,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
        marginRight: 52,
    },
    headerContainer: {
        marginBottom: 16,
    },
    topSongsContainer: {
        marginTop: 54,
    },
    releasesContainer: {
        marginTop: 24,
    },
    releasesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    showAllText: {
        color: '#b3b3b3',
        fontSize: 14,
        fontWeight: '600',
    },
    releaseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 2,
        marginBottom: 8,
    },
    releaseThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        marginRight: 14,
        backgroundColor: '#2A2A2A',
    },
    seeMoreButton: {
        padding: 12,
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 15,
        marginHorizontal: 150,
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 24,
    },
    seeMoreText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    seeAllReleasesButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignSelf: 'center',
        marginTop: 4,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 24,
    },
    seeAllReleasesText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    topSongCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingVertical: 5,
        marginHorizontal: 12,
        marginBottom: 3,
    },
    topSongRank: {
        color: '#b3b3b3',
        fontSize: 16,
        fontWeight: 'bold',
        width: 30,
        marginRight: 15,
        textAlign: 'center',
    },
    bannerContainer: {
        height: 280,
        width: '100%',
        position: 'relative',
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    bannerPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#2A2A2A',
    },
    bannerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        //paddingTop: 10,
        //backgroundColor: 'rgba(0,0,0,0.4)',
    },
    artistNameMain: {
        fontSize: 36,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginRight: 6,
    },
    statLabel: {
        fontSize: 14,
        color: '#b3b3b3',
        fontWeight: '500',
    },
    statDivider: {
        width: 1,
        height: 14,
        backgroundColor: '#444',
        marginHorizontal: 16,
    },
    listContent: {
        paddingBottom: 100,
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 12,
        backgroundColor: '#121212',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    songCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#1A1A1A',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: '#2A2A2A',
    },
    songThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 14,
        backgroundColor: '#2A2A2A',
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    songName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    songMeta: {
        color: '#b3b3b3',
        fontSize: 13,
    },
    playIcon: {
        marginLeft: 12,
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#1DB954',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ArtistPage;
