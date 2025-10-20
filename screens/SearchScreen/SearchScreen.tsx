import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function SearchScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Fake search bar */}
      <TouchableOpacity
        style={styles.searchContainer}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("SearchAdv")} 
      >
        <Ionicons
          name="search-outline"
          size={22}
          color="#000"
          style={styles.searchIcon}
        />
        <Text style={styles.placeholder}>Search</Text>
      </TouchableOpacity>

      <View style={styles.content}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  placeholder: {
    color: "#555",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});
