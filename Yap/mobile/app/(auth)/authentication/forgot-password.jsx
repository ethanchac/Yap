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
import { API_BASE_URL } from '../../../src/config/api';

function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setMessage('');
        setError('');
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/password-reset/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage('Reset code sent! Redirecting...');
                setTimeout(() => {
                    router.push({
                        pathname: '/(auth)/authentication/reset-password',
                        params: { email }
                    });
                }, 1500);
            } else {
                setError(data.error || 'Failed to send reset code.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Reset Your Password</Text>
                <Text style={styles.subtitle}>Enter your TMU email to receive a reset code</Text>
                
                <View style={styles.form}>
                    <Text style={styles.label}>TMU Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="your.name@torontomu.ca"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    
                    <TouchableOpacity 
                        style={[styles.button, loading && styles.buttonDisabled]} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Send Reset Code</Text>
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
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>
                        Remember your password? Back to Login
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
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 24,
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
        marginBottom: 16,
    },
    button: {
        width: '100%',
        backgroundColor: '#F97316',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
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
    backButton: {
        marginTop: 24,
        paddingVertical: 8,
    },
    backButtonText: {
        fontSize: 14,
        color: '#FB923C',
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default ForgotPassword;