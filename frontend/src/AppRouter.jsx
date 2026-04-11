import { GoogleOAuthProvider } from '@react-oauth/google';
import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Dashboard from './pages/dashboard.jsx';
import Login from './pages/login.jsx';
import SignUp from './pages/sign-up.jsx';

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return null;
    }

    return (
        <Routes>
            <Route
                path='/'
                element={
                    <Navigate to={user ? '/dashboard' : '/login'} replace />
                }
            />
            <Route
                path='/app'
                element={
                    user ? <Dashboard /> : <Navigate to='/login' replace />
                }
            />
            <Route
                path='/dashboard'
                element={
                    user ? <Dashboard /> : <Navigate to='/login' replace />
                }
            />
            <Route
                path='/styleguide'
                element={user ? <App /> : <Navigate to='/login' replace />}
            />
            <Route
                path='/login'
                element={
                    user ? <Navigate to='/dashboard' replace /> : <Login />
                }
            />
            <Route
                path='/signup'
                element={
                    user ? <Navigate to='/dashboard' replace /> : <SignUp />
                }
            />
            <Route
                path='*'
                element={
                    <Navigate to={user ? '/dashboard' : '/login'} replace />
                }
            />
        </Routes>
    );
}

export default function AppRouter() {
    return (
        <GoogleOAuthProvider
            clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}
        >
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}
