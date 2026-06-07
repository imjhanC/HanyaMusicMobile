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
    Image,
    Animated,
    Dimensions,
    Easing,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import DocumentPicker from "react-native-document-picker";
import AuthApi from "../../services/Auth/AuthApi";
import { useAuth } from "../../services/Auth/AuthProvider";

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
    "options",
    "play-circle",
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

export default function RegAccScreen() {
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [errors, setErrors] = useState<any>({});
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigation = useNavigation<any>();
    const { login } = useAuth();

    const validateEmail = (email: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const getPasswordValidation = (password: string) => ({
        length: password.length >= 8,
        capital: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    });

    const passwordChecks = getPasswordValidation(password);

    const pickImage = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.images],
            });
            setProfileImage(res.uri);
        } catch (err: any) {
            if (DocumentPicker.isCancel(err)) {
                console.log("User canceled image selection");
            } else {
                console.error(err);
            }
        }
    };

    const handleRegister = async () => {
        let newErrors: any = {};

        if (!username) newErrors.username = "Username required";
        if (!displayName) newErrors.displayName = "Display name required";
        if (!email) newErrors.email = "Email required";
        else if (!validateEmail(email)) newErrors.email = "Invalid email format";
        if (!password) newErrors.password = "Password required";
        else if (!Object.values(getPasswordValidation(password)).every(Boolean))
            newErrors.password = "Password does not meet requirements";
        if (!confirmPassword) newErrors.confirmPassword = "Confirm your password";
        else if (password !== confirmPassword)
            newErrors.confirmPassword = "Passwords do not match";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("username", username);
            formData.append("email", email);
            formData.append("password", password);
            formData.append("display_name", displayName);

            if (profileImage) {
                const fileType = profileImage.toLowerCase().endsWith("png")
                    ? "image/png"
                    : profileImage.toLowerCase().endsWith("gif")
                        ? "image/gif"
                        : "image/jpeg";

                formData.append("avatar", {
                    uri: profileImage,
                    name: `avatar_${Date.now()}.${fileType.split("/")[1]}`,
                    type: fileType,
                } as any);
            }

            const response = await AuthApi.post("/auth/register", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const { access_token, refresh_token } = response.data;
            await login(access_token, refresh_token);
            navigation.navigate("HomeDrawer");
        } catch (error: any) {
            const detail = error.response?.data?.detail;
            if (typeof detail === "string") {
                setErrors({ email: detail });
            } else {
                setErrors({ email: "Registration failed. Please try again." });
            }
        } finally {
            setLoading(false);
        }
    };

    const Rule = ({ text, valid }: any) => (
        <View style={styles.ruleItem}>
            <Ionicons
                name={valid ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={valid ? "#1DB954" : "#444"}
            />
            <Text style={[styles.ruleText, valid && styles.ruleValid]}>{text}</Text>
        </View>
    );

    const renderInput = ({
        label,
        icon,
        value,
        onChangeText,
        placeholder,
        secureTextEntry = false,
        name,
        error,
        toggleSecure = false,
        isVisible = false,
        setIsVisible,
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
                        secureTextEntry={secureTextEntry && !isVisible}
                        onFocus={() => setFocusedInput(name)}
                        onBlur={() => setFocusedInput(null)}
                        onChangeText={(text) => {
                            onChangeText(text);
                            setErrors((prev: any) => ({ ...prev, [name]: null }));
                        }}
                    />
                    {toggleSecure && (
                        <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
                            <Ionicons
                                name={isVisible ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color="#666"
                            />
                        </TouchableOpacity>
                    )}
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

            {/* Subtle green glow */}
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
                    {/* LOGO */}
                    <View style={styles.header}>
                        <View style={{ flexDirection: "row" }}>
                            <Text style={styles.hanya}>Hanya</Text>
                            <Text style={styles.music}>Music</Text>
                        </View>
                        <Text style={styles.subtitle}>Your music, your way</Text>
                    </View>

                    {/* AVATAR PICKER */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} style={styles.avatarTouchable}>
                            {profileImage ? (
                                <View style={styles.avatarWrapper}>
                                    <Image
                                        source={{ uri: profileImage }}
                                        style={styles.avatarImage}
                                        resizeMode="cover"
                                    />
                                    {/* Overlay edit icon */}
                                    <View style={styles.avatarEditOverlay}>
                                        <Ionicons name="camera" size={18} color="#fff" />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="camera-outline" size={32} color="#1DB954" />
                                    <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.uploadHint}>PNG, JPG or GIF</Text>
                    </View>

                    {/* FORM CARD — semi-transparent */}
                    <View style={styles.card}>
                        <Text style={styles.title}>Create Account</Text>

                        {renderInput({
                            label: "Username",
                            icon: "person-outline",
                            value: username,
                            onChangeText: setUsername,
                            placeholder: "Enter username",
                            name: "username",
                            error: errors.username,
                        })}

                        {renderInput({
                            label: "Display Name",
                            icon: "person-circle-outline",
                            value: displayName,
                            onChangeText: setDisplayName,
                            placeholder: "Your name",
                            name: "displayName",
                            error: errors.displayName,
                        })}

                        {renderInput({
                            label: "Email",
                            icon: "mail-outline",
                            value: email,
                            onChangeText: setEmail,
                            placeholder: "example@email.com",
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
                            toggleSecure: true,
                            isVisible: showPassword,
                            setIsVisible: setShowPassword,
                        })}

                        {/* PASSWORD RULES */}
                        <View style={styles.passwordRules}>
                            <Rule text="At least 8 characters" valid={passwordChecks.length} />
                            <Rule text="One capital letter" valid={passwordChecks.capital} />
                            <Rule text="One number" valid={passwordChecks.number} />
                            <Rule text="One special character" valid={passwordChecks.special} />
                        </View>

                        {renderInput({
                            label: "Confirm Password",
                            icon: "shield-checkmark-outline",
                            value: confirmPassword,
                            onChangeText: setConfirmPassword,
                            placeholder: "Confirm password",
                            secureTextEntry: true,
                            name: "confirmPassword",
                            error: errors.confirmPassword,
                            toggleSecure: true,
                            isVisible: showConfirmPassword,
                            setIsVisible: setShowConfirmPassword,
                        })}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footerContainer}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate("Login")}
                            >
                                <Text style={styles.loginText}>Login</Text>
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
        top: SCREEN_HEIGHT * 0.3,
        left: SCREEN_WIDTH / 2 - 180,
        width: 360,
        height: 360,
        borderRadius: 180,
        backgroundColor: "#1DB954",
        opacity: 0.04,
    },
    floatingIcon: {
        position: "absolute",
    },
    container: {
        padding: 24,
        paddingBottom: 40,
    },
    absoluteCloseContainer: {
        position: "absolute",
        top: Platform.OS === "ios" ? 80 : 40,
        left: 18,
        zIndex: 10,
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
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

    // Avatar
    avatarSection: {
        alignItems: "center",
        marginBottom: 24,
    },
    avatarTouchable: {
        marginBottom: 8,
    },
    avatarWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#1DB954",
    },
    avatarImage: {
        width: 100,
        height: 100,
    },
    avatarEditOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        backgroundColor: "rgba(0,0,0,0.55)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(29,185,84,0.08)",
        borderWidth: 2,
        borderColor: "rgba(29,185,84,0.3)",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarPlaceholderText: {
        color: "#1DB954",
        fontSize: 11,
        marginTop: 4,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    uploadHint: {
        color: "#555",
        fontSize: 12,
        letterSpacing: 0.5,
    },

    // Card
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

    // Form
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

    // Password rules
    passwordRules: {
        marginTop: -8,
        marginBottom: 14,
        paddingLeft: 4,
    },
    ruleItem: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    ruleText: {
        marginLeft: 8,
        fontSize: 12,
        color: "#555",
    },
    ruleValid: {
        color: "#1DB954",
    },

    // Button
    button: {
        backgroundColor: "#1DB954",
        padding: 16,
        borderRadius: 14,
        marginTop: 10,
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

    // Footer
    footerContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 22,
    },
    footerText: {
        color: "#666",
        fontSize: 14,
    },
    loginText: {
        color: "#1DB954",
        fontSize: 14,
        fontWeight: "700",
    },
});