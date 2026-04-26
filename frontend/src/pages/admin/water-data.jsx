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
import { ArrowUpDown, Pencil, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api/admin.js';
import DeleteReasonModal from '../../components/admin/delete-reason-modal.jsx';
import WaterSampleModal from '../../components/admin/water-sample-modal.jsx';
import { formatSirProfileLabel } from '../../lib/sir-profile';

function toNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function matchesSearch(row, query) {
    if (!query) {
        return true;
    }

    const normalizedQuery = query.toLowerCase();
    const values = [
        row.sampleID,
        row.location_name,
        row.collected_by,
        row.sample_analysis_type,
        row.latitude,
        row.longitude,
    ];

    return values.some((value) =>
        String(value ?? '')
            .toLowerCase()
            .includes(normalizedQuery),
    );
}

function matchesFilters(row, filters) {
    if (!filters) {
        return true;
    }

    const location = String(filters.location || '')
        .trim()
        .toLowerCase();
    if (
        location &&
        !String(row.location_name || '')
            .toLowerCase()
            .includes(location)
    ) {
        return false;
    }

    if (
        filters.analysisType &&
        String(row.sample_analysis_type || '').toLowerCase() !==
            String(filters.analysisType).toLowerCase()
    ) {
        return false;
    }

    const collectedBy = String(filters.collectedBy || '')
        .trim()
        .toLowerCase();
    if (
        collectedBy &&
        !String(row.collected_by || '')
            .toLowerCase()
            .includes(collectedBy)
    ) {
        return false;
    }

    const temperature = toNumber(row.water_temperature);
    const ph = toNumber(row.ph);
    const tempMin = toNumber(filters.tempMin);
    const tempMax = toNumber(filters.tempMax);
    const phMin = toNumber(filters.phMin);
    const phMax = toNumber(filters.phMax);

    if (tempMin !== null && (temperature === null || temperature < tempMin)) {
        return false;
    }

    if (tempMax !== null && (temperature === null || temperature > tempMax)) {
        return false;
    }

    if (phMin !== null && (ph === null || ph < phMin)) {
        return false;
    }

    if (phMax !== null && (ph === null || ph > phMax)) {
        return false;
    }

    return true;
}

function sortRows(rows, field, direction) {
    const multiplier = direction === 'asc' ? 1 : -1;

    function getSortableValue(row) {
        if (field === 'gps_coordinates') {
            return `${row.latitude ?? ''},${row.longitude ?? ''}`;
        }

        if (field === 'ec') {
            return row.ec ?? row.electrical_conductivity ?? row.conductivity;
        }

        if (field === 'oc') {
            return row.oc ?? row.organic_carbon ?? row.organicCarbon;
        }
        if (field === 'created_at') {
            return row.created_at ? new Date(row.created_at).getTime() : 0;
        }
        if (field === 'organisms') {
            const wgsOrganisms = Array.isArray(row.wgs)
                ? row.wgs.map((item) => item?.organism).filter(Boolean)
                : [];
            const metagenomicOrganisms = Array.isArray(row.metagenomic)
                ? row.metagenomic
                      .map((item) => item?.sequence_name)
                      .filter(Boolean)
                : [];

            return [
                ...new Set([...wgsOrganisms, ...metagenomicOrganisms]),
            ].join(', ');
        }

        if (field === 'organisms_resistance') {
            const genes = Array.isArray(row.amrResistanceGenes)
                ? row.amrResistanceGenes
                      .map((item) => item?.geneSymbol)
                      .filter(Boolean)
                      .join(', ')
                : '';
            const profile = formatSirProfileLabel(
                row.predicted_sir_profile,
                '',
            );
            return [genes, profile].filter(Boolean).join(' ');
        }

        return row[field];
    }

    return [...rows].sort((left, right) => {
        const leftValue = getSortableValue(left);
        const rightValue = getSortableValue(right);

        const leftNumber = toNumber(leftValue);
        const rightNumber = toNumber(rightValue);

        if (leftNumber !== null && rightNumber !== null) {
            return (leftNumber - rightNumber) * multiplier;
        }

        const leftText = String(leftValue ?? '').toLowerCase();
        const rightText = String(rightValue ?? '').toLowerCase();

        if (leftText < rightText) {
            return -1 * multiplier;
        }

        if (leftText > rightText) {
            return 1 * multiplier;
        }

        return 0;
    });
}

function getEcValue(row) {
    return row.ec ?? row.electrical_conductivity ?? row.conductivity ?? null;
}

function getOcValue(row) {
    return row.oc ?? row.organic_carbon ?? row.organicCarbon ?? null;
}

function getOrganismsText(row) {
    const wgsOrganisms = Array.isArray(row.wgs)
        ? row.wgs.map((item) => item?.organism).filter(Boolean)
        : [];
    const metagenomicOrganisms = Array.isArray(row.metagenomic)
        ? row.metagenomic.map((item) => item?.sequence_name).filter(Boolean)
        : [];

    const organisms = [...new Set([...wgsOrganisms, ...metagenomicOrganisms])];

    if (organisms.length === 0) {
        return '-';
    }

    return organisms.join(', ');
}

function getOrganismsResistanceText(row) {
    const genes = Array.isArray(row.amrResistanceGenes)
        ? row.amrResistanceGenes.map((item) => item?.geneSymbol).filter(Boolean)
        : [];
    const uniqueGenes = [...new Set(genes)];
    const profile = formatSirProfileLabel(row.predicted_sir_profile, '');

    if (uniqueGenes.length > 0 && profile) {
        return `${uniqueGenes.join(', ')} (${profile})`;
    }

    if (uniqueGenes.length > 0) {
        return uniqueGenes.join(', ');
    }

    return profile || '-';
}

function getWaterDataErrorMessage(error, action = 'load') {
    const status = error?.status;

    if (status === 401) {
        return 'Your session is missing or expired. Sign in again. If this is first-time setup, run "npm run bootstrap:admin" in the project root.';
    }

    if (status === 403) {
        return 'Admin access is required to manage water data.';
    }

    if (status === 404) {
        if (action === 'load') {
            return 'Water endpoint /api/admin/water/samples was not found. Restart the backend with the latest code and try again.';
        }

        return 'The requested water sample was not found. Refresh the table and try again.';
    }

    if (
        String(error?.message || '')
            .toLowerCase()
            .includes('failed to fetch')
    ) {
        return 'Cannot reach the backend server. Ensure it is running and your API URL is correct.';
    }

    return error?.message || 'Failed to process water data request';
}

export default function WaterData() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [filters] = useState(null);

    const [sortField, setSortField] = useState('sampleID');
    const [sortDirection, setSortDirection] = useState('desc');

    const [editOpened, setEditOpened] = useState(false);
    const [deleteOpened, setDeleteOpened] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [editModalKey, setEditModalKey] = useState(0);

    const loadRows = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await adminApi.listWaterSamples();
            setRows(data.rows || []);
        } catch (loadError) {
            setError(getWaterDataErrorMessage(loadError, 'load'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const filteredRows = useMemo(() => {
        const nextRows = rows.filter(
            (row) =>
                matchesSearch(row, searchQuery) && matchesFilters(row, filters),
        );

        return sortRows(nextRows, sortField, sortDirection);
    }, [rows, searchQuery, filters, sortField, sortDirection]);

    function toggleSort(field) {
        if (field === sortField) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            return;
        }

        setSortField(field);
        setSortDirection('asc');
    }

    async function handleEdit(payload) {
        if (!selectedRow) {
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            await adminApi.updateWaterSample(selectedRow.sampleID, payload);
            setMessage('Water sample updated');
            setEditOpened(false);
            setSelectedRow(null);
            await loadRows();
        } catch (updateError) {
            setError(getWaterDataErrorMessage(updateError, 'update'));
            throw updateError;
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(reason) {
        if (!selectedRow) {
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');

        try {
            await adminApi.deleteWaterSample(selectedRow.sampleID, reason);
            setMessage('Water sample deleted');
            setDeleteOpened(false);
            setSelectedRow(null);
            await loadRows();
        } catch (deleteError) {
            setError(getWaterDataErrorMessage(deleteError, 'delete'));
        } finally {
            setSaving(false);
        }
    }

    function openEdit(row) {
        setSelectedRow(row);
        setEditModalKey((prev) => prev + 1);
        setEditOpened(true);
    }

    function openDelete(row) {
        setSelectedRow(row);
        setDeleteOpened(true);
    }

    return (
        <>
            <div className='admin-section'>
                <Stack gap='sm'>
                    <Group justify='space-between' align='center' wrap='wrap'>
                        <Title order={2}>Water Data</Title>
                        <TextInput
                            leftSection={<Search size={16} />}
                            placeholder='Search by location or coordinates'
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.currentTarget.value)
                            }
                            className='admin-search admin-search-right'
                            radius='md'
                            classNames={{
                                input: 'admin-input admin-search-input',
                            }}
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
                    <Text c='dimmed'>Loading water records...</Text>
                ) : filteredRows.length === 0 ? (
                    <Text c='dimmed'>No records match your filters.</Text>
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
                                    <Table.Th
                                        className='col-text'
                                        onClick={() =>
                                            toggleSort('location_name')
                                        }
                                    >
                                        <span className='admin-th-label'>
                                            <span>Location</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-text'
                                        onClick={() =>
                                            toggleSort('gps_coordinates')
                                        }
                                    >
                                        <span className='admin-th-label'>
                                            <span>GPS Coordinates</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-num'
                                        onClick={() =>
                                            toggleSort('water_temperature')
                                        }
                                    >
                                        <span className='admin-th-label'>
                                            <span>Temp</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-num'
                                        onClick={() => toggleSort('ph')}
                                    >
                                        <span className='admin-th-label'>
                                            <span>pH</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-num'
                                        onClick={() => toggleSort('tds')}
                                    >
                                        <span className='admin-th-label'>
                                            <span>TDS</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-num'
                                        onClick={() => toggleSort('ec')}
                                    >
                                        <span className='admin-th-label'>
                                            <span>EC</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-num'
                                        onClick={() => toggleSort('oc')}
                                    >
                                        <span className='admin-th-label'>
                                            <span>OC</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-text'
                                        onClick={() => toggleSort('organisms')}
                                    >
                                        <span className='admin-th-label'>
                                            <span>Organisms</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-text'
                                        onClick={() =>
                                            toggleSort('organisms_resistance')
                                        }
                                    >
                                        <span className='admin-th-label'>
                                            <span>Organisms Resistance</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th
                                        className='col-text'
                                        onClick={() => toggleSort('created_at')}
                                    >
                                        <span className='admin-th-label'>
                                            <span>Date Added</span>
                                            <ArrowUpDown size={12} />
                                        </span>
                                    </Table.Th>
                                    <Table.Th className='col-actions'>
                                        Actions
                                    </Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredRows.map((row) => (
                                    <Table.Tr key={row.sampleID}>
                                        <Table.Td className='col-text'>
                                            {row.location_name || '-'}
                                        </Table.Td>
                                        <Table.Td className='col-text'>
                                            {row.latitude}, {row.longitude}
                                        </Table.Td>
                                        <Table.Td className='col-num'>
                                            {row.water_temperature ?? '-'}
                                        </Table.Td>
                                        <Table.Td className='col-num'>
                                            {row.ph ?? '-'}
                                        </Table.Td>
                                        <Table.Td className='col-num'>
                                            {row.tds ?? '-'}
                                        </Table.Td>
                                        <Table.Td className='col-num'>
                                            {getEcValue(row) ?? '-'}
                                        </Table.Td>
                                        <Table.Td className='col-num'>
                                            {getOcValue(row) ?? '-'}
                                        </Table.Td>
                                        <Table.Td className='col-text col-organisms'>
                                            {getOrganismsText(row)}
                                        </Table.Td>
                                        <Table.Td className='col-text col-resistance'>
                                            {getOrganismsResistanceText(row)}
                                        </Table.Td>
                                        <Table.Td className='col-text'>
                                            {row.created_at
                                                ? new Date(row.created_at)
                                                      .toLocaleDateString(
                                                          'en-GB',
                                                      )
                                                      .replace(/\//g, '-')
                                                : '-'}
                                        </Table.Td>
                                        <Table.Td className='col-actions'>
                                            <Group gap={4} wrap='nowrap'>
                                                <ActionIcon
                                                    variant='subtle'
                                                    color='gray'
                                                    size='sm'
                                                    className='admin-action-icon'
                                                    onClick={() =>
                                                        openEdit(row)
                                                    }
                                                    aria-label='Edit row'
                                                >
                                                    <Pencil size={14} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    variant='subtle'
                                                    color='red'
                                                    size='sm'
                                                    className='admin-action-icon admin-delete-action'
                                                    onClick={() =>
                                                        openDelete(row)
                                                    }
                                                    aria-label='Delete row'
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

            <WaterSampleModal
                key={`edit-${editModalKey}`}
                opened={editOpened}
                onClose={() => {
                    setEditOpened(false);
                    setSelectedRow(null);
                }}
                onSubmit={handleEdit}
                loading={saving}
                mode='edit'
                initialData={selectedRow}
            />

            <DeleteReasonModal
                opened={deleteOpened}
                onClose={() => {
                    setDeleteOpened(false);
                    setSelectedRow(null);
                }}
                onConfirm={handleDelete}
                loading={saving}
                title='Why are you deleting this data?'
                description='Provide a short reason why this water record should be deleted.'
                confirmLabel='Delete Entry'
            />
        </>
    );
}
