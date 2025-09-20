import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const Home = () => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.userIcon}>
        <Ionicons name="person-circle-outline" size={50} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#292929ff", // Dark background
  },
  userIcon: {
    position: "absolute",
    top: 16,
    left: 16,
  },
});

export default Home;
