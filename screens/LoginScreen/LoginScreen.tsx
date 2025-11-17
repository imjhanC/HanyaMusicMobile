import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleLogin = () => {
    console.log("Login pressed", email, password);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleForgotPassword = () => {
    console.log("Forgot password pressed");
  };

  const handleCreateAccount = () => {
    console.log("Create account pressed");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      {/* HanyaMusic Text */}
      <View style={styles.textContainer}>
        <View style={styles.textWrapper}>
          <Text style={styles.hanyaText}>Hanya</Text>
          <Text style={styles.kipasText}>Music</Text>
        </View>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Your music, your way
        </Text>
      </View>

      <Text style={styles.title}>Welcome Back !</Text>
 
      {/* Email Input */}
      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your email / username ..."
            placeholderTextColor="#555"
            style={[styles.input, { fontSize: 16 }]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
      </View>

      {/* Password Input */}
      <View style={styles.inputWrapper}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Enter your password ..."
            placeholderTextColor="#555"
            style={[styles.input, { fontSize: 16 }]}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={togglePasswordVisibility}
          >
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={20} 
              color="#888" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* Forgot Password Link */}
      <TouchableOpacity onPress={handleForgotPassword} style={styles.linkContainer}>
        <Text style={styles.linkText}>Forgot password?</Text>
      </TouchableOpacity>

      {/* Create Account Link */}
      <View style={styles.createAccountContainer}>
        <Text style={styles.normalText}>Don't have an account? </Text>
        <TouchableOpacity onPress={handleCreateAccount}>
          <Text style={styles.createAccountText}>Create an Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 24,
    paddingTop: 16,
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  textWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  hanyaText: {
    fontSize: 48,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
  },
  kipasText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1DB954',
    letterSpacing: 2,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
    flex: 1,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: "center",
    width: "100%",
  },
  loginText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  linkContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  linkText: {
    color: "#1DB954",
    fontSize: 14,
    fontWeight: "600",
  },
  createAccountContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  normalText: {
    color: "#888",
    fontSize: 14,
  },
  createAccountText: {
    color: "#1DB954",
    fontSize: 14,
    fontWeight: "700",
  },
});