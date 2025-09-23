import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";

// Screens
import Home from "./screens/Home";
import Playlist from "./screens/Playlist";
import SearchScreen from "./screens/SearchScreen";
import NoInternetScreen from "./screens/NoInternetScreen";

// Music Player
import { GlobalMusicPlayer, MusicPlayerProvider } from "./services/MusicPlayer";

// Sidebar
import HomeSidebar from "./sidebars/HomeSidebar";

const Tab = createBottomTabNavigator();

// ✅ Custom header with user icon
function CustomHeader({ navigation }: any) {
  return (
    <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => navigation.openDrawer()}>
      <Ionicons name="person-circle-outline" size={40} color="#fff" />
    </TouchableOpacity>
  );
}

// ✅ Bottom Tabs (stay here)
export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: "#292929ff" },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
        headerLeft: () => <CustomHeader navigation={navigation} />,
        tabBarStyle: {
          position: "absolute",
          height: 70,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 10,
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

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

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
          <HomeSidebar />
          <GlobalMusicPlayer />
        </View>
      </NavigationContainer>
    </MusicPlayerProvider>
  );
}
