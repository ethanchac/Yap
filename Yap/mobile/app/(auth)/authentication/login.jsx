import { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import EmailVerification from './EmailVerification';

const API_BASE_URL = 'http://localhost:8081';

export default function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [unverifiedUsername, setUnverifiedUsername] = useState('');
  const router = useRouter();

  const handleInputChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleLogin = async () => {
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        await SecureStore.setItemAsync("token", data.token);
        setMsg("Login success");
        router.replace('/(tabs)');
      } else if (res.status === 403 && data.requires_verification) {
        setUnverifiedUsername(data.username || formData.username);
        setShowVerification(true);
        setMsg("");
      } else {
        setMsg(data.error || "Login failed");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    setShowVerification(false);
    setMsg("Email verified successfully! Please log in.");
    setFormData({
      username: "",
      password: ""
    });
  };

  const handleBackToLogin = () => {
    setShowVerification(false);
    setUnverifiedUsername('');
    setMsg("");
  };

  if (showVerification) {
    return (
      <EmailVerification
        username={unverifiedUsername}
        onVerificationSuccess={handleVerificationSuccess}
        onBackToRegister={handleBackToLogin}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <User size={16} color="#FB923C" />
              <Text style={styles.label}>Username/Email</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your username or email"
              placeholderTextColor="#9CA3AF"
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Lock size={16} color="#FB923C" />
              <Text style={styles.label}>Password</Text>
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? 
                  <EyeOff size={20} color="#9CA3AF" /> : 
                  <Eye size={20} color="#9CA3AF" />
                }
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/(auth)/authentication/forgot-password')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingText}>Logging you in...</Text>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <Text style={styles.loginButtonText}>Sign In</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {msg ? (
            <Text style={[
              styles.message,
              msg.includes('success') ? styles.successMessage : styles.errorMessage
            ]}>
              {msg}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/authentication/signup')}
          style={styles.signupButton}
        >
          <Text style={styles.signupText}>
            New to Yapp? <Text style={styles.signupLink}>Create an account</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FB923C',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4B5563',
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4B5563',
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
  },
  forgotText: {
    color: '#FB923C',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  successMessage: {
    color: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  errorMessage: {
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signupButton: {
    paddingVertical: 8,
  },
  signupText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  signupLink: {
    color: '#FB923C',
    fontWeight: 'bold',
  },
});

