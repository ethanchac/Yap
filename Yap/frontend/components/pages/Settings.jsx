import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../sidebar/Sidebar";
import Header from "../header/Header";
import { LogOut, Settings as SettingsIcon, Shield, Bell, Palette, HelpCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

function Settings() {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const mainContentRef = useRef(null);
    const { isDarkMode, toggleTheme } = useTheme();

    const handleLogout = async () => {
    try {
        setIsLoggingOut(true);
        
        // Only need to clear the main token now
        localStorage.removeItem('token');
        
        navigate('/');
        
    } catch (error) {
        console.error('Error during logout:', error);
        localStorage.removeItem('token');
        navigate('/');
    } finally {
        setIsLoggingOut(false);
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
                                <span>Account (not implemented)</span>
                            </h2>
                            
                            <div className="space-y-4">
                                <div className={`flex items-center justify-between p-4 rounded-lg hover:transition-colors cursor-pointer ${
                                    isDarkMode ? '' : 'bg-white hover:bg-gray-50 border border-gray-200'
                                }`} style={{
                                    backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                }} onMouseEnter={(e) => {
                                    if (isDarkMode) e.target.style.backgroundColor = '#1f1f1f';
                                }} onMouseLeave={(e) => {
                                    if (isDarkMode) e.target.style.backgroundColor = '#1c1c1c';
                                }}>
                                    <div>
                                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</p>
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Update your account password</p>
                                    </div>
                                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>›</div>
                                </div>
                                
                                <div className={`flex items-center justify-between p-4 rounded-lg hover:transition-colors cursor-pointer ${
                                    isDarkMode ? '' : 'bg-white hover:bg-gray-50 border border-gray-200'
                                }`} style={{
                                    backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                }} onMouseEnter={(e) => {
                                    if (isDarkMode) e.target.style.backgroundColor = '#1f1f1f';
                                }} onMouseLeave={(e) => {
                                    if (isDarkMode) e.target.style.backgroundColor = '#1c1c1c';
                                }}>
                                    <div>
                                        <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>Email Settings</p>
                                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage your TMU email preferences</p>
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
                                            isDarkMode ? 'bg-gray-800' : 'bg-gray-300'
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
        </div>
    );
}

export default Settings;