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
      <div>
        <h2>Verify Your Email</h2>
        <p>We sent a verification code to {formData.email}</p>
        <p>Username: {formData.username}</p>
        <form onSubmit={handleVerification}>
          <input
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
            maxLength="6"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>
        <button type="button" onClick={resendVerification} disabled={loading}>
          Resend Code
        </button>
        <button type="button" onClick={() => setStep(1)}>
          Back to Registration
        </button>
        {msg && <p>{msg}</p>}
      </div>
    );
  }

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleInputChange}
          required
          minLength="3"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleInputChange}
          required
          minLength="6"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
        {msg && <p>{msg}</p>}
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
}