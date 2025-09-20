import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Dimensions } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Ionicons from "react-native-vector-icons/Ionicons";
import NetInfo from "@react-native-community/netinfo";

// Import screens
import Home from "./screens/Home";
import Playlist from "./screens/Playlist";
import SearchScreen from "./screens/SearchScreen";
import NoInternetScreen from "./screens/NoInternetScreen";

// Import music player components
import { GlobalMusicPlayer, MusicPlayerProvider } from "./services/MusicPlayer";

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const { width } = Dimensions.get("window");

// ✅ Create a custom header with the user icon
function CustomHeader({ navigation }: any) {
  return (
    <TouchableOpacity
      style={{ marginLeft: 16 }}
      onPress={() => navigation.openDrawer()} // 👈 open the sidebar
    >
      <Ionicons name="person-circle-outline" size={40} color="#fff" />
    </TouchableOpacity>
  );
}

// ✅ Bottom Tab Navigator
function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: "#292929ff" },
        headerTintColor: "#fff",
        headerTitleAlign: "center",
        headerLeft: () => <CustomHeader navigation={navigation} />, // 👈 Add user icon
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

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Playlist") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Search") {
            iconName = focused ? "search" : "search-outline";
          }

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

// Drawer Navigator (sidebar)
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "#1e1e1e", width: width * 0.9 },
        drawerLabelStyle: { color: "#fff" },
      }}
    >
      <Drawer.Screen name="Main" component={BottomTabs} />
      {/* Add more sidebar items here */}
    </Drawer.Navigator>
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
      setTimeout(() => {
        setIsCheckingConnection(false);
      }, 1000);
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
          <DrawerNavigator />
          <GlobalMusicPlayer />
        </View>
      </NavigationContainer>
    </MusicPlayerProvider>
  );
}
