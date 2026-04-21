import {
	Badge,
	Container,
	Group,
	Text,
	Title,
} from '@mantine/core'
import { BarChart3, Droplets, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import DashboardNavbar from '../../components/dashboard/dashboard-navbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import './admin.scss'

const links = [
	{ to: '/admin/water-data', label: 'Water Data', icon: Droplets },
	{ to: '/admin/users', label: 'Users', icon: Users },
	{ to: '/admin/statistics', label: 'Statistics', icon: BarChart3 },
]

export default function AdminLayout() {
	const { user } = useAuth()

	return (
		<main className='admin-page'>
			<DashboardNavbar />
			<Container size='xl' className='admin-shell'>
				<div className='admin-book'>
					<div className='admin-book-header'>
						<div>
							<Title order={1}>Admin Dashboard</Title>
							<Text c='dimmed' size='sm'>
								Logged in as {user?.email}
							</Text>
						</div>

						<Group gap='xs'>
							<Badge color='dark' variant='outline'>
								{user?.role || 'logged_in_user'}
							</Badge>
						</Group>
					</div>

					<Group gap='xs' className='admin-nav-group'>
						{links.map((link) => {
							const Icon = link.icon

							return (
								<NavLink
									key={link.to}
									to={link.to}
									end
									className={({ isActive }) =>
										`admin-tab-link${isActive ? ' admin-tab-link-active' : ''}`
									}
								>
									<Icon size={15} className='admin-tab-icon' />
									<span className='admin-tab-title'>{link.label}</span>
								</NavLink>
							)
						})}
					</Group>

					<section className='admin-book-content'>
						<Outlet />
					</section>
				</div>
			</Container>
		</main>
	)
}
