import React, { useState } from 'react';

function RegisterForm() {
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    password: form.password
                })
            });
            const data = await response.json();
            if (response.ok) {
                setMessage('Registration successful! Please check your email to verify your account.');
            } else {
                setError(data.error || 'Registration failed.');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] relative overflow-hidden" style={{ fontFamily: 'Albert Sans' }}>
            {/* Animated Background Blobs */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse z-0"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse z-0"></div>
            <div className="w-full max-w-md bg-[#181818] rounded-2xl shadow-xl p-8 flex flex-col items-center relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome to Yapp</h2>
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 mt-4">
                    <label className="text-gray-300 text-sm font-semibold">Username</label>
                    <input
                        type="text"
                        name="username"
                        className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                        placeholder="Username"
                        value={form.username}
                        onChange={handleChange}
                        required
                    />
                    <label className="text-gray-300 text-sm font-semibold">Email</label>
                    <input
                        type="email"
                        name="email"
                        className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                        placeholder="Email"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />
                    <label className="text-gray-300 text-sm font-semibold">Password</label>
                    <input
                        type="password"
                        name="password"
                        className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                    <label className="text-gray-300 text-sm font-semibold">Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        className="w-full px-4 py-3 rounded-lg bg-[#232323] text-white border border-gray-700 focus:border-orange-500 focus:outline-none transition-colors"
                        placeholder="Confirm Password"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                    />
                    <button
                        type="submit"
                        className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 text-white font-bold text-lg shadow-md hover:from-orange-600 hover:to-orange-500 transition-colors disabled:opacity-60"
                        disabled={loading}
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                {message && <div className="mt-4 text-green-400 text-center">{message}</div>}
                {error && <div className="mt-4 text-red-400 text-center">{error}</div>}
                <div className="mt-6 text-gray-400 text-sm text-center">
                    Already have an account?{' '}
                    <a href="/login" className="text-orange-400 hover:underline font-semibold">Login here</a>
                </div>
            </div>
        </div>
    );
}

export default RegisterForm;