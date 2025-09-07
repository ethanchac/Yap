import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from "../../services/config";
import EmailVerification from './EmailVerification'; 

export default function LoginForm() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [animationClass, setAnimationClass] = useState("translate-y-4 opacity-0");
  const [showVerification, setShowVerification] = useState(false);
  const [unverifiedUsername, setUnverifiedUsername] = useState('');
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    // Entrance animation
    setTimeout(() => {
      setAnimationClass("translate-y-0 opacity-100");
    }, 100);
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        // store the token in localStorage
        localStorage.setItem("token", data.token);
        
        // Force messageService to reconnect with new token to prevent sender ID issues
        try {
          const { messageService } = await import('../../services/messageService');
          messageService.forceReconnect();
        } catch (error) {
          console.warn('Could not force messageService reconnect:', error);
        }
        
        setMsg("Login success");
        // navigate to homepage
        navigate('/home');
      } else if (res.status === 403 && data.requires_verification) {
        // User exists but email is not verified
        setUnverifiedUsername(data.username || formData.username);
        setShowVerification(true);
        setMsg(""); // Clear any previous messages
      } else {
        setMsg(data.error || "Login failed");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    // After successful verification, redirect to login or auto-login
    setShowVerification(false);
    setMsg("Email verified successfully! Please log in.");
    
    // Clearing form cus why not
    setFormData({
      username: "",
      password: ""
    });
  };

  const handleBackToLogin = () => {
    setShowVerification(false);
    setUnverifiedUsername('');
    setMsg("");
  };

  // Show verification component if user needs to verify email
  if (showVerification) {
    return (
      <EmailVerification
        username={unverifiedUsername}
        onVerificationSuccess={handleVerificationSuccess}
        onBackToRegister={handleBackToLogin}
      />
    );
  }

  // Show the regular login form
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" style={{
      backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
      fontFamily: 'Albert Sans'
    }}>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className={`w-full max-w-md relative z-10 transform transition-all duration-700 ease-out ${animationClass}`}>
        
        {/* Header with Animation */}
        <div className="text-center mb-10">
          <h1 className={`text-4xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome Back!
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Sign in to continue to your account
          </p>
        </div>

        {/* Form Container with Glass Effect */}
        <div className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300 ${isFormFocused ? 'scale-105 shadow-orange-500/25' : ''}`}>
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-white text-sm font-semibold mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-orange-400" />
                Username/Email
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  name="username"
                  placeholder="Enter your username or email" 
                  value={formData.username} 
                  onChange={handleInputChange}
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
                  required
                  className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300 group-hover:border-gray-500"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-white text-sm font-semibold mb-2 flex items-center">
                <Lock className="w-4 h-4 mr-2 text-orange-400" />
                Password
              </label>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password} 
                  onChange={handleInputChange}
                  onFocus={() => setIsFormFocused(true)}
                  onBlur={() => setIsFormFocused(false)}
                  required
                  className="w-full px-4 py-4 pr-12 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300 group-hover:border-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors duration-200 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Login Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 disabled:scale-100 disabled:shadow-none flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Logging you in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Success/Error Messages */}
            {msg && (
              <div className={`text-center text-sm mt-4 p-3 rounded-lg transition-all duration-300 ${
                msg.includes('success') 
                  ? 'text-green-400 bg-green-500/20 border border-green-500/30' 
                  : 'text-red-400 bg-red-500/20 border border-red-500/30'
              }`}>
                {msg}
              </div>
            )}
          </form>
        </div>
        
        {/* Sign Up Link */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-lg">
            New to Yapp? 
            <Link 
              to="/signup" 
              className="text-orange-400 hover:text-orange-300 font-bold ml-2 transition-colors duration-200 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}