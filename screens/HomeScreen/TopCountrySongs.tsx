import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const CARD_MARGIN = 6;
// Calculate card width based on screen width, padding, and margins
const CARD_WIDTH = (width - 32 - (CARD_MARGIN * 2 * COLUMN_COUNT)) / COLUMN_COUNT;

const SongCard = React.memo(({ item }: { item: CountrySong }) => (
    <View style={styles.card}>
        <Image
            source={{ uri: item.thumbnail }}
            style={styles.image}
        />
        <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{item.rank}</Text>
        </View>
        <Text style={styles.songName} numberOfLines={1}>
            {item.song_name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
            {item.artist_name}
        </Text>
    </View>
));

const TopCountrySongs = ({ route, navigation }: Props) => {
    const { songs, countryName } = route.params;

    const renderItem = React.useCallback(({ item }: { item: CountrySong }) => (
        <SongCard item={item} />
    ), []);

    const keyExtractor = React.useCallback((item: CountrySong) => item.rank.toString(), []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Top Songs in {countryName}</Text>
            </View>

            {/* Song Grid */}
            <FlatList
                data={songs || []}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderItem}
                numColumns={COLUMN_COUNT}
                key={COLUMN_COUNT} // Force re-render if columns change
                columnWrapperStyle={styles.columnWrapper}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },

    header: {
        paddingTop: 48,
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
        paddingHorizontal: 16 - CARD_MARGIN, // Adjust for card margins
        paddingBottom: 16,
    },

    columnWrapper: {
        justifyContent: 'flex-start',
    },

    card: {
        width: CARD_WIDTH,
        margin: CARD_MARGIN,
        marginBottom: 16,
        backgroundColor: '#1A1A1A', // Optional: Keep background or transparent
        borderRadius: 8,
        // If we want it to look exactly like Home card (no background color usually? Home has separate styles)
        // Home styles: card width 140, no bg on container, Image has bg.
        // Let's keep it clean
        alignItems: 'flex-start',
    },

    image: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 8,
        backgroundColor: '#282828',
        marginBottom: 8,
    },

    rankBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },

    rankText: {
        color: '#1DB954',
        fontSize: 12,
        fontWeight: 'bold',
    },

    songName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },

    artistName: {
        color: '#b3b3b3',
        fontSize: 12,
        fontWeight: '400',
    },
});

export default TopCountrySongs;
