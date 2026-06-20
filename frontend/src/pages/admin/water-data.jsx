import {
    ActionIcon,
    Alert,
    Group,
    ScrollArea,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {ArrowUpDown, Pencil, Search, Trash2} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {adminApi} from '../../api/admin.js';
import DeleteReasonModal from '../../components/admin/delete-reason-modal.jsx';
import WaterSampleModal from '../../components/admin/water-sample-modal.jsx';

function toNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function matchesSearch(row, query) {
    if (!query) return true;
    const normalized = query.toLowerCase();
    const values = [
        row.sample_id,
        row.sample_name,
        row.location_name,
        row.collected_by,
        row.isolation_source,
    ];
    return values.some(v => String(v ?? '').toLowerCase().includes(normalized));
}

function sortRows(rows, field, direction) {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        const aNum = toNumber(aVal);
        const bNum = toNumber(bVal);
        if (aNum !== null && bNum !== null) {
            return (aNum - bNum) * multiplier;
        }
        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        if (aStr < bStr) return -1 * multiplier;
        if (aStr > bStr) return 1 * multiplier;
        return 0;
    });
}

function getWaterDataErrorMessage(error, action = 'load') {
    const status = error?.status;
    if (status === 401) return 'Session expired. Please sign in again.';
    if (status === 403) return 'Admin access required.';
    if (status === 404 && action === 'load') return 'Water endpoint not found.';
    if (String(error?.message || '').toLowerCase().includes('failed to fetch'))
        return 'Cannot reach the backend server.';
    return error?.message || 'Failed to process request.';
}

