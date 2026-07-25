import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Image } from "react-native";
import { NavigationContainer, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import Home from "./screens/Home";
import Playlist from "./screens/Playlist";
import SearchScreen from "./screens/SearchScreen/SearchScreen";
import PlaylistDetails from "./screens/PlaylistDetails";
import NoInternetScreen from "./screens/NoInternetScreen";
import SearchScreenAdv from "./screens/SearchScreen/SearchScreenAdv";
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import RegAccScreen from './screens/LoginScreen/RegAccScreen';
import TopGlobalArtists from './screens/HomeScreen/TopGlobalArtists';
import TopGlobalSongs from './screens/HomeScreen/TopGlobalSongs';
import TopCountrySongs from './screens/HomeScreen/TopCountrySongs';
import ArtistPage from './screens/HomeScreen/ArtistPage';
import AlbumPage from './screens/HomeScreen/AlbumPage';
import ArtistAlbumSongs from './screens/HomeScreen/ArtistAlbumSongs';

// Music Player
import { GlobalMusicPlayer, MusicPlayerProvider } from "./services/MusicPlayer";
import MusicPlayerAdv from "./services/MusicPlayerAdv";

// Sidebar
import HomeSidebar from "./sidebars/HomeSidebar";

// Auth
import { AuthProvider, useAuth } from "./services/Auth/AuthProvider";
import { LoginStateManager } from "./services/Auth/LoginStateManager";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const PlaylistStack = createNativeStackNavigator();

const SPLASH_SHOWN_KEY = '@splash_shown';
const RETRY_TIMEOUT = 1000;

// Top Bar
function CustomHeader({ navigation }: any) {
  const { isAuthenticated, user } = useAuth();

  return (
    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.openDrawer()}>
      {isAuthenticated && user?.avatar_url ? (
        <View style={{ width: 42, height: 42, borderRadius: 19, overflow: "hidden", borderWidth: 1.5, borderColor: '#000000ff' }}>
          <Image
            source={{ uri: user.avatar_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      ) : (
        <Ionicons name="person-circle-outline" size={45} color="#fff" />
      )}
    </TouchableOpacity>
  );
}

// Bottom Tabs
export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? route.name;
        const isHeaderHidden = ["TopGlobalArtists", "TopGlobalSongs", "TopCountrySongs", "ArtistPage", "AlbumPage", "ArtistAlbumSongs", "PlaylistDetails"].includes(routeName);

        return {
          headerShown: !isHeaderHidden,
          headerStyle: { backgroundColor: "#121212" },
          headerTintColor: "#fff",
          headerTitleAlign: "center",
          headerLeft: () => <CustomHeader navigation={navigation} />,
          headerLeftContainerStyle: styles.headerLeftContainer,
          tabBarStyle: {
            position: "absolute",
            height: styles.tabBarHeight.height,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            borderTopWidth: 0,
            elevation: 0,
            paddingTop: styles.tabBarPaddingTop.paddingTop,
          },
          tabBarIcon: ({ color, focused }) => {
            let iconName = "home-outline";
            if (route.name === "Home") iconName = focused ? "home" : "home-outline";
            else if (route.name === "Playlist") iconName = focused ? "list" : "list-outline";
            else if (route.name === "Search") iconName = focused ? "search" : "search-outline";
            return <Ionicons name={iconName} size={28} color={color} />;
          },
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "gray",
          tabBarButton: (props: any) => {
            const { onPress, onLongPress, children, style } = props;
            return (
              <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={1} style={style}>
                {children}
              </TouchableOpacity>
            );
          },
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ headerTitle: "" }} />
      <Tab.Screen name="Playlist" component={PlaylistStackNavigator} options={{ headerTitleAlign: "left", headerTitleStyle: { fontSize: 31, fontWeight: "bold", marginLeft: 30, marginTop: 7 } }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ headerTitleAlign: "left", headerTitleStyle: { fontSize: 31, fontWeight: "bold", marginLeft: 30, marginTop: 7 } }} />
    </Tab.Navigator>
  );
}

// Home page Stack
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={Home} />
      <HomeStack.Screen name="TopGlobalArtists" component={TopGlobalArtists} />
      <HomeStack.Screen name="TopGlobalSongs" component={TopGlobalSongs} />
      <HomeStack.Screen name="TopCountrySongs" component={TopCountrySongs} />
      <HomeStack.Screen name="ArtistPage" component={ArtistPage} />
      <HomeStack.Screen name="AlbumPage" component={AlbumPage} />
      <HomeStack.Screen name="ArtistAlbumSongs" component={ArtistAlbumSongs} />
    </HomeStack.Navigator>
  );
}

function PlaylistStackNavigator() {
  return (
    <PlaylistStack.Navigator screenOptions={{ headerShown: false }}>
      <PlaylistStack.Screen name="PlaylistMain" component={Playlist} />
      <PlaylistStack.Screen name="PlaylistDetails" component={PlaylistDetails} />
    </PlaylistStack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeDrawer" component={HomeSidebar} />
      <Stack.Screen name="SearchAdv" component={SearchScreenAdv} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RegAccScreen"
        component={RegAccScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Check if splash has been shown before
  useEffect(() => {
    const checkSplashStatus = async () => {
      try {
        const hasShownSplash = await AsyncStorage.getItem(SPLASH_SHOWN_KEY);
        if (hasShownSplash === 'true') {
          setShowSplash(false);
        }
        setIsLoading(false);
      } catch (err) {
        console.log('Error checking splash status:', err);
        setIsLoading(false);
      }
    };

    checkSplashStatus();
  }, []);

  // Check if users's phone has no internet 
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
    });

    NetInfo.fetch().then((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  // Handle retry connection to the HANYAMUSIC server
  const handleRetry = async () => {
    setIsCheckingConnection(true);
    try {
      const state = await NetInfo.refresh();
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
    } catch (err) {
      console.log("Network check failed:", err);
      setIsConnected(false);
    } finally {
      setTimeout(() => setIsCheckingConnection(false), RETRY_TIMEOUT);
    }
  };

  const handleSplashFinish = async () => {
    try {
      await AsyncStorage.setItem(SPLASH_SHOWN_KEY, 'true');
      setShowSplash(false);
    } catch (err) {
      console.log('Error saving splash status:', err);
      setShowSplash(false);
    }
  };

  // Show splash screen only on first boot
  if (isLoading || showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (isConnected === false) {
    return (
      <MusicPlayerProvider>
        <NoInternetScreen onRetry={handleRetry} />
      </MusicPlayerProvider>
    );
  }

  return (
    <MusicPlayerProvider>
      <AuthProvider>
        <LoginStateManager>
          <NavigationContainer>
            <View style={{ flex: 1 }}>
              <MainStack />
              <MusicPlayerAdv />
            </View>
          </NavigationContainer>
        </LoginStateManager>
      </AuthProvider>
    </MusicPlayerProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginLeft: 8,  // default : 16
    marginTop: 8
  },
  headerLeftContainer: {
    paddingLeft: 16
  },
  tabBarHeight: {
    height: 90
  },
  tabBarPaddingTop: {
    paddingTop: 13
  },
  tabBarIconSize: {
    width: 28,
    height: 28
  },
  tabBarLabel: {
    marginTop: 4,
    fontSize: 12
  }
});
