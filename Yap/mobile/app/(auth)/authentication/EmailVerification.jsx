import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Mail } from 'lucide-react-native';

const API_BASE_URL = 'http://localhost:5000/api';

function EmailVerification({ username, onVerificationSuccess, onBackToRegister }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [countdown, setCountdown] = useState(60);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleSubmit = async () => {
        setError('');
        setMessage('');
        
        if (!code.trim()) {
            setError('Please enter the verification code');
            return;
        }

        if (code.trim().length !== 6) {
            setError('Verification code must be 6 digits');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/users/confirm-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    code: code.trim()
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage('Email verified successfully! Redirecting to login...');
                setTimeout(() => {
                    onVerificationSuccess();
                }, 2000);
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setResendLoading(true);
        setError('');
        setMessage('');
        
        try {
            const response = await fetch(`${API_BASE_URL}/users/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage('New verification code sent to your email');
                setCanResend(false);
                setCountdown(60);
            } else {
                setError(data.error || 'Failed to resend code');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleCodeChange = (value) => {
        const numericValue = value.replace(/\D/g, '');
        if (numericValue.length <= 6) {
            setCode(numericValue);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Mail size={32} color="#FFFFFF" />
                    </View>
                    <Text style={styles.title}>Verify Your Email</Text>
                    <Text style={styles.subtitle}>
                        We sent a 6-digit verification code to your TMU email address
                    </Text>
                    <Text style={styles.username}>Username: {username}</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Enter Verification Code</Text>
                    <TextInput
                        style={styles.codeInput}
                        placeholder="000000"
                        placeholderTextColor="#9CA3AF"
                        value={code}
                        onChangeText={handleCodeChange}
                        maxLength={6}
                        keyboardType="numeric"
                        textAlign="center"
                    />
                    <Text style={styles.expireText}>Code expires in 10 minutes</Text>

                    <TouchableOpacity 
                        style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]} 
                        onPress={handleSubmit}
                        disabled={loading || code.length !== 6}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Verify Email</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {message ? (
                    <Text style={styles.successMessage}>{message}</Text>
                ) : null}
                
                {error ? (
                    <Text style={styles.errorMessage}>{error}</Text>
                ) : null}

                <View style={styles.resendSection}>
                    <Text style={styles.resendText}>Didn't receive the code?</Text>
                    {canResend ? (
                        <TouchableOpacity
                            onPress={handleResendCode}
                            disabled={resendLoading}
                            style={styles.resendButton}
                        >
                            <Text style={styles.resendButtonText}>
                                {resendLoading ? 'Sending...' : 'Resend Code'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.countdownText}>
                            Resend available in {countdown}s
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    onPress={onBackToRegister}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>← Back to Registration</Text>
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
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        backgroundColor: '#F97316',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
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
        color: '#D1D5DB',
        textAlign: 'center',
        marginBottom: 4,
    },
    username: {
        fontSize: 12,
        color: '#FB923C',
        fontWeight: '600',
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
        textAlign: 'center',
    },
    codeInput: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#232323',
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#4B5563',
        fontSize: 24,
        fontFamily: 'monospace',
        letterSpacing: 4,
        marginBottom: 4,
    },
    expireText: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
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
    resendSection: {
        alignItems: 'center',
        marginTop: 24,
    },
    resendText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    resendButton: {
        paddingVertical: 4,
    },
    resendButtonText: {
        color: '#FB923C',
        fontSize: 14,
        fontWeight: '600',
    },
    countdownText: {
        fontSize: 14,
        color: '#6B7280',
    },
    backButton: {
        marginTop: 16,
        paddingVertical: 8,
    },
    backButtonText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});

export default EmailVerification;