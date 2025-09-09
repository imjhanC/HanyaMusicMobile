import React from "react";
import { View, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";

// Import screens
import Home from "./screens/Home";
import Playlist from "./screens/Playlist";
import SearchScreen from "./screens/SearchScreen";

// Import music player components
import { GlobalMusicPlayer, MusicPlayerProvider } from "./services/MusicPlayer";



const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <MusicPlayerProvider>
      <NavigationContainer>
        <View style={{ flex: 1 }}>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                position: "absolute",
                height: 70,
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                borderTopWidth: 0,
                elevation: 0,
                paddingTop: 10,
              },
              tabBarIcon: ({ color, size, focused }) => {
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
          <GlobalMusicPlayer />
        </View>
      </NavigationContainer>
    </MusicPlayerProvider>
  );
}