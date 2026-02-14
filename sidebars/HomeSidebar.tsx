import React from "react";
import {
  Dimensions,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  useDrawerProgress,
} from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native"; // Import useNavigation
import Ionicons from "react-native-vector-icons/Ionicons";
import { BottomTabs } from "../App";
import { GlobalMusicPlayer } from "../services/MusicPlayer";

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get("window");

// Wrapper for BottomTabs that includes the MusicPlayer
function BottomTabsWithPlayer() {
  const drawerProgress = useDrawerProgress();
  return (
    <>
      <BottomTabs />
      <GlobalMusicPlayer drawerProgress={drawerProgress} />
    </>
  );
}

function CustomDrawerContent(props: any) {
  const navigation = useNavigation(); // Move useNavigation inside the component

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <Image
          source={{ uri: "https://i.pinimg.com/736x/4b/f3/b8/4bf3b84b3662652a68d7c9d47ad2ab4c.jpg" }}
          style={styles.avatar}
        />
        <Text style={styles.username}>Karina</Text>
        <Text style={styles.email}>karina@sm.com</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <DrawerItem
          label="Menu"
          labelStyle={styles.drawerLabel}
          icon={() => <Ionicons name="grid-outline" size={22} color="#fff" />}
          onPress={() => props.navigation.navigate("Main")}
        />
        <DrawerItem
          label="Account"
          labelStyle={styles.drawerLabel}
          icon={() => <Ionicons name="person-outline" size={22} color="#fff" />}
          onPress={() => props.navigation.navigate("Account")}
        />
        <DrawerItem
          label="Settings"
          labelStyle={styles.drawerLabel}
          icon={() => <Ionicons name="settings-outline" size={22} color="#fff" />}
          onPress={() => props.navigation.navigate("Settings")}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate("Login");
            }}
          >
          <Ionicons name="log-in-outline" size={22} color="#fff" />
          <Text style={styles.logoutText}>Login</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function HomeSidebar() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: "#1e1e1e", width: width * 0.82 },
      }}
    >
      <Drawer.Screen name="Main" component={BottomTabsWithPlayer} />
      <Drawer.Screen name="Account" component={BottomTabsWithPlayer} />
      <Drawer.Screen name="Settings" component={BottomTabsWithPlayer} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 30,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  username: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  email: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 2,
  },
  menuSection: {
    flex: 1,
    paddingTop: 10,
  },
  drawerLabel: {
    fontSize: 16,
    marginLeft: -10,
    color: "#fff",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 10,
  },
});