import React, { useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from 'react-native-vector-icons/Ionicons';
import TextTicker from 'react-native-text-ticker';
import { useMusicPlayer } from '../../services/MusicPlayer';

interface CountrySong {
    rank: number;
    song_name: string;
    artist_name: string;
    thumbnail: string;
    preview_url: string;
}

interface Props {
    route: any;
    navigation: any;
}

interface SongItemProps {
    item: CountrySong;
    onPress: (item: CountrySong) => void;
    isCurrentlyPlaying: boolean;
    isLoading: boolean;
}

const SongItem = React.memo(({ item, onPress, isCurrentlyPlaying, isLoading }: SongItemProps) => (
    <TouchableOpacity
        style={styles.item}
        onPress={() => onPress(item)}
        activeOpacity={0.75}
    >
        {/* Song Thumbnail */}
        <View style={styles.imageContainer}>
            <Image
                source={{ uri: item.thumbnail }}
                style={styles.image}
            />
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#1DB954" />
                </View>
            )}
        </View>

        {/* Song Info */}
        <View style={styles.songInfo}>
            {isCurrentlyPlaying ? (
                <TextTicker
                    style={[styles.songName, styles.songNameActive]}
                    duration={15000}
                    loop
                    bounce={false}
                    repeatSpacer={150}
                    marqueeDelay={3000}
                    shouldAnimateTreshold={10}
                    useNativeDriver
                >
                    {item.song_name}
                </TextTicker>
            ) : (
                <Text style={styles.songName} numberOfLines={1}>
                    {item.song_name}
                </Text>
            )}
            <Text style={styles.artistName} numberOfLines={1}>
                {item.artist_name}
            </Text>
        </View>
    </TouchableOpacity>
));

const TopCountrySongs = ({ route, navigation }: Props) => {
    const { songs, countryName } = route.params;
    const { playTrack, currentTrack, isTrackLoading, setCurrentScreen, setQueue } = useMusicPlayer();

    useEffect(() => {
        setCurrentScreen('TopCountrySongs');
        setQueue(songs || []);
        return () => {
            setCurrentScreen(null);
        };
    }, [songs]);

    const handleSongPress = React.useCallback((item: CountrySong) => {
        playTrack({
            song_name: item.song_name,
            artist_name: item.artist_name,
            thumbnail: item.thumbnail,
            title: item.song_name,
            uploader: item.artist_name,
            thumbnail_url: item.thumbnail,
            isSearchBased: true,
        });
    }, [playTrack]);

    const renderItem = React.useCallback(({ item }: { item: CountrySong }) => {
        const isCurrentlyPlaying =
            currentTrack?.song_name === item.song_name &&
            currentTrack?.artist_name === item.artist_name;

        const isLoading =
            isTrackLoading && isCurrentlyPlaying;

        return (
            <SongItem
                item={item}
                onPress={handleSongPress}
                isCurrentlyPlaying={isCurrentlyPlaying}
                isLoading={isLoading}
            />
        );
    }, [handleSongPress, currentTrack, isTrackLoading]);

    const keyExtractor = React.useCallback((item: CountrySong) => item.rank.toString(), []);

    const getItemLayout = React.useCallback((data: any, index: number) => ({
        length: 70,
        offset: 70 * index,
        index,
    }), []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Top Songs in {countryName}</Text>
            </View>

            {/* Song List */}
            <FlatList
                data={songs || []}
                keyExtractor={keyExtractor}
                getItemLayout={getItemLayout}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderItem}
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },

    header: {
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },

    backButton: {
        marginRight: 12,
        padding: 4,
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        flex: 1,
    },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },

    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 4,
    },

    imageContainer: {
        width: 52,
        height: 52,
        marginRight: 14,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2A2A',
    },

    image: {
        width: 52,
        height: 52,
        borderRadius: 8,
    },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
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

    songNameActive: {
        color: '#1DB954',
        marginTop: 6,
    },

    artistName: {
        color: '#b3b3b3',
        fontSize: 14,
        fontWeight: '400',
    },
});

export default TopCountrySongs;