import React, { createContext, useContext, useState, useEffect } from "react";
import { View, TouchableOpacity, Text, Image, StyleSheet, ActivityIndicator, Animated, Easing } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import TextTicker from "react-native-text-ticker";
import TrackPlayer, {
  Capability,
  State,
  usePlaybackState,
  useProgress,
  RepeatMode,
} from "react-native-track-player";

// ENV import 
import { HANYAMUSIC_URL } from "@env";


// Service Manager
import { ServiceManager } from "./ServiceManager";

// Context
interface MusicPlayerContextType {

  currentTrack: any;
  setCurrentTrack: (track: any) => void;
  playTrack: (track: any) => Promise<void>;
  isTrackLoading: boolean;
  isTransitioning: boolean;
  isAdvOpen: boolean;
  openAdv: () => void;
  closeAdv: () => void;
  currentScreen: string | null;
  setCurrentScreen: (screen: string | null) => void;
  queue: any[];
  setQueue: (tracks: any[]) => void;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  repeatMode: "off" | "once" | "track";
  setRepeatMode: (mode: "off" | "once" | "track") => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within a MusicPlayerProvider");
  }
  return context;
};

// Global Player Component
export const GlobalMusicPlayer = ({ drawerProgress }: { drawerProgress: any }) => {
  const { currentTrack, isTrackLoading, isTransitioning, openAdv, isAdvOpen, currentScreen } = useMusicPlayer();
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
    } catch (err) {
      console.error("Error toggling play/pause:", err);
    } finally {
      setTimeout(() => setIsToggling(false), 100);
    }
  };

  if (!currentTrack || isAdvOpen) return null;

  const isPlaying = playbackState?.state === State.Playing && !isTransitioning;
  const showLoading = isTrackLoading || isTransitioning;

  // Check if drawerProgress exists and has interpolate method
  const hasDrawerProgress = drawerProgress && typeof drawerProgress.interpolate === 'function';

  const isSearchAdvScreen = currentScreen === 'SearchAdv';

  // Animate opacity based on drawer progress
  const opacity = hasDrawerProgress ? drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  }) : 1;

  // Animate scale for a subtle shrinking effect
  const scale = hasDrawerProgress ? drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  }) : 1;

  // Determine pointer events - disable when drawer is open
  const getPointerEvents = () => {
    if (!hasDrawerProgress) return "auto";
    try {
      const progressValue = drawerProgress.__getValue();
      return progressValue > 0.5 ? "none" : "auto";
    } catch (e) {
      return "auto";
    }
  };

  return (
    <Animated.View
      style={[
        isSearchAdvScreen ? styles.globalPlayerWrapperBottom : styles.globalPlayerWrapper,
        hasDrawerProgress ? {
          opacity,
          transform: [{ scale }],
        } : {}
      ]}
      pointerEvents={getPointerEvents()}
    >
      <View style={styles.globalPlayerContainer}>
        <TouchableOpacity style={styles.tapZone} onPress={openAdv} activeOpacity={0.9}>
          <Image
            source={{ uri: currentTrack.thumbnail_url || currentTrack.artwork || "" }}
            style={styles.playerThumbnail}
          />
          <View style={styles.playerInfo}>
            <MarqueeTitle text={currentTrack.title || "Unknown Title"} textStyle={styles.playerTitle} />
            <Text style={styles.playerArtist} numberOfLines={1}>
              {currentTrack.uploader || currentTrack.artist || "Unknown Artist"}
            </Text>
          </View>
        </TouchableOpacity>
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
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" style={styles.playButton} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${(position / duration) * 100 || 0}%` }]} />
      </View>
    </Animated.View>
  );
};

