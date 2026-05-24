import { Avatar, Button, Drawer, NavLink } from '@mantine/core';
import {
    ChartColumnIncreasing,
    LayoutDashboard,
    Menu,
    Shield,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context.jsx';
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

const getInitials = (name, surname) => {
    const initials = [];
    if (name) initials.push(name.charAt(0).toUpperCase());
    if (surname) initials.push(surname.charAt(0).toUpperCase());
    return initials.join('');
};

const getColorFromName = (name, surname) => {
    const fullName = `${name || ''}${surname || ''}`;
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
        hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[colorIndex];
};

export default function DashboardNavbar() {
    const [drawerOpened, setDrawerOpened] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const isAuthenticated = Boolean(user);
    const isAdmin = user?.role === 'admin';
    const avatarSrc = user?.profileImage || null;
    const avatarInitials = getInitials(user?.name, user?.surname);
    const avatarColor = getColorFromName(user?.name, user?.surname);

    const handleLogout = async () => {
        setDrawerOpened(false);
        navigate('/dashboard', { replace: true });
        await logout();
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
        <>
            <nav className='navbar'>
                <div className='left-content'>
                    <button
                        className='menu-button'
                        onClick={() => setDrawerOpened(true)}
                        aria-label='Toggle navigation'
                    >
                        <Menu size={24} />
                    </button>
                    <img
                        src='/microtrack-logo.png'
                        alt='App Logo'
                        height={'28px'}
                        className='logo'
                        onClick={() => navigate('/dashboard')}
                    />
                </div>
                <div className='right-content'>
                    {user ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            <Button variant='outline' onClick={handleLogout}>
                                Logout
                            </Button>
                            <Avatar
                                src={avatarSrc}
                                alt='User avatar'
                                radius='xl'
                                size='md'
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: !avatarSrc
                                        ? avatarColor
                                        : undefined,
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '0.875rem',
                                }}
                                onClick={handleProfileClick}
                            >
                                {!avatarSrc ? avatarInitials : undefined}
                            </Avatar>
                        </div>
                    ) : (
                        <Button variant='filled' onClick={handleLoginClick}>
                            Login
                        </Button>
                    )}
                </div>
            </nav>

            <Drawer
                opened={drawerOpened}
                onClose={() => setDrawerOpened(false)}
                title={
                    <img
                        src='/microtrack-logo.png'
                        alt='MicroTrack'
                        height='28px'
                        style={{ cursor: 'pointer' }}
                    />
                }
                position='left'
                size='xs'
                className='navigation-drawer'
            >
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isProfileRoute =
                        location.pathname === '/profile' ||
                        location.pathname === '/profile-settings';
                    const isAdminRoute = location.pathname.startsWith('/admin');
                    const isActive =
                        item.path === '/profile-settings'
                            ? isProfileRoute
                            : item.path === '/admin'
                              ? isAdminRoute
                              : location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.label}
                            label={item.label}
                            leftSection={<Icon size={20} />}
                            onClick={() => {
                                item.onClick();
                                setDrawerOpened(false);
                            }}
                            active={isActive}
                        />
                    );
                })}
            </Drawer>
        </>
    );
}
