import { useState } from "react";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [token, setToken] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Login success");
        setToken(data.token);
        // Optionally store token:
        // localStorage.setItem("token", data.token);
      } else {
        setMsg(data.error || "Login failed");
      }
    } catch (err) {
      setMsg("Server error");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Login</button>
      <p>{msg}</p>
    </form>
  );
}
