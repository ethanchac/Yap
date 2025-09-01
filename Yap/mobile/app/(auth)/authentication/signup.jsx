import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import EmailVerification from './EmailVerification';

const API_BASE_URL = 'http://localhost:5000/api';

function RegisterForm() {
    const router = useRouter();
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showVerification, setShowVerification] = useState(false);
    const [registeredUsername, setRegisteredUsername] = useState('');

    const handleChange = (name, value) => {
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async () => {
        setError('');
        setMessage('');
        
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    password: form.password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setRegisteredUsername(data.username || form.username);
                setShowVerification(true);
            } else {
                setError(data.error || 'Registration failed.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationSuccess = () => {
        router.push('/(auth)/authentication/login');
    };

    const handleBackToRegister = async () => {
        try {
            await fetch(`${API_BASE_URL}/users/cancel-registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: registeredUsername })
            });
        } catch (err) {
            console.log('Failed to cancel registration:', err);
        }
        
        setShowVerification(false);
        setRegisteredUsername('');
        setForm({
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
        setError('');
        setMessage('');
    };

    if (showVerification) {
        return (
            <EmailVerification
                username={registeredUsername}
                onVerificationSuccess={handleVerificationSuccess}
                onBackToRegister={handleBackToRegister}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Welcome to Yapp</Text>
                
                <View style={styles.form}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Username"
                        placeholderTextColor="#9CA3AF"
                        value={form.username}
                        onChangeText={(value) => handleChange('username', value)}
                        autoCapitalize="none"
                    />
                    
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="xxx@torontomu.ca"
                        placeholderTextColor="#9CA3AF"
                        value={form.email}
                        onChangeText={(value) => handleChange('email', value)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        value={form.password}
                        onChangeText={(value) => handleChange('password', value)}
                        secureTextEntry
                    />
                    
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor="#9CA3AF"
                        value={form.confirmPassword}
                        onChangeText={(value) => handleChange('confirmPassword', value)}
                        secureTextEntry
                    />
                    
                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Register</Text>
                        )}
                    </TouchableOpacity>
                </View>
                
                {message ? (
                    <Text style={styles.successMessage}>{message}</Text>
                ) : null}
                
                {error ? (
                    <Text style={styles.errorMessage}>{error}</Text>
                ) : null}
                
                <TouchableOpacity
                    onPress={() => router.push('/(auth)/authentication/login')}
                    style={styles.loginLink}
                >
                    <Text style={styles.loginLinkText}>
                        Already have an account? <Text style={styles.loginLinkBold}>Login here</Text>
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
        backgroundColor: '#181818',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 32,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D1D5DB',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#232323',
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#4B5563',
        fontSize: 16,
    },
    button: {
        width: '100%',
        backgroundColor: '#F97316',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    successMessage: {
        color: '#10B981',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
    },
    errorMessage: {
        color: '#EF4444',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
    },
    loginLink: {
        marginTop: 24,
        paddingVertical: 8,
    },
    loginLinkText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    loginLinkBold: {
        color: '#FB923C',
        fontWeight: '600',
    },
});

export default RegisterForm;