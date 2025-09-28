import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import Home from "./screens/Home";
import Playlist from "./screens/Playlist";
import SearchScreen from "./screens/SearchScreen/SearchScreen";
import NoInternetScreen from "./screens/NoInternetScreen";
import SearchScreenAdv from "./screens/SearchScreen/SearchScreenAdv";

// Music Player
import { GlobalMusicPlayer, MusicPlayerProvider } from "./services/MusicPlayer";
import MusicPlayerAdv from "./services/MusicPlayerAdv";

// Sidebar
import HomeSidebar from "./sidebars/HomeSidebar";

const Tab = createBottomTabNavigator();
const SearchStack = createNativeStackNavigator();

// ✅ Custom header with user icon
function CustomHeader({ navigation }: any) {
  return (
    <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => navigation.openDrawer()}>
      <Ionicons name="person-circle-outline" size={40} color="#fff" />
    </TouchableOpacity>
  );
}

function SearchStackNavigator({ navigation }: any) {
  return (
    <SearchStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
      }}
    >
      <SearchStack.Screen 
        name="Search"   // ✅ keep the stack screen as "Search"
        component={SearchScreen}  
        options={{ 
          headerShown: true,
          headerLeft: () => <CustomHeader navigation={navigation} />
        }} 
      />
      <SearchStack.Screen 
        name="SearchAdv" 
        component={SearchScreenAdv}  
        options={{ 
          headerShown: false // No header at all for SearchScreenAdv
        }} 
      />
    </SearchStack.Navigator>
  );
}

// ✅ Bottom Tabs
export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: "#121212" },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
        headerShown: route.name !== "SearchTab",  // Hide tab header for Search
        headerLeft: route.name !== "SearchTab" ? () => <CustomHeader navigation={navigation} /> : undefined,
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
          else if (route.name === "SearchTab") iconName = focused ? "search" : "search-outline"; // ✅ updated
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
      <Tab.Screen 
        name="SearchTab"   // ✅ unique internal name
        children={({ navigation }) => <SearchStackNavigator navigation={navigation} />} 
        options={{ title: "Search" }} // ✅ still shows "Search" to the user
      />
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
          <MusicPlayerAdv />
          <GlobalMusicPlayer />
        </View>
      </NavigationContainer>
    </MusicPlayerProvider>
  );
}
