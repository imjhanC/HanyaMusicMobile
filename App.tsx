import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import Home from "./screens/Home";
import Playlist from "./screens/Playlist";
import SearchScreen from "./screens/SearchScreen/SearchScreen";
import NoInternetScreen from "./screens/NoInternetScreen";
import SearchScreenAdv from "./screens/SearchScreen/SearchScreenAdv";
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import TopGlobalArtists from './screens/HomeScreen/TopGlobalArtists';
import TopGlobalSongs from './screens/HomeScreen/TopGlobalSongs';
import TopCountrySongs from './screens/HomeScreen/TopCountrySongs';

//import CreateAccScreen from './screens/LoginScreen/CreateAccScreen';

// Music Player
import { GlobalMusicPlayer, MusicPlayerProvider } from "./services/MusicPlayer";
import MusicPlayerAdv from "./services/MusicPlayerAdv";

// Sidebar
import HomeSidebar from "./sidebars/HomeSidebar";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const SPLASH_SHOWN_KEY = '@splash_shown';

// Custom header with user icon
function CustomHeader({ navigation }: any) {
  return (
    <TouchableOpacity style={styles.headerButton} onPress={() => navigation.openDrawer()}>
      <Ionicons name="person-circle-outline" size={styles.headerIconSize.size} color="#fff" />
    </TouchableOpacity>
  );
}

// Bottom Tabs
export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
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
          let iconName;
          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Playlist") iconName = focused ? "list" : "list-outline";
          else if (route.name === "Search") iconName = focused ? "search" : "search-outline";
          return <Ionicons name={iconName} size={styles.tabBarIconSize.size} color={color} />;
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
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ headerTitle: "" }} />
      <Tab.Screen name="Playlist" component={Playlist} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

// Stack Navigator wrapping the tabs
function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeDrawer" component={HomeSidebar} />
      <Stack.Screen name="SearchAdv" component={SearchScreenAdv} />
      <Stack.Screen name="TopGlobalArtists" component={TopGlobalArtists} />
      <Stack.Screen name="TopGlobalSongs" component={TopGlobalSongs} />
      <Stack.Screen name="TopCountrySongs" component={TopCountrySongs} />
      {/* FULL SCREEN LOGIN SCREEN */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
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
      } catch (error) {
        console.log('Error checking splash status:', error);
        setIsLoading(false);
      }
    };

    checkSplashStatus();
  }, []);

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

  const handleRetry = async () => {
    setIsCheckingConnection(true);
    try {
      const state = await NetInfo.refresh();
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
    } catch (error) {
      console.log("Network check failed:", error);
      setIsConnected(false);
    } finally {
      setTimeout(() => setIsCheckingConnection(false), styles.retryTimeout.timeout);
    }
  };

  const handleSplashFinish = async () => {
    try {
      await AsyncStorage.setItem(SPLASH_SHOWN_KEY, 'true');
      setShowSplash(false);
    } catch (error) {
      console.log('Error saving splash status:', error);
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
      <NavigationContainer>
        <View style={{ flex: 1 }}>
          <MainStack />
          <GlobalMusicPlayer />
          <MusicPlayerAdv />
        </View>
      </NavigationContainer>
    </MusicPlayerProvider>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginLeft: 8,  // default : 16
    marginTop: 8
  },
  headerIconSize: {
    size: 45
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
    size: 28
  },
  tabBarLabel: {
    marginTop: 4,
    fontSize: 12
  },
  retryTimeout: {
    timeout: 1000
  }
});