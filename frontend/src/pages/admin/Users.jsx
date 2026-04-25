import { useEffect, useMemo, useState } from 'react'
import {
    ActionIcon,
    Alert,
    Button,
    Group,
    Modal,
    PasswordInput,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { adminApi } from '../../api/admin.js'
import DeleteReasonModal from '../../components/admin/DeleteReasonModal.jsx'

const initialForm = {
    name: '',
    surname: '',
    email: '',
    role: 'logged_in_user',
    password: '',
}

function mapUserToForm(user) {
    return {
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        role: user.role || 'logged_in_user',
        password: '',
    }
}

function userMatchesSearch(user, query) {
    if (!query) {
        return true
    }

    const normalized = query.toLowerCase()
    return [user.name, user.surname, user.email, user.role]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(normalized))
}

export default function Users() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [searchQuery, setSearchQuery] = useState('')
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const [formOpened, setFormOpened] = useState(false)
    const [mode, setMode] = useState('create')
    const [selectedUser, setSelectedUser] = useState(null)
    const [form, setForm] = useState(initialForm)

    const [deleteOpened, setDeleteOpened] = useState(false)

    const isEditing = mode === 'edit'

    async function loadUsers() {
        setLoading(true)
        setError('')

        try {
            const data = await adminApi.listUsers()
            setUsers(data.users || [])
        } catch (loadError) {
            setError(loadError.message || 'Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadUsers()
    }, [])

    const visibleUsers = useMemo(
        () => users.filter((user) => userMatchesSearch(user, searchQuery)),
        [users, searchQuery]
    )

    function updateField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    function openCreateModal() {
        setMode('create')
        setSelectedUser(null)
        setForm(initialForm)
        setFormOpened(true)
    }

    function openEditModal(user) {
        setMode('edit')
        setSelectedUser(user)
        setForm(mapUserToForm(user))
        setFormOpened(true)
    }

    async function onSubmit(event) {
        event.preventDefault()
        setSaving(true)
        setError('')
        setMessage('')

        try {
            if (isEditing && selectedUser) {
                const payload = {
                    name: form.name,
                    surname: form.surname,
                    email: form.email,
                    role: form.role,
                }

                if (form.password.trim().length > 0) {
                    payload.password = form.password
                }

                await adminApi.updateUser(selectedUser.userID, payload)
                setMessage('User updated')
            } else {
                await adminApi.createUser(form)
                setMessage('User created')
            }

            setFormOpened(false)
            setSelectedUser(null)
            setForm(initialForm)
            await loadUsers()
        } catch (submitError) {
            setError(submitError.message || 'Failed to save user')
        } finally {
            setSaving(false)
        }
    }

    async function onDeleteConfirm(reason) {
        if (!selectedUser) {
            return
        }

        setSaving(true)
        setError('')
        setMessage('')

        try {
            await adminApi.deleteUser(selectedUser.userID, reason)
            setMessage('User deleted')
            setDeleteOpened(false)
            setSelectedUser(null)
            await loadUsers()
        } catch (deleteError) {
            setError(deleteError.message || 'Failed to delete user')
        } finally {
            setSaving(false)
        }
    }

    return (
        <>
            <div className='admin-section'>
                <Stack gap='sm'>
                    <Group justify='space-between' align='center' wrap='wrap'>
                        <Title order={2}>Users</Title>
                        <TextInput
                            leftSection={<Search size={16} />}
                            placeholder='Search users'
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            className='admin-search admin-search-right'
                            radius='md'
                            classNames={{ input: 'admin-input admin-search-input' }}
                        />
                    </Group>

                    {error && (
                        <Alert color='red' variant='light'>
                            {error}
                        </Alert>
                    )}
                    {message && <Alert variant='light'>{message}</Alert>}
                </Stack>
            </div>

            <div className='admin-table-shell'>
                {loading ? (
                    <Text c='dimmed'>Loading users...</Text>
                ) : visibleUsers.length === 0 ? (
                    <Text c='dimmed'>No users found</Text>
                ) : (
                    <ScrollArea>
                        <Table
                            withTableBorder={false}
                            withColumnBorders={false}
                            highlightOnHover={false}
                            className='admin-table admin-water-table'
                        >
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th className='col-text'>Name</Table.Th>
                                    <Table.Th className='col-text'>Email</Table.Th>
                                    <Table.Th className='col-text'>Role</Table.Th>
                                    <Table.Th className='col-text'>Date Joined</Table.Th>
                                    <Table.Th className='col-actions'>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {visibleUsers.map((user) => (
                                    <Table.Tr key={user.userID}>
                                        <Table.Td className='col-text'>
                                            {user.name} {user.surname}
                                        </Table.Td>
                                        <Table.Td className='col-text'>{user.email}</Table.Td>
                                        <Table.Td className='col-text'>
                                            {user.role}
                                        </Table.Td>
                                        <Table.Td className='col-text'>
                                            {String(user.created_at).slice(0, 10)}
                                        </Table.Td>
                                        <Table.Td className='col-actions'>
                                            <Group gap='xs' wrap='nowrap'>
                                                <ActionIcon
                                                    variant='subtle'
                                                    color='gray'
                                                    size='sm'
                                                    className='admin-action-icon'
                                                    onClick={() => openEditModal(user)}
                                                    aria-label='Edit user'
                                                >
                                                    <Pencil size={14} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant='subtle'
                                                    color='red'
                                                    size='sm'
                                                    className='admin-action-icon admin-delete-action'
                                                    onClick={() => {
                                                        setSelectedUser(user)
                                                        setDeleteOpened(true)
                                                    }}
                                                    aria-label='Delete user'
                                                >
                                                    <Trash2 size={14} />
                                                </ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </div>

            <Modal
                opened={formOpened}
                onClose={() => setFormOpened(false)}
                title={
                    <Title order={2} fw={800} lh={1.15}>
                        {isEditing ? 'Edit User' : 'Create User'}
                    </Title>
                }
                centered
                radius='md'
            >
                <form onSubmit={onSubmit}>
                    <Stack gap='md'>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='sm'>
                            <TextInput
                                label='Name'
                                value={form.name}
                                onChange={(event) =>
                                    updateField('name', event.currentTarget.value)
                                }
                                required
                                classNames={{ input: 'admin-input' }}
                            />
                            <TextInput
                                label='Surname'
                                value={form.surname}
                                onChange={(event) =>
                                    updateField('surname', event.currentTarget.value)
                                }
                                required
                                classNames={{ input: 'admin-input' }}
                            />
                            <TextInput
                                label='Email'
                                type='email'
                                value={form.email}
                                onChange={(event) =>
                                    updateField('email', event.currentTarget.value)
                                }
                                required
                                classNames={{ input: 'admin-input' }}
                            />
                            <Select
                                label='Role'
                                data={[
                                    {
                                        value: 'logged_in_user',
                                        label: 'logged_in_user',
                                    },
                                    { value: 'admin', label: 'admin' },
                                ]}
                                value={form.role}
                                onChange={(value) =>
                                    updateField('role', value || 'logged_in_user')
                                }
                                allowDeselect={false}
                                classNames={{ input: 'admin-input' }}
                            />
                        </SimpleGrid>

                        <PasswordInput
                            label={
                                isEditing
                                    ? 'Password (leave blank to keep current)'
                                    : 'Password'
                            }
                            value={form.password}
                            onChange={(event) =>
                                updateField('password', event.currentTarget.value)
                            }
                            required={!isEditing}
                            classNames={{ input: 'admin-input' }}
                        />

                        <Group justify='flex-end'>
                            <Button
                                type='button'
                                variant='outline'
                                color='themeColors.6'
                                onClick={() => setFormOpened(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button type='submit' color='themeColors.6' loading={saving}>
                                {isEditing ? 'Save Changes' : 'Create User'}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            <DeleteReasonModal
                opened={deleteOpened}
                onClose={() => {
                    setDeleteOpened(false)
                    setSelectedUser(null)
                }}
                onConfirm={onDeleteConfirm}
                loading={saving}
                title='Why are you deleting this user?'
                description='Provide a short reason why this user account should be deleted.'
                confirmLabel='Delete User'
            />
        </>
    )
}
