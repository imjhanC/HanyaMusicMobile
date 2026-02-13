import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface GlobalSong {
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

const SongCard = React.memo(({ item }: { item: GlobalSong }) => (
    <View style={styles.card}>
        {/* Rank */}
        <Text style={styles.rankText}>{item.rank}</Text>

        {/* Song Thumbnail */}
        <Image
            source={{ uri: item.thumbnail }}
            style={styles.image}
        />

        {/* Song Info */}
        <View style={styles.songInfo}>
            <Text style={styles.songName} numberOfLines={1}>
                {item.song_name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
                {item.artist_name}
            </Text>
        </View>
    </View>
));

const TopGlobalSongs = ({ route, navigation }: Props) => {
    const { GlobalSongs } = route.params;

    const renderItem = React.useCallback(({ item }: { item: GlobalSong }) => (
        <SongCard item={item} />
    ), []);

    const keyExtractor = React.useCallback((item: GlobalSong) => item.rank.toString(), []);

    const getItemLayout = React.useCallback((data: any, index: number) => ({
        length: 72, // 52 (image) + 20 (padding)
        offset: (72 + 8) * index, // (length + marginBottom) * index
        index,
    }), []);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Top Global Songs</Text>
            </View>

            {/* Song List */}
            <FlatList
                data={GlobalSongs || []}
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
    },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 0.5,
        borderColor: '#2A2A2A',
    },

    rankText: {
        width: 28,
        color: '#09ff00',
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginRight: 12,
    },

    image: {
        width: 52,
        height: 52,
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

    artistName: {
        color: '#b3b3b3',
        fontSize: 14,
        fontWeight: '400',
    },
});


export default TopGlobalSongs;