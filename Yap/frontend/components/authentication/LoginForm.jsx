import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Store the token in localStorage
        localStorage.setItem("token", data.token);
        
        setMsg("Login success");
        // Navigate to protected page
        navigate('/Home'); // Match your route exactly
      } else {
        setMsg(data.error || "Login failed");
      }
    } catch (err) {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <input 
          type="text"
          name="username"
          placeholder="Username or Email" 
          value={formData.username} 
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
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {msg && <p>{msg}</p>}
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign up here</Link>
      </p>
    </div>
  );
}