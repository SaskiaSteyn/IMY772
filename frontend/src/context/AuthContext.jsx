/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function refreshUser() {
        const data = await authApi.me();
        setUser(data.user);
        return data.user;
    }

    // On mount, check if there is a valid session cookie
    useEffect(() => {
        (async () => {
            try {
                await refreshUser();
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    async function login(email, password) {
        const data = await authApi.login(email, password);
        setUser(data.user);
        return data.user;
    }

    async function register(name, surname, email, password) {
        const data = await authApi.register(name, surname, email, password);
        setUser(data.user);
        return data.user;
    }

    async function googleLogin(authPayload) {
        const data = await authApi.googleLogin(authPayload);
        setUser(data.user);
        return data.user;
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                googleLogin,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
