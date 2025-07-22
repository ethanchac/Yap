import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from "../sidebar/Sidebar";
import Header from "../header/Header";
import { LogOut, Settings as SettingsIcon, Shield, Bell, Palette, HelpCircle } from 'lucide-react';

function Settings() {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const mainContentRef = useRef(null);

    const handleLogout = async () => {
    try {
        setIsLoggingOut(true);
        
        // Only need to clear the main token now
        localStorage.removeItem('token');
        
        navigate('/login');
        
    } catch (error) {
        console.error('Error during logout:', error);
        localStorage.removeItem('token');
        navigate('/login');
    } finally {
        setIsLoggingOut(false);
    }
    };

    return (
        <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <Sidebar />
            <div 
                ref={mainContentRef}
                className="ml-64 h-full overflow-y-auto p-6"
            >
                <div className="max-w-6xl mx-auto">
                    {/* Settings Header */}
                    <div className="rounded-lg p-6 mb-6" style={{backgroundColor: '#171717'}}>
                        <div className="flex items-center space-x-3 mb-6">
                            <SettingsIcon className="w-8 h-8 text-white" />
                            <h1 className="text-white text-3xl font-bold">Settings</h1>
                        </div>
                        
                        <p className="text-gray-400 text-lg">
                            Manage your account preferences and settings
                        </p>
                    </div>

                    {/* Settings Sections */}
                    <div className="space-y-6">
                        {/* Account Section */}
                        <div className="rounded-lg p-6" style={{backgroundColor: '#171717'}}>
                            <h2 className="text-white text-xl font-bold mb-4 flex items-center space-x-2">
                                <Shield className="w-5 h-5" />
                                <span>Account (not implemented)</span>
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                                    <div>
                                        <p className="text-white font-medium">Change Password</p>
                                        <p className="text-gray-400 text-sm">Update your account password</p>
                                    </div>
                                    <div className="text-gray-400">›</div>
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                                    <div>
                                        <p className="text-white font-medium">Email Settings</p>
                                        <p className="text-gray-400 text-sm">Manage your TMU email preferences</p>
                                    </div>
                                    <div className="text-gray-400">›</div>
                                </div>
                            </div>
                        </div>

                        

                        {/* Appearance Section */}
                        <div className="rounded-lg p-6" style={{backgroundColor: '#171717'}}>
                            <h2 className="text-white text-xl font-bold mb-4 flex items-center space-x-2">
                                <Palette className="w-5 h-5" />
                                <span>Appearance (not implemented)</span>
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">Dark Mode</p>
                                        <p className="text-gray-400 text-sm">Currently using dark theme</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" defaultChecked className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                       
                        {/* Logout Section */}
                        <div className="rounded-lg p-6" style={{backgroundColor: '#171717'}}>
                            <h2 className="text-white text-xl font-bold mb-4">Account Actions</h2>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="w-full flex items-center justify-center space-x-3 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
                                </button>
                                
                                <p className="text-gray-400 text-sm text-center">
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