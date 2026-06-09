import axios from 'axios';
import { AuthStorage } from './AuthStorage';
import { ServiceManager } from '../ServiceManager';

const AuthApi = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the access token
AuthApi.interceptors.request.use(
  async (config) => {
    const baseUrl = await ServiceManager.getHanyaMusicUrl();
    // Explicitly set the full URL to avoid Axios baseURL resolution issues
    if (config.url && config.url.startsWith('/')) {
        config.url = `${baseUrl}${config.url}`;
    } else if (config.url && !config.url.startsWith('http')) {
        config.url = `${baseUrl}/${config.url}`;
    }

    const token = await AuthStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401s and token refresh
AuthApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AuthStorage.getRefreshToken();
        
        if (!refreshToken) {
          // No refresh token available, force logout
          return Promise.reject(error);
        }

        // Call your refresh token endpoint with the dynamic URL
        const baseUrl = await ServiceManager.getHanyaMusicUrl();
        const response = await axios.post(`${baseUrl}/auth/refresh-token`, {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token: new_refresh_token } = response.data;
        
        // Save new tokens
        await AuthStorage.saveTokens(access_token, new_refresh_token || refreshToken);

        // Update authorization header and retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return AuthApi(originalRequest);
        
      } catch (refreshError) {
        // Refresh token failed (expired or revoked). Need to logout.
        await AuthStorage.clearTokens();
        // You might want to emit an event here so your AuthProvider knows to log out the user
        // Or handle the logout directly in the UI components
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default AuthApi;
