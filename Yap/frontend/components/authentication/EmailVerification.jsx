import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../services/config';

function EmailVerification({ username, onVerificationSuccess, onBackToRegister }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [canResend, setCanResend] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const { isDarkMode } = useTheme();

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [countdown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
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

    const handleCodeChange = (e) => {
        const value = e.target.value.replace(/\D/g, ''); // Only allow digits
        if (value.length <= 6) {
            setCode(value);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ 
            backgroundColor: isDarkMode ? '#121212' : '#ffffff',
            fontFamily: 'Albert Sans' 
        }}>
            {/* Animated Background Blobs */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse z-0"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse z-0"></div>
            
            <div className={`w-full max-w-md rounded-2xl shadow-xl p-8 flex flex-col items-center relative z-10 ${
                isDarkMode ? 'bg-[#181818]' : 'bg-white border border-gray-200'
            }`}>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Verify Your Email
                    </h2>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        We sent a 6-digit verification code to your TMU email address
                    </p>
                    <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                        Username: {username}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                    <div className="text-center">
                        <label className={`text-sm font-semibold block mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Enter Verification Code
                        </label>
                        <input
                            type="text"
                            className={`w-full px-4 py-3 rounded-lg border focus:border-orange-500 focus:outline-none transition-colors text-center text-2xl font-mono tracking-widest ${
                                isDarkMode 
                                    ? 'bg-[#232323] text-white border-gray-700' 
                                    : 'bg-white text-gray-900 border-gray-300'
                            }`}
                            placeholder="000000"
                            value={code}
                            onChange={handleCodeChange}
                            maxLength={6}
                            required
                        />
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Code expires in 10 minutes
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold text-lg shadow-md hover:from-orange-600 hover:to-orange-500 transition-colors disabled:opacity-60"
                        disabled={loading || code.length !== 6}
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                {message && (
                    <div className="mt-4 text-green-400 text-center text-sm">
                        {message}
                    </div>
                )}
                
                {error && (
                    <div className="mt-4 text-red-400 text-center text-sm">
                        {error}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Didn't receive the code?
                    </p>
                    {canResend ? (
                        <button
                            onClick={handleResendCode}
                            disabled={resendLoading}
                            className="text-orange-400 hover:underline font-semibold text-sm mt-1"
                        >
                            {resendLoading ? 'Sending...' : 'Resend Code'}
                        </button>
                    ) : (
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Resend available in {countdown}s
                        </p>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <button
                        onClick={onBackToRegister}
                        className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'} hover:underline`}
                    >
                        ← Back to Registration
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EmailVerification;