import { Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/authentication/LoginForm.jsx'
import Signup from './components/authentication/RegisterForm.jsx'
import Home from './components/home/Home.jsx'

const PrivateRoute = ({children}) => {
    const token = localStorage.getItem('token');

    if(!token){
        console.log("no token");
        return <Navigate to="/login"/>
    }

    return children
}

function AuthRoutes(){
    return(
        <Routes>
            <Route path="/login" element={<Login />}/>
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Login />} />
            <Route
                path="/Home"
                element={
                    <PrivateRoute>
                        <Home />
                    </PrivateRoute>
                }
            />
        </Routes>
    )
}

export default AuthRoutes;