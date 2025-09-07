import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../../../src/config/api';

function ResetPassword() {
    const router = useRouter();
    const { email: emailFromParams } = useLocalSearchParams();
    
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState(emailFromParams || '');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerifyCode = async () => {
        setMessage('');
        setError('');
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/password-reset/verify-reset-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage('Code verified! Now set your new password.');
                setStep(2);
            } else {
                setError(data.error || 'Invalid code. Please try again.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setMessage('');
        setError('');
        
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/password-reset/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    code, 
                    new_password: newPassword 
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage('Password reset successfully! Redirecting to login...');
                setTimeout(() => {
                    router.push('/(auth)/authentication/login');
                }, 2000);
            } else {
                setError(data.error || 'Failed to reset password.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setLoading(true);
        setMessage('');
        setError('');
        
        try {
            const response = await fetch(`${API_BASE_URL}/password-reset/resend-reset-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                setMessage('New reset code sent to your email!');
            } else {
                setError(data.error || 'Failed to resend code.');
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
                {step === 1 ? (
                    <>
                        <Text style={styles.title}>Verify Reset Code</Text>
                        <Text style={styles.subtitle}>Enter the 6-digit code sent to your email</Text>
                        
                        <View style={styles.form}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="your.name@torontomu.ca"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            
                            <Text style={styles.label}>Verification Code</Text>
                            <TextInput
                                style={styles.codeInput}
                                placeholder="123456"
                                placeholderTextColor="#9CA3AF"
                                value={code}
                                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                keyboardType="numeric"
                                textAlign="center"
                            />
                            
                            <TouchableOpacity 
                                style={[styles.button, loading && styles.buttonDisabled]} 
                                onPress={handleVerifyCode}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Verify Code</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                            onPress={handleResendCode}
                            style={styles.resendButton}
                            disabled={loading}
                        >
                            <Text style={styles.resendText}>
                                Didn't receive the code? Resend
                            </Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.title}>Set New Password</Text>
                        <Text style={styles.subtitle}>Enter your new password</Text>
                        
                        <View style={styles.form}>
                            <Text style={styles.label}>New Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter new password"
                                placeholderTextColor="#9CA3AF"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                            
                            <Text style={styles.label}>Confirm Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm new password"
                                placeholderTextColor="#9CA3AF"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                            
                            <TouchableOpacity 
                                style={[styles.button, loading && styles.buttonDisabled]} 
                                onPress={handleResetPassword}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
                
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
    codeInput: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#232323',
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#4B5563',
        fontSize: 20,
        fontFamily: 'monospace',
        letterSpacing: 4,
    },
    button: {
        width: '100%',
        backgroundColor: '#F97316',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
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
    resendButton: {
        marginTop: 16,
        paddingVertical: 8,
    },
    resendText: {
        color: '#FB923C',
        fontSize: 14,
        textAlign: 'center',
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

export default ResetPassword;