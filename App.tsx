import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
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
    <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => navigation.openDrawer()}>
      <Ionicons name="person-circle-outline" size={40} color="#fff" />
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
        headerLeftContainerStyle: { paddingLeft: 16 }, 
        tabBarStyle: {
          position: "absolute",
          height: 90,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 13,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName;
          if (route.name === "Home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Playlist") iconName = focused ? "list" : "list-outline";
          else if (route.name === "Search") iconName = focused ? "search" : "search-outline";
          return <Ionicons name={iconName} size={28} color={color} />;
        },
        tabBarLabelStyle: {
          marginTop: 4,
          fontSize: 12,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "gray",
        tabBarButton: (props) => <TouchableOpacity {...props} activeOpacity={1} />,
      })}
    >
      <Tab.Screen name="Home" component={Home} />
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
      <Stack.Screen 
        name="SearchAdv" 
        component={SearchScreenAdv}
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
      setTimeout(() => setIsCheckingConnection(false), 1000);
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
          <MusicPlayerAdv />
        </View>
      </NavigationContainer>
    </MusicPlayerProvider>
  );
}