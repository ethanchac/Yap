import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock, UserPlus, ArrowRight, Sparkles } from 'lucide-react';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Register, 2: Verify Email
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [animationClass, setAnimationClass] = useState("translate-y-4 opacity-0");
  const navigate = useNavigate();

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    // validation
    if (formData.password !== formData.confirmPassword) {
      setMsg("Passwords don't match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMsg("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Registration successful! Please check your email for verification code.");
        setStep(2); // go to verification step
      } else {
        setMsg(data.error || "Registration failed");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    console.log('Attempting verification:', {
      username: formData.username,
      code: verificationCode
    });

    try {
      const res = await fetch("http://localhost:5000/users/confirm-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          code: verificationCode.trim() 
        })
      });

      console.log('Response status:', res.status);
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (res.ok) {
        setMsg("Email verified successfully! Redirecting to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMsg(data.error || `Verification failed (${res.status})`);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setMsg(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/users/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.username }) 
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Verification code resent! Check your email.");
      } else {
        setMsg(data.error || "Failed to resend code");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className={`w-full max-w-md relative z-10 transform transition-all duration-700 ease-out ${animationClass}`}>
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mb-6">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-white text-4xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              Verify Your Email
            </h2>
            <p className="text-gray-400 text-lg mb-2">We sent a verification code to</p>
            <p className="text-orange-400 font-semibold">{formData.email}</p>
            <p className="text-gray-500 text-sm mt-2">Username: {formData.username}</p>
          </div>

          {/* Form Container with Glass Effect */}
          <div className={`bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300`}>
            <form onSubmit={handleVerification} className="space-y-6">
              
              {/* Verification Code Field */}
              <div className="space-y-2">
                <label className="block text-white text-sm font-semibold mb-2 flex items-center">
                  <Lock className="w-4 h-4 mr-2 text-orange-400" />
                  Verification Code
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    maxLength="6"
                    className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300 group-hover:border-gray-500 text-center text-2xl tracking-widest"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 disabled:scale-100 disabled:shadow-none flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Email</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button 
                  type="button" 
                  onClick={resendVerification} 
                  disabled={loading}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white rounded-xl font-semibold transition-all duration-300 border border-gray-600 hover:border-gray-500"
                >
                  Resend Code
                </button>

                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full py-3 bg-transparent border-2 border-gray-600 hover:border-gray-400 text-white rounded-xl font-semibold transition-all duration-300"
                >
                  Back to Registration
                </button>
              </div>

              {/* Success/Error Messages */}
              {msg && (
                <div className={`text-center text-sm mt-4 p-3 rounded-lg transition-all duration-300 ${
                  msg.includes('success') || msg.includes('sent') || msg.includes('verified')
                    ? 'text-green-400 bg-green-500/20 border border-green-500/30' 
                    : 'text-red-400 bg-red-500/20 border border-red-500/30'
                }`}>
                  {msg}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 font-bold text-xl" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h2 className="text-white text-2xl font-bold mb-2">Welcome to Yapp</h2>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="text-left">
            <label className="block text-white text-sm mb-2 font-bold">
              Username
            </label>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleInputChange}
              required
              minLength="3"
              className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-bold"
            />
          </div>

          <div className="text-left">
            <label className="block text-white text-sm mb-2 font-bold">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-bold"
            />
          </div>

          <div className="text-left">
            <label className="block text-white text-sm mb-2 font-bold">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength="6"
              className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-bold"
            />
          </div>

          <div className="text-left">
            <label className="block text-white text-sm mb-2 font-bold">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-bold"
            />
          </div>

          <div className="pt-4 text-center">
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded font-bold"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          {msg && <p className={`text-center text-sm mt-4 font-bold ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        </form>
        
        <p className="text-center text-white text-sm mt-8 font-bold">
          Already have an account? <Link to="/login" className="text-white hover:underline font-bold">Login here</Link>
        </p>
      </div>
    </div>
  );
}