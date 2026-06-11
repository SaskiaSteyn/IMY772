import { Avatar, Button, Divider, Stack, Text } from '@mantine/core';
import {
    ChartColumnIncreasing,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LogIn,
    LogOut,
    Shield,
    User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context.jsx';
import LogoutConfirmationModal from '../logout-confirmation-modal.jsx';
import './dashboard-navbar.scss';

const AVATAR_COLORS = [
    '#f06418',
    '#fc8a08',
    '#00b5ff',
    '#1f32c4',
    '#4f23c0',
    '#7b2eda',
    '#c02adf',
    '#f01879',
    '#e22732',
];

export default function DashboardNavbar() {
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('sidebarOpen');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [logoutModalOpened, setLogoutModalOpened] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const isAuthenticated = Boolean(user);
    const isAdmin = user?.role === 'admin';

    const avatarSrc = user?.profileImage || null;
    const avatarName = `${user?.name || ''} ${user?.surname || ''}`.trim();

    // Update CSS variable on document root when sidebar state changes
    useEffect(() => {
        const width = sidebarOpen ? '280px' : '80px';
        document.documentElement.style.setProperty('--sidebar-width', width);
    }, [sidebarOpen]);

    // Save sidebar state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }, [sidebarOpen]);

    const handleLogout = () => {
        setLogoutModalOpened(true);
    };

    const handleConfirmLogout = async () => {
        setIsLoggingOut(true);
        try {
            navigate('/dashboard', { replace: true });
            await logout();
        } finally {
            setIsLoggingOut(false);
            setLogoutModalOpened(false);
        }
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };

    const menuItems = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            onClick: () => navigate('/dashboard'),
            path: '/dashboard',
        },
        ...(isAuthenticated
            ? [
                  {
                      label: 'Data',
                      icon: ChartColumnIncreasing,
                      onClick: () => navigate('/capture-data'),
                      path: '/capture-data',
                  },
                  {
                      label: 'Profile Settings',
                      icon: User,
                      onClick: () => navigate('/profile-settings'),
                      path: '/profile-settings',
                  },
                  ...(isAdmin
                      ? [
                            {
                                label: 'Admin Dashboard',
                                icon: Shield,
                                onClick: () => navigate('/admin/water-data'),
                                path: '/admin',
                            },
                        ]
                      : []),
              ]
            : []),
    ];

    return (
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
            {/* Header with Logo */}
            <div className='sidebar-header'>
                <div className='logo-section'>
                    {sidebarOpen ? (
                        <>
                            <img
                                src='/microtrack-logo.png'
                                alt='MicroTrack'
                                height='28px'
                            />
                        </>
                    ) : (
                        <img src='/icon.svg' alt='MicroTrack' height='28px' />
                    )}
                </div>
            </div>

            {/* Navigation Menu Items */}
            <nav className='sidebar-nav'>
                <Stack gap={0}>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isProfileRoute =
                            location.pathname === '/profile' ||
                            location.pathname === '/profile-settings';
                        const isAdminRoute =
                            location.pathname.startsWith('/admin');
                        const isActive =
                            item.path === '/profile-settings'
                                ? isProfileRoute
                                : item.path === '/admin'
                                  ? isAdminRoute
                                  : location.pathname === item.path;
                        return (
                            <button
                                key={item.label}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                onClick={item.onClick}
                                title={item.label}
                            >
                                <Icon size={20} />
                                {sidebarOpen && (
                                    <span className='nav-label'>
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </Stack>
            </nav>

            {/* Spacer to push profile section to bottom */}
            <div className='sidebar-spacer' />

            {/* Toggle Button */}
            <button
                className='nav-item toggle-button'
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? 'Collapse' : 'Expand'}
            >
                {sidebarOpen ? (
                    <ChevronLeft size={20} />
                ) : (
                    <ChevronRight size={20} />
                )}
                {sidebarOpen && (
                    <span className='nav-label'>
                        {sidebarOpen ? 'Collapse' : 'Expand'}
                    </span>
                )}
            </button>

            {/* Login Section for Unauthenticated Users */}
            {!isAuthenticated && (
                <div className='sidebar-footer'>
                    <Divider mb='md' />
                    {sidebarOpen ? (
                        <Button
                            variant='filled'
                            fullWidth
                            size='sm'
                            onClick={handleLoginClick}
                        >
                            Login
                        </Button>
                    ) : (
                        <button
                            className='nav-item'
                            onClick={handleLoginClick}
                            title='Login'
                        >
                            <LogIn size={20} />
                        </button>
                    )}
                </div>
            )}

            {/* User Profile Section */}
            {isAuthenticated && (
                <div className='sidebar-footer'>
                    <Divider mb='md' />
                    <button
                        className='profile-button'
                        onClick={handleProfileClick}
                        title='View Profile'
                    >
                        <Avatar
                            src={avatarSrc || undefined}
                            name={!avatarSrc ? avatarName : undefined}
                            alt='User avatar'
                            radius='999px'
                            size={48}
                            color={!avatarSrc ? 'initials' : undefined}
                            allowedInitialsColors={AVATAR_COLORS}
                        />
                        {sidebarOpen && (
                            <div className='profile-info'>
                                <Text fw={600} size='sm' truncate>
                                    {user?.name} {user?.surname}
                                </Text>
                                <Text size='xs' c='dimmed' truncate>
                                    {user?.email}
                                </Text>
                            </div>
                        )}
                    </button>
                    {sidebarOpen ? (
                        <Button
                            variant='outline'
                            size='xs'
                            fullWidth
                            onClick={handleLogout}
                            mt='sm'
                        >
                            Logout
                        </Button>
                    ) : (
                        <button
                            className='nav-item'
                            onClick={handleLogout}
                            title='Logout'
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            )}

            <LogoutConfirmationModal
                opened={logoutModalOpened}
                onClose={() => setLogoutModalOpened(false)}
                onConfirm={handleConfirmLogout}
                isLoading={isLoggingOut}
            />
        </aside>
    );
}
