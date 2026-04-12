import { GoogleOAuthProvider } from '@react-oauth/google';
import { Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AmrResistanceGenes from './pages/admin/AmrResistanceGenes.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Measurements from './pages/admin/Measurements.jsx';
import Metagenomic from './pages/admin/Metagenomic.jsx';
import Users from './pages/admin/Users.jsx';
import VirulenceGenes from './pages/admin/VirulenceGenes.jsx';
import Wgs from './pages/admin/Wgs.jsx';
import Dashboard from './pages/dashboard.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import SignUp from './pages/sign-up.jsx';

function AppRoutes() {
    const { user, loading } = useAuth();

    function getAdminRouteElement() {
        if (!user) {
            return <Navigate to='/login' replace />;
        }

        if (user.role !== 'admin') {
            return <Navigate to='/dashboard' replace />;
        }

        return <AdminLayout />;
    }

    if (loading) {
        return null;
    }

    return (
        <Routes>
            <Route path='/' element={<Navigate to='/dashboard' replace />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route
                path='/app'
                element={
                    user ? <Dashboard /> : <Navigate to='/login' replace />
                }
            />
            <Route
                path='/profile'
                element={user ? <Profile /> : <Navigate to='/login' replace />}
            />
            <Route
                path='/profile-settings'
                element={user ? <Profile /> : <Navigate to='/login' replace />}
            />
            <Route
                path='/styleguide'
                element={user ? <App /> : <Navigate to='/login' replace />}
            />
            <Route
                path='/admin'
                element={getAdminRouteElement()}
            >
                <Route index element={<Navigate to='users' replace />} />
                <Route path='users' element={<Users />} />
                <Route path='measurements' element={<Measurements />} />
                <Route path='metagenomic' element={<Metagenomic />} />
                <Route path='wgs' element={<Wgs />} />
                <Route
                    path='amr-resistance-genes'
                    element={<AmrResistanceGenes />}
                />
                <Route path='virulence-genes' element={<VirulenceGenes />} />
            </Route>
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
            <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
    );
}

export default function AppRouter() {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

    const app = (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );

    if (!googleClientId) {
        return app;
    }

    return (
        <GoogleOAuthProvider clientId={googleClientId}>
            {app}
        </GoogleOAuthProvider>
    );
}
