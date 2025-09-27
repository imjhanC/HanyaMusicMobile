import React, { useState } from "react";
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function SearchScreenAdv() {
  const [query, setQuery] = useState("");
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Search Bar */}
      <View style={styles.searchBar}>
        {/* Back Button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Search Input */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#aaa" // lighter gray for placeholder
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      {/* Example results section */}
      <View style={styles.results}>
        <Text style={{ color: "#fff" }}>Recent Search</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b1b1bff", // same as screen background
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#fff", // white text
    fontSize: 16,
  },
  results: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
});
