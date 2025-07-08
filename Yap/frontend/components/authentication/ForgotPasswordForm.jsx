import { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Shield, Key } from 'lucide-react';

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
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

  const startCountdown = () => {
    setCanResend(false);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/password-reset/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Reset code sent to your email!");
        setStep(2);
        startCountdown();
      } else {
        setMsg(data.error || "Failed to send reset code");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/password-reset/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Code verified! Enter your new password.");
        setStep(3);
      } else {
        setMsg(data.error || "Invalid code");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMsg("");

    if (formData.newPassword !== formData.confirmPassword) {
      setMsg("Passwords don't match");
      return;
    }

    if (formData.newPassword.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/password-reset/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
          new_password: formData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setMsg(data.error || "Failed to reset password");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/password-reset/resend-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("New reset code sent!");
        startCountdown();
      } else {
        setMsg(data.error || "Failed to resend code");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans', fontWeight: 'bold', fontSize: '20px'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-medium mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-400 text-sm">
            {step === 1 && "Enter your TMU email to receive a reset code"}
            {step === 2 && "Enter the 6-digit code sent to your email"}
            {step === 3 && "Create your new password"}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="text-left">
              <label className="block text-white text-sm mb-2">
                TMU Email
              </label>
              <input 
                type="email"
                name="email"
                placeholder="your.name@torontomu.ca"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="pt-4 text-center">
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded font-medium"
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Code Verification */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="text-left">
              <label className="block text-white text-sm mb-2">
                6-Digit Code
              </label>
              <input 
                type="text"
                name="code"
                placeholder="Enter 6-digit code"
                value={formData.code}
                onChange={handleInputChange}
                maxLength="6"
                required
                className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 text-center text-2xl tracking-widest"
              />
            </div>

            <div className="pt-4 text-center space-y-3">
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded font-medium"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>

              <div>
                <button 
                  type="button"
                  onClick={handleResendCode}
                  disabled={!canResend || loading}
                  className="text-gray-400 hover:text-white text-sm disabled:text-gray-600"
                >
                  {canResend ? "Resend Code" : `Resend in ${countdown}s`}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-left">
              <label className="block text-white text-sm mb-2">
                New Password
              </label>
              <input 
                type="password"
                name="newPassword"
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="text-left">
              <label className="block text-white text-sm mb-2">
                Confirm Password
              </label>
              <input 
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="pt-4 text-center">
              <button 
                type="submit" 
                disabled={loading}
                className="px-8 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded font-medium"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}

        {msg && (
          <p className={`text-center text-sm mt-4 ${
            msg.includes('success') || msg.includes('sent') || msg.includes('verified') 
              ? 'text-green-400' 
              : 'text-red-400'
          }`}>
            {msg}
          </p>
        )}
        
        <p className="text-center text-white text-sm mt-8">
          Remember your password? <Link to="/login" className="text-white hover:underline">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}