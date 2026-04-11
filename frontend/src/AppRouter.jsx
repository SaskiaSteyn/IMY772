import { Navigate, Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import App from './App.jsx';
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    return (
        <Routes>
            <Route
                path="/"
                element={<Navigate to={user ? '/app' : '/login'} replace />}
            />
            <Route
                path="/app"
                element={user ? <App /> : <Navigate to="/login" replace />}
            />
            <Route
                path="/login"
                element={user ? <Navigate to="/app" replace /> : <Login />}
            />
            <Route
                path="/signup"
                element={user ? <Navigate to="/app" replace /> : <SignUp />}
            />
            <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
        </Routes>
    );
}

export default function AppRouter() {
    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}
