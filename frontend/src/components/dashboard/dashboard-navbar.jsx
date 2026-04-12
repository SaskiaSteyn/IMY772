import {Avatar, Button, Drawer, NavLink} from '@mantine/core'
import {
    ChartColumnIncreasing,
    LayoutDashboard,
    Menu,
    Shield,
    User,
} from 'lucide-react'
import {useState} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import {useAuth} from '../../context/AuthContext.jsx'
import './dashboard-navbar.scss'

export default function DashboardNavbar() {
    const [drawerOpened, setDrawerOpened] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const {user, logout} = useAuth();
    const isAuthenticated = Boolean(user);
    const isAdmin = user?.role === 'admin';

    const handleLogout = async () => {
        setDrawerOpened(false);
        navigate('/dashboard', {replace: true});
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
                    label: 'Capture Data',
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
                            onClick: () => navigate('/admin/users'),
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
                                src='https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
                                alt='User avatar'
                                radius='xl'
                                size='md'
                                style={{cursor: 'pointer'}}
                                onClick={handleProfileClick}
                            />
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
                        style={{cursor: 'pointer'}}
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
                    const isAdminRoute =
                        location.pathname.startsWith('/admin');
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
