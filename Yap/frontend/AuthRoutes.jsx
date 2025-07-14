import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/authentication/LoginForm.jsx';
import Signup from './components/authentication/RegisterForm.jsx';
import ForgotPassword from './components/authentication/ForgotPasswordForm.jsx'; // ADD THIS LINE
import Home from './components/pages/Home.jsx';
import Create from './components/pages/Create.jsx';
import Users from './components/pages/Users.jsx';
import Messages from './components/pages/Messages.jsx';
import Likes from './components/pages/profile/Likes.jsx';
import Waypoint from './components/pages/Waypoint.jsx';
import Profile from './components/pages/profile/Profile.jsx';
import Settings from './components/pages/Settings.jsx';
import Feedback from './components/pages/Feedback.jsx';
import CommentsPage from './components/pages/CommentsPage.jsx';
import PageTransition from './components/common/PageTransition.jsx';

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
            <Route path="/login" element={
                <PageTransition>
                    <Login />
                </PageTransition>
            } />
            <Route path="/signup" element={
                <PageTransition>
                    <Signup />
                </PageTransition>
            } />
            <Route path="/forgot-password" element={
                <PageTransition>
                    <ForgotPassword />
                </PageTransition>
            } />
            <Route path="/" element={
                <PageTransition>
                    <Login />
                </PageTransition>
            } />
            <Route
                path="/home"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Home />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/create"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Create />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/users"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Users />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/messages"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Messages />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/likes"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Likes />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/waypoint"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Waypoint />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/profile"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Profile />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/profile/:userId"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Profile />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Settings />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/feedback"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <Feedback />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
            <Route
                path="/post/:postId/comments"
                element={
                    <PrivateRoute>
                        <PageTransition>
                            <CommentsPage />
                        </PageTransition>
                    </PrivateRoute>
                }
            />
        </Routes>
    );
}

export default AuthRoutes;