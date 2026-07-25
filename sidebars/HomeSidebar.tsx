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
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { BottomTabs } from "../App";
import { GlobalMusicPlayer } from "../services/MusicPlayer";
import { useAuth } from "../services/Auth/AuthProvider";
import MainSettingScreen from "../screens/SettingScreen/MainSettingScreen";

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get("window");

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
  const { isAuthenticated, user, logout } = useAuth();

  const handleAuthAction = async () => {
    props.navigation.closeDrawer();
    if (isAuthenticated) {
      await logout();
    } else {
      props.navigation.navigate("Login");
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.profileSection}>
        <View style={styles.avatarFrame}>
          {isAuthenticated && user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={50} color="#777" />
            </View>
          )}
        </View>
        <Text style={styles.username}>
          {isAuthenticated && user ? (user.display_name || user.username) : "Guest"}
        </Text>
        <Text style={styles.email}>
          {isAuthenticated && user ? user.email : "Not logged in"}
        </Text>
      </View>

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
        <TouchableOpacity style={styles.logoutButton} onPress={handleAuthAction}>
          <Ionicons
            name={isAuthenticated ? "log-out-outline" : "log-in-outline"}
            size={22}
            color={isAuthenticated ? "#FF4D4D" : "#fff"}
          />
          <Text style={[styles.logoutText, isAuthenticated && { color: "#FF4D4D" }]}>
            {isAuthenticated ? "Logout" : "Login"}
          </Text>
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
      <Drawer.Screen name="Settings" component={MainSettingScreen} />
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
  avatarFrame: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    // Outer glow
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    // Gold border
    borderWidth: 2.5,
    borderColor: "#FFD700",
    backgroundColor: "#333",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  username: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
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