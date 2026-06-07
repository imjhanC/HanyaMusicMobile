import React, { useState, useEffect, useRef } from "react";
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
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../services/Auth/AuthProvider";
import AuthApi from "../../services/Auth/AuthApi";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MUSIC_ICONS = [
  "musical-notes",
  "musical-note",
  "headset",
  "disc",
  "radio",
  "mic",
  "volume-high",
  "heart",
  "star",
  "pulse",
];

const RAINBOW_COLORS = [
  '#FF4D4D', '#FFA64D', '#FFFF4D', '#4DFF4D', '#4D4DFF', '#A64DFF', '#FF4DFF'
];

interface FloatingIconProps {
  icon: string;
  initialX: number;
  initialY: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

const FloatingIcon: React.FC<FloatingIconProps> = ({
  icon,
  initialX,
  initialY,
  size,
  duration,
  delay,
  opacity,
  color,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  // Capture random values once so they're stable across loop iterations
  const driftX = useRef((Math.random() - 0.5) * 120).current;
  const rotateDir = useRef(Math.random() > 0.5 ? 1 : -1).current;

  useEffect(() => {
    // Reset to initial state before looping
    translateY.setValue(0);
    translateX.setValue(0);
    fadeAnim.setValue(0);
    rotateAnim.setValue(0);
    scaleAnim.setValue(0.5);

    const singleCycle = Animated.sequence([
      Animated.delay(delay),
      // Fade + scale in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: opacity,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      // Float up, drift, fade out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -(SCREEN_HEIGHT * 1.6), // travel just past the top edge
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: driftX,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: rotateDir,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: duration * 0.4,
          delay: duration * 0.6,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Use Animated.loop — avoids recursive .start() calls that blow up Hermes
    const loop = Animated.loop(singleCycle);
    loop.start();

    return () => loop.stop();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-45deg", "45deg"],
  });

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          left: initialX,
          top: initialY,
          opacity: fadeAnim,
          transform: [
            { translateY },
            { translateX },
            { rotate },
            { scale: scaleAnim },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={icon} size={size} color={color} />
    </Animated.View>
  );
};

const generateIcons = () => {
  const density = 35;
  return Array.from({ length: density }, (_, i) => {
    const colorIndex = i % RAINBOW_COLORS.length;
    const waveDelay = colorIndex * 1500;
    return {
      id: i,
      icon: MUSIC_ICONS[Math.floor(Math.random() * MUSIC_ICONS.length)],
      initialX: Math.random() * SCREEN_WIDTH,
      // Spawn strictly below the screen's bottom border
      initialY: SCREEN_HEIGHT + Math.random() * SCREEN_HEIGHT * 0.3,
      size: 80,
      duration: 7000 + Math.random() * 2000,
      delay: waveDelay + Math.random() * 1000,
      opacity: 0.15 + Math.random() * 0.15,
      color: RAINBOW_COLORS[colorIndex],
    };
  });
};

const ICONS_DATA = generateIcons();

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
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await AuthApi.post("/auth/token", formData.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { access_token, refresh_token } = response.data;
      await login(access_token, refresh_token);
      navigation.navigate("HomeDrawer");
    } catch (error: any) {
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
    error,
  }: any) => {
    const isFocused = focusedInput === name;
    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={styles.label}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputFocused,
            error && styles.inputError,
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={error ? "#FF4D4D" : isFocused ? "#1DB954" : "#888"}
          />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#555"
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
      {/* Animated background */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {ICONS_DATA.map((item) => (
          <FloatingIcon key={item.id} {...item} />
        ))}
      </View>

      {/* Subtle radial glow at bottom center */}
      <View style={styles.glowCircle} pointerEvents="none" />

      {/* ABSOLUTE CLOSE BUTTON - top left */}
      <View style={styles.absoluteCloseContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* LOGO - centered */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row" }}>
              <Text style={styles.hanya}>Hanya</Text>
              <Text style={styles.music}>Music</Text>
            </View>
            <Text style={styles.subtitle}>Your music, your way</Text>
          </View>

          {/* FORM CARD - centered */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>

            {renderInput({
              label: "Email or Username",
              icon: "person-outline",
              value: email,
              onChangeText: setEmail,
              placeholder: "Enter email or username",
              name: "email",
              error: errors.email,
            })}

            {renderInput({
              label: "Password",
              icon: "lock-closed-outline",
              value: password,
              onChangeText: setPassword,
              placeholder: "Enter password",
              secureTextEntry: true,
              name: "password",
              error: errors.password,
            })}

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

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

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("RegAccScreen")}
              >
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
    backgroundColor: "#050505",
  },
  glowCircle: {
    position: "absolute",
    bottom: -100,
    left: SCREEN_WIDTH / 2 - 200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "#1DB954",
    opacity: 0.04,
  },
  floatingIcon: {
    position: "absolute",
  },
  container: {
    padding: 24,
    justifyContent: "center",
    minHeight: SCREEN_HEIGHT - 40,
  },
  absoluteCloseContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 80 : 40,
    left: 18,
    zIndex: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  hanya: {
    fontSize: 42,
    color: "#fff",
    fontWeight: "300",
    letterSpacing: 1,
  },
  music: {
    fontSize: 42,
    color: "#1DB954",
    fontWeight: "800",
    marginLeft: 6,
    letterSpacing: 1,
  },
  subtitle: {
    color: "#666",
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "rgba(18, 18, 18, 0.82)",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  label: {
    color: "#888",
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputFocused: {
    borderColor: "#1DB954",
    backgroundColor: "rgba(29,185,84,0.05)",
  },
  inputError: {
    borderColor: "#FF4D4D",
  },
  input: {
    flex: 1,
    color: "#fff",
    paddingVertical: 14,
    marginLeft: 10,
    fontSize: 15,
  },
  error: {
    color: "#FF4D4D",
    fontSize: 12,
    marginTop: 4,
  },
  forgotPassword: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#1DB954",
    fontSize: 13,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#1DB954",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#1DB954",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  createAccountText: {
    color: "#1DB954",
    fontSize: 14,
    fontWeight: "700",
  },
});