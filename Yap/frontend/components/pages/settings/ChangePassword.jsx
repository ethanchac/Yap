import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Lock, Check, AlertCircle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { API_BASE_URL } from '../../../services/config';

function ChangePassword({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { isDarkMode } = useTheme();

    // Password validation
    const passwordValidation = {
        minLength: formData.newPassword.length >= 6,
        match: formData.newPassword === formData.confirmPassword && formData.confirmPassword !== '',
        different: formData.currentPassword !== formData.newPassword && formData.newPassword !== ''
    };

    const isFormValid = passwordValidation.minLength && passwordValidation.match && passwordValidation.different && formData.currentPassword;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Please log in again');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    current_password: formData.currentPassword,
                    new_password: formData.newPassword,
                    confirm_password: formData.confirmPassword,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                
                // Auto close after 2 seconds
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                }, 2000);
            } else {
                setError(data.error || 'Password change failed');
            }
        } catch (err) {
            console.error('Change password error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setError('');
            setSuccess(false);
            onClose();
        }
    };

    if (!isOpen) return null;

    if (success) {
        return createPortal(
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
            >
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
            </div>,
            document.body
        );
    }

    return createPortal(
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
            onClick={handleClose}
        >
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
                            onClick={handleClose}
                            disabled={loading}
                            className={`p-2 rounded-full transition-colors ${
                                isDarkMode 
                                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                            isDarkMode 
                                ? 'bg-red-900/50 border border-red-700 text-red-300' 
                                : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
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
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
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
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
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
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
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
                        {formData.newPassword && (
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
                                    {formData.confirmPassword && (
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
                            onClick={handleClose}
                            disabled={loading}
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                                isDarkMode
                                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid || loading}
                            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                                isFormValid && !loading
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            }`}
                        >
                            {loading ? 'Changing...' : 'Change Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

export default ChangePassword;