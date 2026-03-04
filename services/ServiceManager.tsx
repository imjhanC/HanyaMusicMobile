import TrackPlayer, { State } from "react-native-track-player";

// Dynamic URL endpoint
const TUNNEL_URL_ENDPOINT = "https://hanyamusic-ac4ce-default-rtdb.asia-southeast1.firebasedatabase.app/firebase/tunnel_url.json";

export class ServiceManager {
    private static _cachedUrl: string | null = null;

    /**
     * Fetches the dynamic HANYAMUSIC_URL from Firebase.
     * Caches the result for subsequent calls.
     */
    static async getHanyaMusicUrl(): Promise<string> {
        if (this._cachedUrl) return this._cachedUrl;

        try {
            console.log("ServiceManager: Fetching dynamic tunnel URL...");
            const response = await fetch(TUNNEL_URL_ENDPOINT);
            const url = await response.json();

            if (url && typeof url === 'string') {
                this._cachedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
                console.log("ServiceManager: Dynamic URL updated to:", this._cachedUrl);
                return this._cachedUrl;
            }
            throw new Error("Invalid tunnel URL format received");
        } catch (error) {
            console.error("ServiceManager: Failed to fetch tunnel URL:", error);
            // Fallback to ngrok if fetch fails (compatibility)
            return "https://instinctually-monosodium-shawnda.ngrok-free.app";
        }
    }

    /**
     * Handles the app boot lifecycle for the music player.
     * - If the player is active (Playing/Paused/Buffering), it attempts to retrieve the current track
     *   to restore the UI state.
     * - If the player is inactive (idling without media or stopped), it resets the player to ensure
     *   a clean state (removes persistent notifications).
     * 
     * @returns {Promise<any | null>} The current track object if restoration is successful, otherwise null.
     */
    static async enforceAppLifecycle(): Promise<any | null> {
        try {
            // Get the current state of the player
            const state = await TrackPlayer.getState();

            // Check if the player is in an active state
            // Ready usually means a track is loaded and ready to play/paused
            const isActive =
                state === State.Playing ||
                state === State.Paused ||
                state === State.Buffering ||
                state === State.Ready;

            if (isActive) {
                // Attempt to recover the currently active track
                const trackIndex = await TrackPlayer.getCurrentTrack();

                if (trackIndex !== null) {
                    const trackData = await TrackPlayer.getTrack(trackIndex);
                    if (trackData) {
                        console.log("ServiceManager: Restoring active session for track:", trackData.title);
                        // Normalize data for UI (MusicPlayer.tsx expects thumbnail_url and uploader)
                        return {
                            ...trackData,
                            thumbnail_url: trackData.artwork || trackData.thumbnail_url,
                            uploader: trackData.artist || trackData.uploader,
                        };
                    }
                }
            }

            // If not active, or if we couldn't recover the track, ensure a clean slate
            // This kills the notification and clears the queue
            const stateName = Object.keys(State).find(key => State[key as keyof typeof State] === state);
            console.log(`ServiceManager: Player inactive (State: ${stateName || state}). Resetting.`);
            await TrackPlayer.reset();
            return null;

        } catch (error) {
            console.error("ServiceManager: Error enforcing lifecycle:", error);
            return null;
        }
    }
}
