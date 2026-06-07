import * as Keychain from 'react-native-keychain';

export const AuthStorage = {
  async saveTokens(accessToken: string, refreshToken: string) {
    try {
      await Keychain.setGenericPassword('refreshToken', refreshToken, { service: 'refreshToken' });
      await Keychain.setGenericPassword('accessToken', accessToken, { service: 'accessToken' });
    } catch (error) {
      console.error('Error saving tokens', error);
    }
  },

  async getAccessToken() {
    try {
      const credentials = await Keychain.getGenericPassword({ service: 'accessToken' });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error getting access token', error);
      return null;
    }
  },

  async getRefreshToken() {
    try {
      const credentials = await Keychain.getGenericPassword({ service: 'refreshToken' });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error getting refresh token', error);
      return null;
    }
  },

  async clearTokens() {
    try {
      await Keychain.resetGenericPassword({ service: 'accessToken' });
      await Keychain.resetGenericPassword({ service: 'refreshToken' });
    } catch (error) {
      console.error('Error clearing tokens', error);
    }
  }
};
