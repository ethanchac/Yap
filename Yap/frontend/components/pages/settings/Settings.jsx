import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../sidebar/Sidebar';
import Header from '../../header/Header';
import { LogOut, Settings as SettingsIcon, Shield, Bell, Palette, HelpCircle, Eye, EyeOff, Lock, Check, AlertCircle, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { API_BASE_URL } from '../../../services/config';

function Settings() {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const mainContentRef = useRef(null);
    const { isDarkMode, toggleTheme } = useTheme();

    const handleLogout = async () => {
    try {
        setIsLoggingOut(true);
        
        // Disconnect messageService before clearing token
        try {
          const { messageService } = await import('../../../services/messageService');
          messageService.disconnect();
        } catch (error) {
          console.warn('Could not disconnect messageService:', error);
        }
        
        // Only need to clear the main token now
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // Also clear any stale user data
        
        navigate('/');
        
    } catch (error) {
        console.error('Error during logout:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    } finally {
        setIsLoggingOut(false);
    }
    };

    // Password change functions
    const passwordValidation = {
        minLength: passwordForm.newPassword.length >= 6,
        match: passwordForm.newPassword === passwordForm.confirmPassword && passwordForm.confirmPassword !== '',
        different: passwordForm.currentPassword !== passwordForm.newPassword && passwordForm.newPassword !== ''
    };

    const isPasswordFormValid = passwordValidation.minLength && passwordValidation.match && passwordValidation.different && passwordForm.currentPassword;

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({
            ...prev,
            [name]: value
        }));
        setPasswordError('');
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordFormValid) return;

        setPasswordLoading(true);
        setPasswordError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setPasswordError('Please log in again');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: passwordForm.currentPassword,
                    new_password: passwordForm.newPassword,
                    confirm_password: passwordForm.confirmPassword,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setPasswordSuccess(true);
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                
                // Auto close after 2 seconds
                setTimeout(() => {
                    setPasswordSuccess(false);
                    setIsChangePasswordOpen(false);
                }, 2000);
            } else {
                setPasswordError(data.error || 'Password change failed');
            }
        } catch (err) {
            console.error('Change password error:', err);
            setPasswordError('Network error. Please try again.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleClosePasswordModal = () => {
        if (!passwordLoading) {
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setPasswordError('');
            setPasswordSuccess(false);
            setIsChangePasswordOpen(false);
        }
    };

    return (
        <div className="h-screen overflow-hidden font-bold" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            <Header />
            <Sidebar />
            <div 
                ref={mainContentRef}
                className="ml-64 h-full overflow-y-auto p-6"
            >
                <div className="max-w-6xl mx-auto">
                    {/* Settings Header */}
                    <div className="rounded-lg p-6 mb-6" style={{
                        backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                        border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                    }}>
                        <div className="flex items-center space-x-3 mb-6">
                            <SettingsIcon className={`w-8 h-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`} />
                            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
                        </div>
                        
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Manage your account preferences and settings
                        </p>
                    </div>

                    {/* Settings Sections */}
                    <div className="space-y-6">
                        {/* Account Section */}
                        <div className="rounded-lg p-6" style={{
                            backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                            border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                        }}>
                            <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <Shield className="w-5 h-5" />
                                <span>Account</span>
                            </h2>
                            
                            <div className="space-y-4">
                                <div 
                                    className={`flex items-center justify-between p-4 rounded-lg hover:transition-colors cursor-pointer ${
                                        isDarkMode ? '' : 'bg-white hover:bg-gray-50 border border-gray-200'
                                    }`} 
                                    style={{
                                        backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                    }} 
                                    onMouseEnter={(e) => {
                                        if (isDarkMode) e.target.style.backgroundColor = '#1f1f1f';
                                    }} 
                                    onMouseLeave={(e) => {
                                        if (isDarkMode) e.target.style.backgroundColor = '#1c1c1c';
                                    }}
                                    onClick={() => setIsChangePasswordOpen(true)}
                                >
                                    <div>
                                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</p>
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Update your account password</p>
                                    </div>
                                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>›</div>
                                </div>
                                
                            </div>
                        </div>

                        

                        {/* Appearance Section */}
                        <div className="rounded-lg p-6" style={{
                            backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                            border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                        }}>
                            <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <Palette className="w-5 h-5" />
                                <span>Appearance</span>
                            </h2>
                            
                            <div className="space-y-4">
                                <div className={`flex items-center justify-between p-4 rounded-lg ${
                                    isDarkMode ? '' : 'bg-white border border-gray-200'
                                }`} style={{
                                    backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                }} onMouseEnter={(e) => {
                                    if (isDarkMode) e.target.style.backgroundColor = '#1f1f1f';
                                }} onMouseLeave={(e) => {
                                    if (isDarkMode) e.target.style.backgroundColor = '#1c1c1c';
                                }}>
                                    <div>
                                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Dark Mode</p>
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {isDarkMode ? 'Currently using dark theme' : 'Currently using light theme'}
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isDarkMode}
                                            onChange={toggleTheme}
                                            className="sr-only peer" 
                                        />
                                        <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
                                            isDarkMode ? 'bg-[#1c1c1c]' : 'bg-gray-300'
                                        }`}></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                       
                        {/* Logout Section */}
                        <div className="rounded-lg p-6" style={{
                            backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                            border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                        }}>
                            <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Account Actions</h2>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                                </button>
                                
                                <p className={`text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    You'll be redirected to the login page
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Modal */}
            {isChangePasswordOpen && (
                <div 
                    className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
                    style={{ 
                        backgroundColor: 'rgba(18, 18, 18, 0.85)', 
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={handleClosePasswordModal}
                >
                    {passwordSuccess ? (
                        <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${
                            isDarkMode ? 'bg-[#1c1c1c]' : 'bg-white'
                        }`}>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-white" />
                                </div>
                                <h2 className={`text-xl font-bold mb-2 ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                    Password Changed Successfully!
                                </h2>
                                <p className={`text-sm ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    Your password has been updated securely.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div 
                            className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
                                isDarkMode ? 'bg-[#1c1c1c]' : 'bg-white'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className={`p-6 border-b ${
                                isDarkMode ? 'border-gray-700 bg-[#171717]' : 'border-gray-200 bg-gray-50'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Lock className={`w-6 h-6 ${
                                            isDarkMode ? 'text-orange-400' : 'text-orange-500'
                                        }`} />
                                        <h2 className={`text-xl font-bold ${
                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            Change Password
                                        </h2>
                                    </div>
                                    <button
                                        onClick={handleClosePasswordModal}
                                        disabled={passwordLoading}
                                        className={`p-2 rounded-full transition-colors ${
                                            isDarkMode 
                                                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                                        } ${passwordLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handlePasswordSubmit} className="p-6">
                                {passwordError && (
                                    <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                                        isDarkMode 
                                            ? 'bg-red-900/50 border border-red-700 text-red-300' 
                                            : 'bg-red-50 border border-red-200 text-red-700'
                                    }`}>
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">{passwordError}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {/* Current Password */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.current ? 'text' : 'password'}
                                                name="currentPassword"
                                                value={passwordForm.currentPassword}
                                                onChange={handlePasswordInputChange}
                                                required
                                                className={`w-full px-4 py-3 pr-12 rounded-lg border transition-colors ${
                                                    isDarkMode 
                                                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                                                } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                                                placeholder="Enter your current password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('current')}
                                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                                                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* New Password */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.new ? 'text' : 'password'}
                                                name="newPassword"
                                                value={passwordForm.newPassword}
                                                onChange={handlePasswordInputChange}
                                                required
                                                className={`w-full px-4 py-3 pr-12 rounded-lg border transition-colors ${
                                                    isDarkMode 
                                                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                                                } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                                                placeholder="Enter your new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('new')}
                                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                                                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords.confirm ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={passwordForm.confirmPassword}
                                                onChange={handlePasswordInputChange}
                                                required
                                                className={`w-full px-4 py-3 pr-12 rounded-lg border transition-colors ${
                                                    isDarkMode 
                                                        ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                                                } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                                                placeholder="Confirm your new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                                                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                            >
                                                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password Requirements */}
                                    {passwordForm.newPassword && (
                                        <div className={`p-3 rounded-lg ${
                                            isDarkMode ? 'bg-[#2a2a2a]' : 'bg-gray-50'
                                        }`}>
                                            <p className={`text-sm font-medium mb-2 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                                Password Requirements:
                                            </p>
                                            <div className="space-y-1">
                                                <div className={`flex items-center space-x-2 text-sm ${
                                                    passwordValidation.minLength 
                                                        ? 'text-green-500' 
                                                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                }`}>
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        passwordValidation.minLength ? 'bg-green-500' : 'bg-gray-400'
                                                    }`} />
                                                    <span>At least 6 characters</span>
                                                </div>
                                                <div className={`flex items-center space-x-2 text-sm ${
                                                    passwordValidation.different 
                                                        ? 'text-green-500' 
                                                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                }`}>
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        passwordValidation.different ? 'bg-green-500' : 'bg-gray-400'
                                                    }`} />
                                                    <span>Different from current password</span>
                                                </div>
                                                {passwordForm.confirmPassword && (
                                                    <div className={`flex items-center space-x-2 text-sm ${
                                                        passwordValidation.match 
                                                            ? 'text-green-500' 
                                                            : 'text-red-500'
                                                    }`}>
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            passwordValidation.match ? 'bg-green-500' : 'bg-red-500'
                                                        }`} />
                                                        <span>Passwords match</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={handleClosePasswordModal}
                                        disabled={passwordLoading}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                                            isDarkMode
                                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                        } ${passwordLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!isPasswordFormValid || passwordLoading}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                                            isPasswordFormValid && !passwordLoading
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                        }`}
                                    >
                                        {passwordLoading ? 'Changing...' : 'Change Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Settings;