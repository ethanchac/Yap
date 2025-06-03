import { useState } from "react";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await fetch("http://localhost:5000/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        setMsg("Registered successfully");
      } else {
        setMsg(data.error || "Registration failed");
      }
    } catch (err) {
      setMsg("Server error");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button type="submit">Register</button>
      <p>{msg}</p>
    </form>
  );
}
