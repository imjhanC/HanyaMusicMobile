import AuthApi from './Auth/AuthApi';

export interface PlaylistResponse {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}

export interface TrackAdd {
    video_id: string;
    title: string;
    artist?: string;
    image_url?: string;
    duration_seconds?: number;
    track_order?: number;
}

export interface TrackResponse {
    id: number;
    playlist_id: number;
    video_id: string;
    title: string;
    artist: string | null;
    image_url: string | null;
    duration_seconds: number | null;
    track_order: number | null;
    added_at: string;
}

export class PlaylistApi {
    static async createPlaylist(
        name: string,
        description?: string,
        isPublic: boolean = false,
        imageUri?: string,
        imageType?: string,
        imageName?: string
    ): Promise<PlaylistResponse> {
        const formData = new FormData();
        formData.append('name', name);
        if (description) formData.append('description', description);
        formData.append('is_public', isPublic.toString());

        if (imageUri) {
            formData.append('image', {
                uri: imageUri,
                type: imageType || 'image/jpeg',
                name: imageName || 'upload.jpg',
            } as any);
        }

        const response = await AuthApi.post('/playlists', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    static async getMyPlaylists(): Promise<PlaylistResponse[]> {
        try {
            const response = await AuthApi.get('/playlists/me');
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return [];
            }
            throw error;
        }
    }

    static async getPlaylist(playlistId: number): Promise<PlaylistResponse> {
        const response = await AuthApi.get(`/playlists/${playlistId}`);
        return response.data;
    }

    static async updatePlaylist(
        playlistId: number,
        name?: string,
        description?: string,
        isPublic?: boolean,
        imageUri?: string,
        imageType?: string,
        imageName?: string
    ): Promise<PlaylistResponse> {
        const formData = new FormData();
        if (name !== undefined) formData.append('name', name);
        if (description !== undefined) formData.append('description', description);
        if (isPublic !== undefined) formData.append('is_public', isPublic.toString());

        if (imageUri) {
            formData.append('image', {
                uri: imageUri,
                type: imageType || 'image/jpeg',
                name: imageName || 'upload.jpg',
            } as any);
        }

        const response = await AuthApi.patch(`/playlists/${playlistId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    static async deletePlaylist(playlistId: number): Promise<void> {
        await AuthApi.delete(`/playlists/${playlistId}`);
    }

    static async addTrack(playlistId: number, track: TrackAdd): Promise<TrackResponse> {
        const response = await AuthApi.post(`/playlists/${playlistId}/tracks`, track);
        return response.data;
    }

    static async getTracks(playlistId: number): Promise<TrackResponse[]> {
        try {
            const response = await AuthApi.get(`/playlists/${playlistId}/tracks`);
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return [];
            }
            throw error;
        }
    }

    static async removeTrack(playlistId: number, trackId: number): Promise<void> {
        await AuthApi.delete(`/playlists/${playlistId}/tracks/${trackId}`);
    }

    static async clearPlaylist(playlistId: number): Promise<void> {
        await AuthApi.delete(`/playlists/${playlistId}/tracks`);
    }
}
