import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../services/config';
import EmailVerification from './EmailVerification'; // Import the verification component

function RegisterForm() {
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
    const { isDarkMode } = useTheme();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
                // Success - show verification page
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
        // Redirect to login page or show success message
        window.location.href = '/login'; 
    };

    const handleBackToRegister = async () => {
        // Cancel the pending registration on the backend
        try {
            await fetch(`${API_BASE_URL}/users/cancel-registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: registeredUsername })
            });
        } catch (err) {
            // Ignore errors - cleanup will happen automatically via expiration
            console.log('Failed to cancel registration:', err);
        }
        
        setShowVerification(false);
        setRegisteredUsername('');
        // Clear the form
        setForm({
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
        setError('');
        setMessage('');
    };

    // Show verification component if registration was successful
    if (showVerification) {
        return (
            <EmailVerification
                username={registeredUsername}
                onVerificationSuccess={handleVerificationSuccess}
                onBackToRegister={handleBackToRegister}
            />
        );
    }

    // Show registration form
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
                <h2 className={`text-2xl font-bold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Welcome to Yapp</h2>
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 mt-4">
                    <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Username</label>
                    <input
                        type="text"
                        name="username"
                        className={`w-full px-4 py-3 rounded-lg border focus:border-orange-500 focus:outline-none transition-colors ${
                            isDarkMode 
                                ? 'bg-[#232323] text-white border-gray-700' 
                                : 'bg-white text-gray-900 border-gray-300'
                        }`}
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        required
                    />
                    <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                    <input
                        type="email"
                        name="email"
                        className={`w-full px-4 py-3 rounded-lg border focus:border-orange-500 focus:outline-none transition-colors ${
                            isDarkMode 
                                ? 'bg-[#232323] text-white border-gray-700' 
                                : 'bg-white text-gray-900 border-gray-300'
                        }`}
                        placeholder="xxx@torontomu.ca"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                    <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                    <input
                        type="password"
                        name="password"
                        className={`w-full px-4 py-3 rounded-lg border focus:border-orange-500 focus:outline-none transition-colors ${
                            isDarkMode 
                                ? 'bg-[#232323] text-white border-gray-700' 
                                : 'bg-white text-gray-900 border-gray-300'
                        }`}
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                    <label className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        className={`w-full px-4 py-3 rounded-lg border focus:border-orange-500 focus:outline-none transition-colors ${
                            isDarkMode 
                                ? 'bg-[#232323] text-white border-gray-700' 
                                : 'bg-white text-gray-900 border-gray-300'
                        }`}
                        placeholder="Confirm Password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    <button
                        type="submit"
                        className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold text-lg shadow-md hover:from-orange-600 hover:to-orange-500 transition-colors disabled:opacity-60"
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                {message && <div className="mt-4 text-green-400 text-center">{message}</div>}
                {error && <div className="mt-4 text-red-400 text-center">{error}</div>}
                <div className="mt-6 text-gray-400 text-sm text-center">
                    Already have an account?{' '}
                    <a href="/login" className="text-orange-400 hover:underline font-semibold">Login here</a>
                </div>
            </div>
        </div>
    );
}

export default RegisterForm;