import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../services/Auth/AuthProvider";
import AuthApi from "../../services/Auth/AuthApi";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [errors, setErrors] = useState<any>({});
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation<any>();

  const { login } = useAuth();

  const handleLogin = async () => {
    let newErrors: any = {};

    if (!email) newErrors.email = "Email/Username required";
    if (!password) newErrors.password = "Password required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      // Create x-www-form-urlencoded data since FastAPI OAuth2PasswordRequestForm expects it by default
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await AuthApi.post('/auth/token', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token, refresh_token } = response.data;
      
      await login(access_token, refresh_token);
      
      console.log("LOGIN SUCCESS");
      navigation.navigate("HomeDrawer");
    } catch (error: any) {
      console.log("LOGIN FAILED", error);
      // We can inspect error.response.data.detail for FastAPI's default error messages
      setErrors({ email: "Invalid credentials" });
    } finally {
      setLoading(false);
    }
  };

  const renderInput = ({
    label,
    icon,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    name,
    error
  }: any) => {
    const isFocused = focusedInput === name;

    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={styles.label}>{label}</Text>

        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputFocused,
            error && styles.inputError
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={error ? "#FF4D4D" : isFocused ? "#1DB954" : "#777"}
          />

          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#666"
            value={value}
            secureTextEntry={secureTextEntry}
            onFocus={() => setFocusedInput(name)}
            onBlur={() => setFocusedInput(null)}
            onChangeText={(text) => {
              onChangeText(text);
              setErrors((prev: any) => ({ ...prev, [name]: null }));
            }}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container}>

          {/* CLOSE BUTTON */}
          <View style={styles.closeContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* LOGO */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.hanya}>Hanya</Text>
              <Text style={styles.music}>Music</Text>
            </View>
            <Text style={styles.subtitle}>Your music, your way</Text>
          </View>

          {/* FORM */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>

            {renderInput({
              label: "Email or Username",
              icon: "person-outline",
              value: email,
              onChangeText: setEmail,
              placeholder: "Enter email or username",
              name: "email",
              error: errors.email
            })}

            {renderInput({
              label: "Password",
              icon: "lock-closed-outline",
              value: password,
              onChangeText: setPassword,
              placeholder: "Enter password",
              secureTextEntry: true,
              name: "password",
              error: errors.password
            })}

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* CREATE ACCOUNT LINK */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("RegAccScreen")}>
                <Text style={styles.createAccountText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0A0A"
  },
  container: {
    padding: 24,
    justifyContent: "center",
  },
  closeContainer: {
    alignItems: "flex-end",
    marginBottom: 20
  },
  header: {
    alignItems: "center",
    marginBottom: 40
  },
  hanya: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "300"
  },
  music: {
    fontSize: 40,
    color: "#1DB954",
    fontWeight: "800",
    marginLeft: 6
  },
  subtitle: {
    color: "#777",
    marginTop: 6
  },
  card: {
    backgroundColor: "#121212",
    borderRadius: 20,
    padding: 24
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20
  },
  label: {
    color: "#aaa",
    marginBottom: 6
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#222"
  },
  inputFocused: {
    borderColor: "#1DB954"
  },
  inputError: {
    borderColor: "#FF4D4D"
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingVertical: 14,
    marginLeft: 10
  },
  error: {
    color: "#FF4D4D",
    fontSize: 12,
    marginTop: 4
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 20
  },
  forgotPasswordText: {
    color: "#1DB954",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#1DB954",
    padding: 16,
    borderRadius: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20
  },
  footerText: {
    color: "#888",
    fontSize: 14
  },
  createAccountText: {
    color: "#1DB954",
    fontSize: 14,
    fontWeight: "700"
  }
});