// Autoplay Manager
const AutoplayManager = () => {
  const { currentTrack, queue, playTrack, isTrackLoading, isTransitioning, repeatMode, setRepeatMode, skipNext } = useMusicPlayer();
  const { position, duration } = useProgress();
  const [hasTriggered, setHasTriggered] = useState(false);
  const [hasRepeatedOnce, setHasRepeatedOnce] = useState(false);

  useEffect(() => {
    // Reset both flags when a new track starts
    setHasTriggered(false);
    setHasRepeatedOnce(false);
  }, [currentTrack?.title, currentTrack?.uploader]);

  useEffect(() => {
    // PROTECTIVE GUARDS
    if (isTrackLoading || isTransitioning || hasTriggered) return;
    if (!currentTrack || !queue.length || duration <= 0 || position < 5) return;

    const remaining = duration - position;

    // Trigger when 1.5 seconds are left
    if (remaining > 0 && remaining <= 1.5) {
      if (repeatMode === "track") {
        // TrackPlayer handles indefinite repeat natively
        return;
      }

      if (repeatMode === "once") {
        // Lock immediately to prevent double-firing
        setHasTriggered(true);

        if (!hasRepeatedOnce) {
          // First play-through ended: seek back and play one more time
          console.log("Autoplay: Repeat once - replaying song.");
          setHasRepeatedOnce(true);
          TrackPlayer.seekTo(0);
          TrackPlayer.play();
          // After seek settles, allow the trigger to fire again for the second end
          setTimeout(() => setHasTriggered(false), 2000);
        } else {
          // Second play-through ended: turn off repeat and move to next
          console.log("Autoplay: Repeat once finished - moving to next song.");
          setRepeatMode("off");
          skipNext();
        }
        return;
      }

      // Normal autoplay (repeatMode === "off")
      const currentIndex = queue.findIndex(t =>
      (t.song_name === (currentTrack.song_name || currentTrack.title) &&
        t.artist_name === (currentTrack.artist_name || currentTrack.uploader))
      );

      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        setHasTriggered(true);
        const nextTrack = queue[currentIndex + 1];
        console.log("Autoplay: Transitioning to next song:", nextTrack.song_name || nextTrack.title);
        playTrack({ ...nextTrack, isSearchBased: true });
      }
    }
  }, [position, duration, currentTrack, queue, hasTriggered, hasRepeatedOnce, isTrackLoading, isTransitioning, repeatMode]);

  return null;
};

