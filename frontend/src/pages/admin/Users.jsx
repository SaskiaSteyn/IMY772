import { useEffect, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Group,
    Paper,
    PasswordInput,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { adminApi } from '../../api/admin.js';

const initialForm = {
    name: '',
    surname: '',
    email: '',
    role: 'logged_in_user',
    password: '',
};

function mapUserToForm(user) {
    return {
        name: user.name || '',
        surname: user.surname || '',
        email: user.email || '',
        role: user.role || 'logged_in_user',
        password: '',
    };
}

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const isEditing = Boolean(editingUserId);

    async function loadUsers() {
        setLoading(true);
        setError('');

        try {
            const data = await adminApi.listUsers();
            setUsers(data.users || []);
        } catch (err) {
            setError(err.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    function resetForm() {
        setEditingUserId(null);
        setForm(initialForm);
    }

    function updateField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function onEditUser(user) {
        setEditingUserId(user.userID);
        setForm(mapUserToForm(user));
        setError('');
        setMessage('');
    }

    async function onSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setMessage('');

        try {
            if (isEditing) {
                const payload = {
                    name: form.name,
                    surname: form.surname,
                    email: form.email,
                    role: form.role,
                };

                if (form.password.trim().length > 0) {
                    payload.password = form.password;
                }

                await adminApi.updateUser(editingUserId, payload);
                setMessage('User updated');
            } else {
                await adminApi.createUser(form);
                setMessage('User created');
            }

            resetForm();
            await loadUsers();
        } catch (err) {
            setError(err.message || 'Failed to save user');
        } finally {
            setSaving(false);
        }
    }

    async function onDeleteUser(userID) {
        const confirmed = window.confirm('Delete this user permanently?');
        if (!confirmed) {
            return;
        }

        setError('');
        setMessage('');

        try {
            await adminApi.deleteUser(userID);
            setMessage('User deleted');
            if (editingUserId === userID) {
                resetForm();
            }
            await loadUsers();
        } catch (err) {
            setError(err.message || 'Failed to delete user');
        }
    }

    return (
        <Stack gap='md'>
            <Paper withBorder radius='md' p='lg' className='admin-card'>
                <Stack gap='md'>
                    <Title order={2}>Users</Title>

                    {error && (
                        <Alert color='red' variant='light'>
                            {error}
                        </Alert>
                    )}
                    {message && <Alert variant='light'>{message}</Alert>}

                    <form onSubmit={onSubmit}>
                        <Stack gap='md'>
                            <Title order={4}>
                                {isEditing ? 'Edit User' : 'Create User'}
                            </Title>

                            <SimpleGrid
                                cols={{ base: 1, sm: 2, lg: 3 }}
                                spacing='sm'
                            >
                                <TextInput
                                    label='Name'
                                    value={form.name}
                                    onChange={(event) =>
                                        updateField(
                                            'name',
                                            event.currentTarget.value,
                                        )
                                    }
                                    required
                                    classNames={{ input: 'admin-input' }}
                                />

                                <TextInput
                                    label='Surname'
                                    value={form.surname}
                                    onChange={(event) =>
                                        updateField(
                                            'surname',
                                            event.currentTarget.value,
                                        )
                                    }
                                    required
                                    classNames={{ input: 'admin-input' }}
                                />

                                <TextInput
                                    type='email'
                                    label='Email'
                                    value={form.email}
                                    onChange={(event) =>
                                        updateField(
                                            'email',
                                            event.currentTarget.value,
                                        )
                                    }
                                    required
                                    classNames={{ input: 'admin-input' }}
                                />

                                <Select
                                    label='Role'
                                    value={form.role}
                                    onChange={(value) =>
                                        updateField(
                                            'role',
                                            value || 'logged_in_user',
                                        )
                                    }
                                    allowDeselect={false}
                                    data={[
                                        {
                                            value: 'logged_in_user',
                                            label: 'logged_in_user',
                                        },
                                        { value: 'admin', label: 'admin' },
                                    ]}
                                    classNames={{ input: 'admin-input' }}
                                />

                                <PasswordInput
                                    label={
                                        isEditing
                                            ? 'Password (leave blank to keep current)'
                                            : 'Password'
                                    }
                                    value={form.password}
                                    onChange={(event) =>
                                        updateField(
                                            'password',
                                            event.currentTarget.value,
                                        )
                                    }
                                    required={!isEditing}
                                    classNames={{ input: 'admin-input' }}
                                />
                            </SimpleGrid>

                            <Group gap='sm'>
                                <Button
                                    type='submit'
                                    loading={saving}
                                    color='themeColors.6'
                                >
                                    {isEditing ? 'Update User' : 'Create User'}
                                </Button>
                                <Button
                                    type='button'
                                    variant='light'
                                    color='themeColors.6'
                                    onClick={resetForm}
                                    disabled={saving}
                                >
                                    Clear
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Stack>
            </Paper>

            <Paper withBorder radius='md' p='lg' className='admin-card'>
                {loading ? (
                    <Text c='dimmed'>Loading users...</Text>
                ) : users.length === 0 ? (
                    <Text c='dimmed'>No users found</Text>
                ) : (
                    <ScrollArea>
                        <Table
                            withTableBorder
                            withColumnBorders
                            highlightOnHover
                            striped
                            horizontalSpacing='sm'
                        >
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>ID</Table.Th>
                                    <Table.Th>Name</Table.Th>
                                    <Table.Th>Surname</Table.Th>
                                    <Table.Th>Email</Table.Th>
                                    <Table.Th>Role</Table.Th>
                                    <Table.Th>Created</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {users.map((user) => (
                                    <Table.Tr key={user.userID}>
                                        <Table.Td>{user.userID}</Table.Td>
                                        <Table.Td>{user.name}</Table.Td>
                                        <Table.Td>{user.surname}</Table.Td>
                                        <Table.Td>{user.email}</Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={
                                                    user.role === 'admin'
                                                        ? 'themeColors.8'
                                                        : 'themeColors.6'
                                                }
                                                variant='light'
                                            >
                                                {user.role}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            {String(user.created_at).slice(
                                                0,
                                                10,
                                            )}
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap='xs' wrap='nowrap'>
                                                <Button
                                                    size='xs'
                                                    type='button'
                                                    variant='light'
                                                    color='themeColors.6'
                                                    onClick={() =>
                                                        onEditUser(user)
                                                    }
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size='xs'
                                                    type='button'
                                                    variant='outline'
                                                    color='red'
                                                    onClick={() =>
                                                        onDeleteUser(
                                                            user.userID,
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </Paper>
        </Stack>
    );
}
