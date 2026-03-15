import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMusicPlayer } from '../../services/MusicPlayer';
import { State, usePlaybackState } from 'react-native-track-player';

const MiniVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
    const animation1 = useRef(new Animated.Value(0)).current;
    const animation2 = useRef(new Animated.Value(0)).current;
    const animation3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let loop1: Animated.CompositeAnimation;
        let loop2: Animated.CompositeAnimation;
        let loop3: Animated.CompositeAnimation;

        if (isPlaying) {
            const createLoop = (anim: Animated.Value, duration: number, delay: number) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, delay }),
                        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true })
                    ])
                );
            };
            loop1 = createLoop(animation1, 400, 0);
            loop2 = createLoop(animation2, 300, 150);
            loop3 = createLoop(animation3, 500, 50);

            loop1.start();
            loop2.start();
            loop3.start();
        } else {
            animation1.stopAnimation();
            animation2.stopAnimation();
            animation3.stopAnimation();
            Animated.timing(animation1, { toValue: 0.1, duration: 200, useNativeDriver: true }).start();
            Animated.timing(animation2, { toValue: 0.1, duration: 200, useNativeDriver: true }).start();
            Animated.timing(animation3, { toValue: 0.1, duration: 200, useNativeDriver: true }).start();
        }

        return () => {
            if (loop1) loop1.stop();
            if (loop2) loop2.stop();
            if (loop3) loop3.stop();
        };
    }, [isPlaying]);

    return (
        <View style={styles.visualizerContainer}>
            <Animated.View style={[styles.visualizerBar, { transform: [{ scaleY: animation1.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
            <Animated.View style={[styles.visualizerBar, { transform: [{ scaleY: animation2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
            <Animated.View style={[styles.visualizerBar, { transform: [{ scaleY: animation3.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
        </View>
    );
};

interface SongDetails {
    song_name: string;
    release_date: string;
    release_month: string;
    release_year: number;
    thumbnail: string;
    preview_url: string;
}

const ArtistAlbumSongs = ({ route, navigation }: any) => {
    const { artistName, albumName, thumbnail, releaseMonth, releaseYear, songs } = route.params;
    const insets = useSafeAreaInsets();
    const { playTrack, currentTrack } = useMusicPlayer();
    const playbackState = usePlaybackState();
    const scrollY = useRef(new Animated.Value(0)).current;

    const headerBackgroundColor = scrollY.interpolate({
        inputRange: [50, 150],
        outputRange: ['rgba(18, 18, 18, 0)', 'rgba(18, 18, 18, 1)'],
        extrapolate: 'clamp',
    });

    const headerTitleOpacity = scrollY.interpolate({
        inputRange: [50, 150],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const backButtonBgColor = scrollY.interpolate({
        inputRange: [50, 150],
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
                    {albumName}
                </Animated.Text>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 20 }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                <View style={styles.albumInfoContainer}>
                    <Image source={{ uri: thumbnail }} style={styles.albumCover} />
                    <Text style={styles.albumTitle}>{albumName}</Text>
                    <Text style={styles.albumMeta}>{artistName} • {releaseMonth} {releaseYear}</Text>
                </View>

                {songs.map((song: SongDetails, index: number) => {
                    const isActive = currentTrack?.title === song.song_name || currentTrack?.song_name === song.song_name;
                    const isPlaying = isActive && playbackState?.state === State.Playing;

                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.songCard}
                            activeOpacity={0.7}
                            onPress={() => playTrack({
                                rank: 0,
                                song_name: song.song_name,
                                artist_name: artistName,
                                thumbnail: song.thumbnail,
                                preview_url: song.preview_url
                            })}
                        >
                            <View style={styles.songInfo}>
                                <View style={styles.songTitleRow}>
                                    {isActive && <MiniVisualizer isPlaying={isPlaying} />}
                                    <Text style={[styles.songName, isActive && { color: '#1DB954' }]} numberOfLines={1}>{song.song_name}</Text>
                                </View>
                                <Text style={styles.songMeta} numberOfLines={1}>{artistName}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </Animated.ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
        marginRight: 52,
    },
    listContent: {
        paddingBottom: 140,
    },
    albumInfoContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    albumCover: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 20,
        backgroundColor: '#2A2A2A',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    albumTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    albumMeta: {
        fontSize: 14,
        color: '#b3b3b3',
        fontWeight: '500',
        textAlign: 'center',
    },
    songCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingVertical: 5,
        marginHorizontal: 12,
        marginBottom: 7,
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 16,
    },
    songTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    songName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        flexShrink: 1,
    },
    songMeta: {
        color: '#b3b3b3',
        fontSize: 13,
    },
    visualizerContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 14,
        marginRight: 8,
        width: 14,
    },
    visualizerBar: {
        width: 2,
        height: '80%',
        backgroundColor: '#1DB954',
        marginHorizontal: 1,
        borderRadius: 2,
    },
});

export default ArtistAlbumSongs;