// Provider
export const MusicPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isTrackLoading, setIsTrackLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAdvOpen, setIsAdvOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [repeatMode, _setRepeatMode] = useState<"off" | "once" | "track">("off");

  const setRepeatMode = async (mode: "off" | "once" | "track") => {
    _setRepeatMode(mode);
    if (mode === "track") {
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
    } else {
      await TrackPlayer.setRepeatMode(RepeatMode.Off);
    }
  };

  const setupPlayer = async () => {
    try {
      await TrackPlayer.setupPlayer({
        waitForBuffer: true,
        autoHandleInterruptions: true,
      });
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

      // RESTORE SESSION OR CLEAN UP
      const sessionTrack = await ServiceManager.enforceAppLifecycle();
      if (sessionTrack) {
        setCurrentTrack(sessionTrack);
      }
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
      await TrackPlayer.setVolume(1);
    } catch (err) {
      console.error("Error fading out track:", err);
      await TrackPlayer.setVolume(1);
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

      await TrackPlayer.setVolume(1);
    } catch (err) {
      console.error("Error fading in track:", err);
      await TrackPlayer.setVolume(1);
    }
  };

  const playTrack = async (track: any) => {
    try {
      const API_BASE_URL = HANYAMUSIC_URL;

      const currentState = await TrackPlayer.getState();
      const hasCurrentTrack = currentTrack && currentState === State.Playing;

      if (hasCurrentTrack) {
        setIsTransitioning(true);
        await fadeOutCurrentTrack(800);
      }

      // 1. Normalize the track data if it comes from Home screens
      let trackToPlay = track;
      if (track.song_name && track.artist_name && !track.videoId) {
        trackToPlay = {
          ...track,
          title: track.song_name,
          uploader: track.artist_name,
          thumbnail_url: track.thumbnail,
          isSearchBased: true,
        };
      }

      setCurrentTrack(trackToPlay);
      setIsTrackLoading(true);

      let streamData = null;

      // 2. Fetch specific endpoint based on track type
      if (trackToPlay.isSearchBased) {
        const query = `song_title=${encodeURIComponent(trackToPlay.song_name)}&artist=${encodeURIComponent(trackToPlay.artist_name)}`;
        const response = await fetch(`${API_BASE_URL}/search/exact?${query}`);
        streamData = await response.json();
      } else {
        const response = await fetch(`${API_BASE_URL}/stream/${track.videoId}`);
        streamData = await response.json();
      }

      if (streamData && streamData.stream_url) {
        await TrackPlayer.reset();

        const trackConfig = {
          id: trackToPlay.videoId || streamData.id || String(Date.now()), // Fallback ID
          url: streamData.stream_url,
          title: trackToPlay.title,
          artist: trackToPlay.uploader,
          artwork: trackToPlay.thumbnail_url,
          duration: streamData.duration,
          ...(streamData.headers ? { headers: streamData.headers } : {}),
        };

        await TrackPlayer.add(trackConfig);

        if (hasCurrentTrack) {
          await fadeInNewTrack(800);
        } else {
          await TrackPlayer.play();
        }
      }
    } catch (err) {
      console.error("Error playing track:", err);
      setCurrentTrack(null);
      await TrackPlayer.setVolume(1);
    } finally {
      setIsTrackLoading(false);
      setIsTransitioning(false);
    }
  };

  useEffect(() => {
    setupPlayer();
    // Intentionally removed TrackPlayer.reset() from cleanup 
    // to allow background playback to persist when app is minimized/closed
    return () => { };
  }, []);

  const skipNext = async () => {
    if (!queue.length || !currentTrack) return;
    const currentIndex = queue.findIndex((t: any) =>
      (t.song_name || t.title) === (currentTrack.song_name || currentTrack.title)
    );
    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      await playTrack({ ...queue[currentIndex + 1], isSearchBased: true });
    }
  };

  const skipPrevious = async () => {
    if (!queue.length || !currentTrack) return;
    const { position } = await TrackPlayer.getProgress();
    if (position > 5) {
      await TrackPlayer.seekTo(0);
      return;
    }

    const currentIndex = queue.findIndex((t: any) =>
      (t.song_name || t.title) === (currentTrack.song_name || currentTrack.title)
    );
    if (currentIndex > 0) {
      await playTrack({ ...queue[currentIndex - 1], isSearchBased: true });
    }
  };

  return (
    <MusicPlayerContext.Provider value={{
      currentTrack,
      setCurrentTrack,
      playTrack,
      isTrackLoading,
      isTransitioning,
      isAdvOpen,
      openAdv: () => setIsAdvOpen(true),
      closeAdv: () => setIsAdvOpen(false),
      currentScreen,
      setCurrentScreen,
      queue,
      setQueue,
      skipNext,
      skipPrevious,
      repeatMode,
      setRepeatMode,
    }}>
      {children}
      <AutoplayManager />
    </MusicPlayerContext.Provider>
  );
};

// Title Marquee Component
export const MarqueeTitle = ({ text, textStyle, style }: { text: string; textStyle?: any; style?: any }) => {
  return (
    <TextTicker
      style={[textStyle, style]}
      duration={15000}
      loop
      bounce={false}
      repeatSpacer={150}
      marqueeDelay={3000}
      shouldAnimateTreshold={10}
      useNativeDriver
    >
      {text}
    </TextTicker>
  );
};

// Styles
const styles = StyleSheet.create({
  globalPlayerWrapper: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: "rgba(32, 32, 32, 0.98)",
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
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  playerArtist: {
    color: "#aaa",
    fontSize: 14,
    marginBottom: 6,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  playButton: {
    marginRight: 12,
  },
  tapZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  globalPlayerWrapperBottom: {  // Add this new style
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(32, 32, 32, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
});