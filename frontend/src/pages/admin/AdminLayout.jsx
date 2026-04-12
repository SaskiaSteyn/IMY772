import {
	Badge,
	Button,
	Container,
	Group,
	Paper,
	Stack,
	Text,
	Title,
} from '@mantine/core'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import DashboardNavbar from '../../components/dashboard/dashboard-navbar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import './admin.scss'

const links = [
	{ to: '/admin/users', label: 'Users' },
	{ to: '/admin/measurements', label: 'Measurements' },
	{ to: '/admin/metagenomic', label: 'Metagenomic' },
	{ to: '/admin/wgs', label: 'WGS' },
	{ to: '/admin/amr-resistance-genes', label: 'AMR Resistance Genes' },
	{ to: '/admin/virulence-genes', label: 'Virulence Genes' },
]

export default function AdminLayout() {
	const location = useLocation()
	const { user } = useAuth()

	return (
		<main className='admin-page'>
			<DashboardNavbar />
			<Container size='xl' className='admin-shell'>
				<Stack gap='md'>
					<Paper withBorder radius='md' p='lg' className='admin-card'>
						<Stack gap='md'>
							<Group
								justify='space-between'
								align='flex-start'
								wrap='wrap'
							>
								<div>
									<Title order={1}>Admin Dashboard</Title>
									<Text c='dimmed' size='sm'>
										Logged in as {user?.email}
									</Text>
								</div>

								<Group gap='xs'>
									<Badge color='themeColors.6' variant='light'>
										{user?.role || 'logged_in_user'}
									</Badge>
								</Group>
							</Group>

							<Group gap='xs' className='admin-nav-group'>
								{links.map((link) => {
									const isActive = location.pathname === link.to

									return (
										<Button
											key={link.to}
											component={NavLink}
											to={link.to}
											variant={
												isActive ? 'filled' : 'light'
											}
											color='themeColors.6'
										>
											{link.label}
										</Button>
									)
								})}
							</Group>
						</Stack>
					</Paper>

					<Outlet />
				</Stack>
			</Container>
		</main>
	)
}
