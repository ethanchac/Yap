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
        // store the token in localStorage
        localStorage.setItem("token", data.token);
        
        setMsg("Login success");
        // navigate to homepage
        navigate('/Home');
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
    <div className="min-h-screen flex items-center justify-center px-6" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans', fontWeight: 'bold', fontSize: '20px'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-medium mb-2">
            Welcome back to Yapp.
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left">
            <label className="block text-white text-sm mb-2">
              Username/Email
            </label>
            <input 
              type="text"
              name="username"
              placeholder="Username or Email" 
              value={formData.username} 
              onChange={handleInputChange}
              required
              className="w-full px-3 py-3 bg-transparent border-2 border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
            />
          </div>

          <div className="text-left">
            <label className="block text-white text-sm mb-2">
              Password
            </label>
            <input 
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password} 
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
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          {msg && <p className={`text-center text-sm mt-4 ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        </form>
        
        <p className="text-center text-white text-sm mt-8">
          Don't have an account? <Link to="/signup" className="text-white hover:underline">Sign up here</Link>
        </p>
      </div>
    </div>
  );
}