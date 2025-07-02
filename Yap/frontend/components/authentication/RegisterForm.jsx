import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
      <div className="min-h-screen flex items-center justify-center px-6 font-bold text-xl" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-bold mb-4">Verify Your Email</h2>
            <p className="text-white text-sm font-bold mb-2">We sent a verification code to {formData.email}</p>
            <p className="text-white text-sm font-bold">Username: {formData.username}</p>
          </div>

          <form onSubmit={handleVerification} className="space-y-4">
            <div className="text-left">
              <label className="block text-white text-sm mb-2 font-bold">
                Verification Code
              </label>
              <input
                type="text"
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength="6"
                className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-bold"
              />
            </div>

            <div className="pt-4 text-center space-y-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full px-8 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded font-bold"
              >
                {loading ? "Verifying..." : "Verify Email"}
              </button>

              <button 
                type="button" 
                onClick={resendVerification} 
                disabled={loading}
                className="w-full px-8 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded font-bold"
              >
                Resend Code
              </button>

              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="w-full px-8 py-2 bg-transparent border-2 border-gray-600 hover:border-gray-400 text-white rounded font-bold"
              >
                Back to Registration
              </button>
            </div>

            {msg && <p className={`text-center text-sm mt-4 font-bold ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
          </form>
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