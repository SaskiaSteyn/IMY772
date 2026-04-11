import { Button, Drawer, NavLink } from '@mantine/core';
import { BarChart3, LogOut, MapPin, Menu, Settings } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './dashboard-navbar.scss';

export default function DashboardNavbar() {
    const [drawerOpened, setDrawerOpened] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        {
            label: 'Dashboard',
            icon: MapPin,
            onClick: () => navigate('/dashboard'),
        },
        {
            label: 'Analytics',
            icon: BarChart3,
            onClick: () => navigate('/analytics'),
        },
        {
            label: 'Settings',
            icon: Settings,
            onClick: () => navigate('/settings'),
        },
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
                    <Button variant='filled'>Login</Button>
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
                    return (
                        <NavLink
                            key={item.label}
                            label={item.label}
                            leftSection={<Icon size={20} />}
                            onClick={() => {
                                item.onClick();
                                setDrawerOpened(false);
                            }}
                        />
                    );
                })}
                <NavLink
                    label='Logout'
                    leftSection={<LogOut size={20} />}
                    onClick={handleLogout}
                    color='red'
                />
            </Drawer>
        </>
    );
}
