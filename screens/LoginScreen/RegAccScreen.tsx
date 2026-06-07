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
    ActivityIndicator,
    Image
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import DocumentPicker from "react-native-document-picker";
import AuthApi from "../../services/Auth/AuthApi";
import { useAuth } from "../../services/Auth/AuthProvider";

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
        special: /[^A-Za-z0-9]/.test(password)
    });

    const passwordChecks = getPasswordValidation(password);

    const pickImage = async () => {
        try {
            const res = await DocumentPicker.pickSingle({
                type: [DocumentPicker.types.images] // JPG, PNG, GIF
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
            formData.append('username', username);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('display_name', displayName);

            if (profileImage) {
                // Determine the type from the extension, or default to image/jpeg
                const fileType = profileImage.toLowerCase().endsWith('png') ? 'image/png' 
                             : profileImage.toLowerCase().endsWith('gif') ? 'image/gif' 
                             : 'image/jpeg';
                             
                formData.append('avatar', {
                    uri: profileImage,
                    name: `avatar_${Date.now()}.${fileType.split('/')[1]}`,
                    type: fileType,
                } as any);
            }

            const response = await AuthApi.post('/auth/register', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { access_token, refresh_token } = response.data;
            
            // Log the user in automatically after successful registration
            await login(access_token, refresh_token);
            
            console.log("REGISTER SUCCESS");
            navigation.navigate("HomeDrawer");
        } catch (error: any) {
            console.log("REGISTER FAILED", error);
            // Fast API typically returns details in error.response.data.detail
            const detail = error.response?.data?.detail;
            if (typeof detail === 'string') {
                setErrors({ email: detail }); // Show generic error under email
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
                name={valid ? "checkmark-circle" : "close-circle"}
                size={16}
                color={valid ? "#1DB954" : "#555"}
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
        setIsVisible
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
                                color="#777"
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

                    {/* IMAGE PICKER */}
                    <View style={{ alignItems: "center", marginBottom: 20 }}>
                        {profileImage ? (
                            // ✅ Fix: wrap in View with overflow hidden so GIFs are clipped correctly
                            <View style={styles.avatarWrapper}>
                                <Image
                                    source={{ uri: profileImage }}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                    accessible={true}
                                />
                            </View>
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="image-outline" size={40} color="#777" />
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.uploadButton}
                            onPress={pickImage}
                        >
                            <Text style={styles.uploadButtonText}>
                                Upload Image
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.uploadHint}>
                            Supports PNG, JPG, GIF
                        </Text>
                    </View>

                    {/* FORM */}
                    <View style={styles.card}>
                        <Text style={styles.title}>Create Account</Text>

                        {renderInput({
                            label: "Username",
                            icon: "person-outline",
                            value: username,
                            onChangeText: setUsername,
                            placeholder: "Enter username",
                            name: "username",
                            error: errors.username
                        })}

                        {renderInput({
                            label: "Display Name",
                            icon: "person-circle-outline",
                            value: displayName,
                            onChangeText: setDisplayName,
                            placeholder: "Your name",
                            name: "displayName",
                            error: errors.displayName
                        })}

                        {renderInput({
                            label: "Email",
                            icon: "mail-outline",
                            value: email,
                            onChangeText: setEmail,
                            placeholder: "example@email.com",
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
                            error: errors.password,
                            toggleSecure: true,
                            isVisible: showPassword,
                            setIsVisible: setShowPassword
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
                            setIsVisible: setShowConfirmPassword
                        })}

                        {/* BUTTON */}
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Layout & Container
    safeArea: {
        flex: 1,
        backgroundColor: "#0A0A0A"
    },
    container: {
        padding: 24
    },
    closeContainer: {
        alignItems: "flex-end",
        marginBottom: 10
    },

    // Header
    header: {
        alignItems: "center",
        marginBottom: 30
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

    // Avatar
    avatarWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: "hidden", // ✅ Key fix for GIF clipping
    },
    avatarImage: {
        width: 100,
        height: 100,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#333",
        justifyContent: "center",
        alignItems: "center",
    },
    uploadButton: {
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: "#1DB954",
        borderRadius: 8
    },
    uploadButtonText: {
        color: "#000",
        fontWeight: "700"
    },
    uploadHint: {
        color: "#777",
        marginTop: 4
    },

    // Card
    card: {
        backgroundColor: "#121212",
        borderRadius: 20,
        padding: 20
    },
    title: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 20
    },

    // Form Elements
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

    // Password Rules
    passwordRules: {
        marginTop: -10,
        marginBottom: 10
    },
    ruleItem: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4
    },
    ruleText: {
        marginLeft: 8,
        fontSize: 12,
        color: "#777"
    },
    ruleValid: {
        color: "#1DB954"
    },

    // Button
    button: {
        backgroundColor: "#1DB954",
        padding: 16,
        borderRadius: 12,
        marginTop: 10,
        alignItems: "center"
    },
    buttonText: {
        color: "#000",
        fontWeight: "700"
    }
});