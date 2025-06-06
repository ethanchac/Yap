import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/authentication/LoginForm.jsx';
import Signup from './components/authentication/RegisterForm.jsx';
import Home from './components/pages/Home.jsx';
import Create from './components/pages/Create.jsx';
import Users from './components/pages/Users.jsx';
import Messages from './components/pages/Messages.jsx';
import Likes from './components/pages/Likes.jsx';
import Profile from './components/pages/Profile.jsx';
import Settings from './components/pages/Settings.jsx';
import CommentsPage from './components/pages/CommentsPage.jsx';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    if (!token) {
        console.log("no token");
        return <Navigate to="/login" />;
    }

    return children;
};

function AuthRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Login />} />
            <Route
                path="/home"
                element={
                    <PrivateRoute>
                        <Home />
                    </PrivateRoute>
                }
            />
            <Route
                path="/create"
                element={
                    <PrivateRoute>
                        <Create />
                    </PrivateRoute>
                }
            />
            <Route
                path="/users"
                element={
                    <PrivateRoute>
                        <Users />
                    </PrivateRoute>
                }
            />
            <Route
                path="/messages"
                element={
                    <PrivateRoute>
                        <Messages />
                    </PrivateRoute>
                }
            />
            <Route
                path="/likes"
                element={
                    <PrivateRoute>
                        <Likes />
                    </PrivateRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <PrivateRoute>
                        <Profile />
                    </PrivateRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <PrivateRoute>
                        <Settings />
                    </PrivateRoute>
                }
            />
            <Route
                path="/post/:postId/comments"
                element={
                    <PrivateRoute>
                        <CommentsPage />
                    </PrivateRoute>
                }
            />
        </Routes>
    );
}

export default AuthRoutes;
