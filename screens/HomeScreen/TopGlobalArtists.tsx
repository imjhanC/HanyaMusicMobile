import React from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from 'react-native-vector-icons/Ionicons';

interface Artist {
    rank: number;
    artist_name: string;
    thumbnail: string;
}

interface Props {
    route: any;
    navigation: any;
}

const ArtistCard = React.memo(({ item }: { item: Artist }) => (
    <View style={styles.card}>
        {/* Rank */}
        <Text style={styles.rankText}>{item.rank}</Text>

        {/* Artist Image */}
        <Image
            source={{ uri: item.thumbnail }}
            style={styles.image}
        />

        {/* Artist Name */}
        <Text style={styles.name} numberOfLines={1}>
            {item.artist_name}
        </Text>
    </View>
));

const TopGlobalArtists = ({ route, navigation }: Props) => {
    const { artists } = route.params;

    const renderItem = React.useCallback(({ item }: { item: Artist }) => (
        <ArtistCard item={item} />
    ), []);

    const keyExtractor = React.useCallback((item: Artist) => item.rank.toString(), []);

    const getItemLayout = React.useCallback((data: any, index: number) => ({
        length: 72, // 52 (image) + 20 (padding)
        offset: (72 + 8) * index, // (length + marginBottom) * index
        index,
    }), []);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Top Global Artists</Text>
            </View>

            {/* Artist List */}
            <FlatList
                data={artists || []}
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
        borderRadius: 26,
        marginRight: 14,
        backgroundColor: '#2A2A2A',
    },

    name: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});


export default TopGlobalArtists;
