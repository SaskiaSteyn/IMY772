import { Container, Group } from '@mantine/core';
import { NavLink, Outlet } from 'react-router-dom';
import DashboardNavbar from '../../components/dashboard/dashboard-navbar.jsx';
import './admin.scss';

const links = [
    { to: '/admin/water-data', label: 'Water Data' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/statistics', label: 'Statistics' },
];

export default function AdminLayout() {
    return (
        <main className='admin-page'>
            <DashboardNavbar />
            <Container size='full' className='admin-shell'>
                <div className='admin-book'>
                    <Group gap='xs' className='admin-nav-group'>
                        {links.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end
                                className={({ isActive }) =>
                                    `admin-tab-link${isActive ? ' admin-tab-link-active' : ''}`
                                }
                            >
                                {link.label}
                            </NavLink>
                        ))}
                    </Group>

                    <section className='admin-book-content'>
                        <Outlet />
                    </section>
                </div>
            </Container>
        </main>
    );
}
