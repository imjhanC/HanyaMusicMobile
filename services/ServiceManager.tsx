import TrackPlayer, { State } from "react-native-track-player";

export class ServiceManager {
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
                        return trackData;
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
