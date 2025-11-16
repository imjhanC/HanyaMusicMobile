import React from "react";
import { View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

const SearchScreen = () => {
  const navigation = useNavigation();

  const handleSearchPress = () => {
    // Navigate directly to SearchAdv
    navigation.navigate("SearchAdv");
  };

  return (
    <View style={styles.container}>
        <TouchableOpacity 
          style={styles.searchBarContainer}
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search.."
            placeholderTextColor="#888"
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#282828",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
});

export default SearchScreen;