export default function WaterData() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');

    const [modalOpened, setModalOpened] = useState(false);
    const [modalMode, setModalMode] = useState('edit'); // only edit
    const [selectedRow, setSelectedRow] = useState(null);
    const [deleteOpened, setDeleteOpened] = useState(false);
    const [modalKey, setModalKey] = useState(0);

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminApi.listWaterSamples();
            setRows(data.rows || []);
        } catch (err) {
            setError(getWaterDataErrorMessage(err, 'load'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {loadRows();}, [loadRows]);

    const filteredRows = useMemo(() => {
        const filtered = rows.filter(row => matchesSearch(row, searchQuery));
        return sortRows(filtered, sortField, sortDirection);
    }, [rows, searchQuery, sortField, sortDirection]);

    function toggleSort(field) {
        if (field === sortField) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }

    async function handleModalSubmit(payload) {
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await adminApi.updateWaterSample(selectedRow.sample_id, payload);
            setMessage('Sample updated');
            setModalOpened(false);
            setSelectedRow(null);
            await loadRows();
        } catch (err) {
            setError(getWaterDataErrorMessage(err, 'update'));
            throw err;
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(reason) {
        if (!selectedRow) return;
        setSaving(true);
        setError('');
        setMessage('');
        try {
            await adminApi.deleteWaterSample(selectedRow.sample_id, reason);
            setMessage('Sample deleted');
            setDeleteOpened(false);
            setSelectedRow(null);
            await loadRows();
        } catch (err) {
            setError(getWaterDataErrorMessage(err, 'delete'));
        } finally {
            setSaving(false);
        }
    }

    function openEdit(row) {
        setModalMode('edit');
        setSelectedRow(row);
        setModalKey(prev => prev + 1);
        setModalOpened(true);
    }

    function openDelete(row) {
        setSelectedRow(row);
        setDeleteOpened(true);
    }

    return (
        <>
            <div className='admin-section'>
                <Stack gap='sm'>
                    <Group justify='flex-end' align='center' wrap='wrap'>
                        <TextInput
                            leftSection={<Search size={16} />}
                            placeholder='Search'
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.currentTarget.value)}
                            className='admin-search admin-search-right'
                            radius='md'
                            classNames={{input: 'admin-input admin-search-input'}}
                        />
                    </Group>

                    {error && <Alert color='red' variant='light'>{error}</Alert>}
                    {message && <Alert variant='light'>{message}</Alert>}
                </Stack>
            </div>

            <div className='admin-table-shell'>
                {loading ? (
                    <Text c='dimmed'>Loading water records...</Text>
                ) : filteredRows.length === 0 ? (
                    <Text c='dimmed'>No records found.</Text>
                ) : (
                    <ScrollArea>
                        <Table withTableBorder={false} withColumnBorders={false} highlightOnHover={false}
                            className='admin-table admin-water-table'>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th className='col-text' onClick={() => toggleSort('sample_id')}>
                                        <span className='admin-th-label'><span>Sample ID</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('sample_name')}>
                                        <span className='admin-th-label'><span>Sample Name</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('location_name')}>
                                        <span className='admin-th-label'><span>Location</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('latitude')}>
                                        <span className='admin-th-label'><span>Latitude</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('longitude')}>
                                        <span className='admin-th-label'><span>Longitude</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-num' onClick={() => toggleSort('water_temp')}>
                                        <span className='admin-th-label'><span>Temp (°C)</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-num' onClick={() => toggleSort('ph')}>
                                        <span className='admin-th-label'><span>pH</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-num' onClick={() => toggleSort('tds')}>
                                        <span className='admin-th-label'><span>TDS</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-num' onClick={() => toggleSort('do')}>
                                        <span className='admin-th-label'><span>DO</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('collection_date')}>
                                        <span className='admin-th-label'><span>Collection Date</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('collected_by')}>
                                        <span className='admin-th-label'><span>Collected By</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-text' onClick={() => toggleSort('created_at')}>
                                        <span className='admin-th-label'><span>Date Added</span><ArrowUpDown size={12} /></span>
                                    </Table.Th>
                                    <Table.Th className='col-actions'>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredRows.map(row => (
                                    <Table.Tr key={row.sample_id}>
                                        <Table.Td className='col-text'>{row.sample_id}</Table.Td>
                                        <Table.Td className='col-text'>{row.sample_name || '-'}</Table.Td>
                                        <Table.Td className='col-text'>{row.location_name || '-'}</Table.Td>
                                        <Table.Td className='col-text'>{row.latitude ?? '-'}</Table.Td>
                                        <Table.Td className='col-text'>{row.longitude ?? '-'}</Table.Td>
                                        <Table.Td className='col-num'>{row.water_temp ?? '-'}</Table.Td>
                                        <Table.Td className='col-num'>{row.ph ?? '-'}</Table.Td>
                                        <Table.Td className='col-num'>{row.tds ?? '-'}</Table.Td>
                                        <Table.Td className='col-num'>{row.do ?? '-'}</Table.Td>
                                        <Table.Td className='col-text'>
                                            {row.collection_date ? new Date(row.collection_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                                        </Table.Td>
                                        <Table.Td className='col-text'>{row.collected_by || '-'}</Table.Td>
                                        <Table.Td className='col-text'>
                                            {row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                                        </Table.Td>
                                        <Table.Td className='col-actions'>
                                            <Group gap={4} wrap='nowrap'>
                                                <ActionIcon variant='subtle' color='gray' size='sm'
                                                    className='admin-action-icon' onClick={() => openEdit(row)}>
                                                    <Pencil size={14} />
                                                </ActionIcon>
                                                <ActionIcon variant='subtle' color='red' size='sm'
                                                    className='admin-action-icon admin-delete-action'
                                                    onClick={() => openDelete(row)}>
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

            <WaterSampleModal
                key={modalKey}
                opened={modalOpened}
                onClose={() => {setModalOpened(false); setSelectedRow(null);}}
                onSubmit={handleModalSubmit}
                loading={saving}
                mode='edit'
                initialData={selectedRow}
            />

            <DeleteReasonModal
                opened={deleteOpened}
                onClose={() => {setDeleteOpened(false); setSelectedRow(null);}}
                onConfirm={handleDelete}
                loading={saving}
                title='Why are you deleting this sample?'
                description='Provide a short reason why this water sample should be deleted.'
                confirmLabel='Delete Sample'
            />
        </>
    );
}