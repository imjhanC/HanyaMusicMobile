import React, { createContext, useContext, useState, useEffect } from "react";
import { View, TouchableOpacity, Text, Image, StyleSheet, ActivityIndicator } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
} from "react-native-track-player";

// Context
const MusicPlayerContext = createContext();

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
};

// Global Player Component
export const GlobalMusicPlayer = () => {
  const { currentTrack, isTrackLoading, isTransitioning } = useMusicPlayer();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();
  const [isToggling, setIsToggling] = useState(false);

  const togglePlayPause = async () => {
    if (isToggling || isTrackLoading || isTransitioning) return;

    try {
      setIsToggling(true);
      const currentState = await TrackPlayer.getState();

      if (currentState === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    } finally {
      setTimeout(() => setIsToggling(false), 100);
    }
  };

  if (!currentTrack) return null;

  const isPlaying = playbackState?.state === State.Playing && !isTransitioning;
  const showLoading = isTrackLoading || isTransitioning;

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
          style={[styles.controlButton, (isToggling || showLoading) && styles.controlButtonDisabled]}
          disabled={isToggling || showLoading}
          activeOpacity={0.7}
        >
          {showLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isToggling ? (
            <Ionicons name="hourglass" size={28} color="#999" />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(position / duration) * 100 || 0}%` }]} />
      </View>
    </View>
  );
};

// Provider
export const MusicPlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
      console.error("Error setting up player:", e);
    }
  };

  const fadeOutCurrentTrack = async (duration = 1000) => {
    try {
      const currentState = await TrackPlayer.getState();
      if (currentState !== State.Playing) return;

      const steps = 20;
      const stepDuration = duration / steps;
      const volumeDecrement = 1 / steps;

      for (let i = 0; i < steps; i++) {
        const newVolume = Math.max(0, 1 - (volumeDecrement * (i + 1)));
        await TrackPlayer.setVolume(newVolume);
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }

      await TrackPlayer.pause();
      await TrackPlayer.setVolume(1); // Reset volume for next track
    } catch (error) {
      console.error("Error fading out track:", error);
      await TrackPlayer.setVolume(1); // Reset volume on error
    }
  };

  const fadeInNewTrack = async (duration = 1000) => {
    try {
      await TrackPlayer.setVolume(0);
      await TrackPlayer.play();

      const steps = 20;
      const stepDuration = duration / steps;
      const volumeIncrement = 1 / steps;

      for (let i = 0; i < steps; i++) {
        const newVolume = Math.min(1, volumeIncrement * (i + 1));
        await TrackPlayer.setVolume(newVolume);
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }

      await TrackPlayer.setVolume(1); // Ensure full volume
    } catch (error) {
      console.error("Error fading in track:", error);
      await TrackPlayer.setVolume(1); // Reset volume on error
    }
  };

  const playTrack = async (track) => {
    try {
      const API_BASE_URL = "https://instinctually-monosodium-shawnda.ngrok-free.app";
      
      // Check if there's a current track playing
      const currentState = await TrackPlayer.getState();
      const hasCurrentTrack = currentTrack && currentState === State.Playing;

      if (hasCurrentTrack) {
        // Start transition state
        setIsTransitioning(true);
        
        // Fade out current track
        await fadeOutCurrentTrack(800);
      }

      // Show new track immediately
      setCurrentTrack(track);
      setIsTrackLoading(true);

      // Fetch stream data for new track
      const response = await fetch(`${API_BASE_URL}/stream/${track.videoId}`);
      const streamData = await response.json();

      if (streamData.stream_url) {
        await TrackPlayer.reset();

        const trackConfig = {
          id: track.videoId,
          url: streamData.stream_url,
          title: track.title,
          artist: track.uploader,
          artwork: track.thumbnail_url,
          duration: streamData.duration,
          ...(streamData.headers ? { headers: streamData.headers } : {}),
        };

        await TrackPlayer.add(trackConfig);
        
        if (hasCurrentTrack) {
          // Fade in new track
          await fadeInNewTrack(800);
        } else {
          // Just play normally if no previous track
          await TrackPlayer.play();
        }
      }
    } catch (error) {
      console.error("Error playing track:", error);
      setCurrentTrack(null);
      await TrackPlayer.setVolume(1); // Reset volume on error
    } finally {
      setIsTrackLoading(false);
      setIsTransitioning(false);
    }
  };

  useEffect(() => {
    setupPlayer();
    return () => {
      TrackPlayer.reset();
    };
  }, []);

  return (
    <MusicPlayerContext.Provider value={{ 
      currentTrack, 
      setCurrentTrack, 
      playTrack, 
      isTrackLoading, 
      isTransitioning 
    }}>
      {children}
    </MusicPlayerContext.Provider>
  );
};

// Styles
const styles = StyleSheet.create({
  globalPlayerWrapper: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: "rgba(20, 20, 20, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  globalPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    justifyContent: "center",
  },
  playerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  playerArtist: {
    color: "#aaa",
    fontSize: 14,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    //backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonDisabled: {
    backgroundColor: "#222",
  },
  progressContainer: {
    height: 4,
    backgroundColor: "#333",
    width: "100%",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1DB954",
  },
});