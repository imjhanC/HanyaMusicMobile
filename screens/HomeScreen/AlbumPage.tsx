import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from 'react-native-vector-icons/Ionicons';

const AlbumPage = ({ route, navigation }: any) => {
    const { artistName, albums } = route.params;
    const insets = useSafeAreaInsets();

    const allReleases = Object.keys(albums).map(albumName => {
        const firstSong = albums[albumName][0];
        const dateValue = new Date(firstSong.release_date).getTime() || firstSong.release_year;
        return {
            albumName,
            releaseDateVal: dateValue,
            releaseYear: firstSong.release_year,
            releaseMonth: firstSong.release_month,
            thumbnail: firstSong.thumbnail,
            songs: albums[albumName],
        };
    }).sort((a, b) => b.releaseDateVal - a.releaseDateVal);

    return (
        <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>All releases</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {allReleases.map((release, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.releaseCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('ArtistAlbumSongs', { 
                            artistName, 
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
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#121212',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
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
        paddingTop: 16,
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
});

export default AlbumPage;
