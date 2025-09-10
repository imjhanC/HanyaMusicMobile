import React, { createContext, useContext, useState, useEffect } from "react";
import { View, TouchableOpacity, Text, Image, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';

// Create context for music player state
const MusicPlayerContext = createContext();

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};

// Global Music Player Component
export const GlobalMusicPlayer = () => {
  const { currentTrack } = useMusicPlayer();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();
  
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlayPause = async () => {
    // Prevent multiple simultaneous operations
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      const currentState = await TrackPlayer.getState();
      console.log('Current TrackPlayer state:', currentState);
      
      if (currentState === State.Playing) {
        console.log('Pausing...');
        await TrackPlayer.pause();
      } else if (currentState === State.Paused || currentState === State.Ready || currentState === State.Stopped) {
        console.log('Playing...');
        await TrackPlayer.play();
      } else {
        console.log('Player not ready, current state:', currentState);
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    } finally {
      // Add a small delay to ensure state update
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  };

  if (!currentTrack) return null;

  // Determine if playing based on playback state
  const isPlaying = playbackState?.state === State.Playing;
  
  // When playing, show pause icon. When paused/stopped, show play icon
  const iconName = isPlaying ? "pause" : "play";

  console.log('Playback State:', playbackState, 'Is Playing:', isPlaying, 'Icon:', iconName);

  return (
    <View style={styles.globalPlayerWrapper}>
      <View style={styles.globalPlayerContainer}>
        <Image source={{ uri: currentTrack.thumbnail_url }} style={styles.playerThumbnail} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerTitle} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.playerArtist} numberOfLines={1}>{currentTrack.uploader}</Text>
        </View>
        <TouchableOpacity 
          onPress={togglePlayPause}
          style={[styles.controlButton, isLoading && styles.controlButtonDisabled]}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="hourglass" size={32} color="#999" />
          ) : (
            <Ionicons 
              name={iconName}
              size={32} 
              color="#fff" 
            />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(position / duration) * 100 || 0}%` }]} />
      </View>
    </View>
  );
};

// Music Player Provider
export const MusicPlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);

  const setupPlayer = async () => {
    try {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
    } catch (e) {
      console.error('Error setting up player:', e);
    }
  };

  const playTrack = async (track) => {
    try {
      const API_BASE_URL = 'https://instinctually-monosodium-shawnda.ngrok-free.app';
      const response = await fetch(`${API_BASE_URL}/stream/${track.videoId}`);
      const streamData = await response.json();

      if (streamData.stream_url) {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: track.videoId,
          url: streamData.stream_url,
          title: track.title,
          artist: track.uploader,
          artwork: track.thumbnail_url,
          duration: streamData.duration,
        });
        await TrackPlayer.play();
        setCurrentTrack(track);
      } else {
        console.error('Could not get stream URL');
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  useEffect(() => {
    setupPlayer();
    
    // Cleanup on unmount
    return () => {
      // TrackPlayer cleanup without using removeAllListeners
      TrackPlayer.reset();
    };
  }, []);

  return (
    <MusicPlayerContext.Provider value={{ currentTrack, setCurrentTrack, playTrack }}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

// Styles
const styles = StyleSheet.create({
  globalPlayerWrapper: {
    position: 'absolute',
    bottom: 70, // Above tab bar
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20, 20, 20, 0.98)',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  globalPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  playerThumbnail: {
    width: 55,
    height: 55,
    borderRadius: 6,
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  playerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerArtist: {
    color: '#aaa',
    fontSize: 14,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#222',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#333',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1DB954', // Spotify green
  },
});