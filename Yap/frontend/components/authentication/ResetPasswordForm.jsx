import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../services/config';

function ResetPasswordForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromState = location.state?.email || '';
    
    const [step, setStep] = useState(1); // 1: verify code, 2: reset password
    const [email, setEmail] = useState(emailFromState);
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerifyCode = async (e) => {
        e.preventDefault();
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

    const handleResetPassword = async (e) => {
        e.preventDefault();
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
                    navigate('/login');
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
        <div className="min-h-screen flex items-center justify-center bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Albert Sans' }}>
            {/* Animated Background Blobs */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse z-0"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse z-0"></div>
            
            <div className="w-full max-w-md bg-[#181818] rounded-2xl shadow-xl p-8 flex flex-col items-center relative z-10">
                {step === 1 ? (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-2 text-center">Verify Reset Code</h2>
                        <p className="text-gray-400 text-center mb-6 text-sm">Enter the 6-digit code sent to your email</p>
                        
                        <form onSubmit={handleVerifyCode} className="w-full flex flex-col gap-4">
                            <label className="text-gray-300 text-sm font-semibold">Email</label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                                placeholder="your.name@torontomu.ca"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            
                            <label className="text-gray-300 text-sm font-semibold">Verification Code</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors text-center text-xl tracking-widest"
                                placeholder="123456"
                                value={code}
                                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                required
                            />
                            
                            <button
                                type="submit"
                                className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold text-lg shadow-md hover:from-orange-600 hover:to-orange-500 transition-colors disabled:opacity-60"
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                        </form>
                        
                        <button
                            onClick={handleResendCode}
                            className="mt-4 text-orange-400 hover:underline text-sm"
                            disabled={loading}
                        >
                            Didn't receive the code? Resend
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-2 text-center">Set New Password</h2>
                        <p className="text-gray-400 text-center mb-6 text-sm">Enter your new password</p>
                        
                        <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-4">
                            <label className="text-gray-300 text-sm font-semibold">New Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            
                            <label className="text-gray-300 text-sm font-semibold">Confirm Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            
                            <button
                                type="submit"
                                className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold text-lg shadow-md hover:from-orange-600 hover:to-orange-500 transition-colors disabled:opacity-60"
                                disabled={loading}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}
                
                {message && <div className="mt-4 text-green-400 text-center">{message}</div>}
                {error && <div className="mt-4 text-red-400 text-center">{error}</div>}
                
                <div className="mt-6 text-gray-400 text-sm text-center">
                    Remember your password?{' '}
                    <a href="/login" className="text-orange-400 hover:underline font-semibold">Back to Login</a>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordForm;