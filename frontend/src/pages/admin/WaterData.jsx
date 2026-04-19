import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Group,
    Modal,
    NumberInput,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core'
import {
    ChevronDown,
    ChevronUp,
    Filter,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react'
import { adminApi } from '../../api/admin.js'
import DeleteReasonModal from '../../components/admin/DeleteReasonModal.jsx'
import WaterSampleModal from '../../components/admin/WaterSampleModal.jsx'

const initialFilters = {
    location: '',
    analysisType: '',
    collectedBy: '',
    tempMin: '',
    tempMax: '',
    phMin: '',
    phMax: '',
}

function toNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return null
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function matchesSearch(row, query) {
    if (!query) {
        return true
    }

    const normalizedQuery = query.toLowerCase()
    const values = [
        row.sampleID,
        row.location_name,
        row.collected_by,
        row.sample_analysis_type,
        row.latitude,
        row.longitude,
    ]

    return values.some((value) =>
        String(value ?? '').toLowerCase().includes(normalizedQuery)
    )
}

function matchesFilters(row, filters) {
    const location = String(filters.location || '').trim().toLowerCase()
    if (
        location &&
        !String(row.location_name || '').toLowerCase().includes(location)
    ) {
        return false
    }

    if (
        filters.analysisType &&
        String(row.sample_analysis_type || '').toLowerCase() !==
            String(filters.analysisType).toLowerCase()
    ) {
        return false
    }

    const collectedBy = String(filters.collectedBy || '').trim().toLowerCase()
    if (
        collectedBy &&
        !String(row.collected_by || '').toLowerCase().includes(collectedBy)
    ) {
        return false
    }

    const temperature = toNumber(row.water_temperature)
    const ph = toNumber(row.ph)
    const tempMin = toNumber(filters.tempMin)
    const tempMax = toNumber(filters.tempMax)
    const phMin = toNumber(filters.phMin)
    const phMax = toNumber(filters.phMax)

    if (tempMin !== null && (temperature === null || temperature < tempMin)) {
        return false
    }

    if (tempMax !== null && (temperature === null || temperature > tempMax)) {
        return false
    }

    if (phMin !== null && (ph === null || ph < phMin)) {
        return false
    }

    if (phMax !== null && (ph === null || ph > phMax)) {
        return false
    }

    return true
}

function sortRows(rows, field, direction) {
    const multiplier = direction === 'asc' ? 1 : -1

    return [...rows].sort((left, right) => {
        const leftValue = left[field]
        const rightValue = right[field]

        const leftNumber = toNumber(leftValue)
        const rightNumber = toNumber(rightValue)

        if (leftNumber !== null && rightNumber !== null) {
            return (leftNumber - rightNumber) * multiplier
        }

        const leftText = String(leftValue ?? '').toLowerCase()
        const rightText = String(rightValue ?? '').toLowerCase()

        if (leftText < rightText) {
            return -1 * multiplier
        }

        if (leftText > rightText) {
            return 1 * multiplier
        }

        return 0
    })
}

function renderChildCount(value) {
    const count = Array.isArray(value) ? value.length : 0
    return <Badge variant='outline'>{count}</Badge>
}

function getWaterDataErrorMessage(error, action = 'load') {
    const status = error?.status

    if (status === 401) {
        return 'Your session is missing or expired. Sign in again. If this is first-time setup, run "npm run bootstrap:admin" in the project root.'
    }

    if (status === 403) {
        return 'Admin access is required to manage water data.'
    }

    if (status === 404) {
        if (action === 'load') {
            return 'Water endpoint /api/admin/water/samples was not found. Restart the backend with the latest code and try again.'
        }

        return 'The requested water sample was not found. Refresh the table and try again.'
    }

    if (String(error?.message || '').toLowerCase().includes('failed to fetch')) {
        return 'Cannot reach the backend server. Ensure it is running and your API URL is correct.'
    }

    return error?.message || 'Failed to process water data request'
}

export default function WaterData() {
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState(initialFilters)
    const [filtersDraft, setFiltersDraft] = useState(initialFilters)
    const [filtersOpened, setFiltersOpened] = useState(false)

    const [sortField, setSortField] = useState('sampleID')
    const [sortDirection, setSortDirection] = useState('desc')

    const [expandedSampleIds, setExpandedSampleIds] = useState(new Set())

    const [createOpened, setCreateOpened] = useState(false)
    const [editOpened, setEditOpened] = useState(false)
    const [deleteOpened, setDeleteOpened] = useState(false)
    const [selectedRow, setSelectedRow] = useState(null)
    const [createModalKey, setCreateModalKey] = useState(0)
    const [editModalKey, setEditModalKey] = useState(0)

    const loadRows = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const data = await adminApi.listWaterSamples()
            setRows(data.rows || [])
        } catch (loadError) {
            setError(getWaterDataErrorMessage(loadError, 'load'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadRows()
    }, [loadRows])

    const filteredRows = useMemo(() => {
        const nextRows = rows.filter(
            (row) =>
                matchesSearch(row, searchQuery) && matchesFilters(row, filters)
        )

        return sortRows(nextRows, sortField, sortDirection)
    }, [rows, searchQuery, filters, sortField, sortDirection])

    function toggleSort(field) {
        if (field === sortField) {
            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            return
        }

        setSortField(field)
        setSortDirection('asc')
    }

    function toggleExpanded(sampleID) {
        setExpandedSampleIds((prev) => {
            const next = new Set(prev)
            if (next.has(sampleID)) {
                next.delete(sampleID)
            } else {
                next.add(sampleID)
            }

            return next
        })
    }

    async function handleCreate(payload) {
        setSaving(true)
        setError('')
        setMessage('')

        try {
            await adminApi.createWaterSample(payload)
            setMessage('Water sample created')
            setCreateOpened(false)
            await loadRows()
        } catch (createError) {
            setError(getWaterDataErrorMessage(createError, 'create'))
            throw createError
        } finally {
            setSaving(false)
        }
    }

    async function handleEdit(payload) {
        if (!selectedRow) {
            return
        }

        setSaving(true)
        setError('')
        setMessage('')

        try {
            await adminApi.updateWaterSample(selectedRow.sampleID, payload)
            setMessage('Water sample updated')
            setEditOpened(false)
            setSelectedRow(null)
            await loadRows()
        } catch (updateError) {
            setError(getWaterDataErrorMessage(updateError, 'update'))
            throw updateError
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(reason) {
        if (!selectedRow) {
            return
        }

        setSaving(true)
        setError('')
        setMessage('')

        try {
            await adminApi.deleteWaterSample(selectedRow.sampleID, reason)
            setMessage('Water sample deleted')
            setDeleteOpened(false)
            setSelectedRow(null)
            await loadRows()
        } catch (deleteError) {
            setError(getWaterDataErrorMessage(deleteError, 'delete'))
        } finally {
            setSaving(false)
        }
    }

    function openEdit(row) {
        setSelectedRow(row)
        setEditModalKey((prev) => prev + 1)
        setEditOpened(true)
    }

    function openCreateModal() {
        setCreateModalKey((prev) => prev + 1)
        setCreateOpened(true)
    }

    function openDelete(row) {
        setSelectedRow(row)
        setDeleteOpened(true)
    }

    function openFilters() {
        setFiltersDraft(filters)
        setFiltersOpened(true)
    }

    function applyFilters() {
        setFilters(filtersDraft)
        setFiltersOpened(false)
    }

    function clearFilters() {
        setFilters(initialFilters)
        setFiltersDraft(initialFilters)
        setFiltersOpened(false)
    }

    return (
        <>
            <div className='admin-section'>
                <Stack gap='sm'>
                    <Group justify='space-between' align='center' wrap='wrap'>
                        <Title order={2}>Water Data</Title>
                        <Group gap='sm'>
                            <Button
                                leftSection={<Plus size={16} />}
                                color='dark'
                                onClick={openCreateModal}
                            >
                                Create Entry
                            </Button>
                        </Group>
                    </Group>

                    {error && (
                        <Alert color='red' variant='light'>
                            {error}
                        </Alert>
                    )}
                    {message && <Alert variant='light'>{message}</Alert>}

                    <Group justify='space-between' wrap='wrap'>
                        <TextInput
                            leftSection={<Search size={16} />}
                            placeholder='Search by location or coordinates'
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.currentTarget.value)
                            }
                            className='admin-search'
                        />
                        <Button
                            variant='outline'
                            color='gray'
                            leftSection={<Filter size={16} />}
                            onClick={openFilters}
                        >
                            Filter
                        </Button>
                    </Group>
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
                            withTableBorder
                            withColumnBorders
                            highlightOnHover
                            className='admin-table'
                        >
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th aria-label='Expand row' />
                                    <Table.Th onClick={() => toggleSort('location_name')}>
                                        Location
                                    </Table.Th>
                                    <Table.Th>GPS Coordinates</Table.Th>
                                    <Table.Th onClick={() => toggleSort('water_temperature')}>
                                        Temp
                                    </Table.Th>
                                    <Table.Th onClick={() => toggleSort('ph')}>pH</Table.Th>
                                    <Table.Th>TDS</Table.Th>
                                    <Table.Th>DO</Table.Th>
                                    <Table.Th>Analysis</Table.Th>
                                    <Table.Th>Metagenomic</Table.Th>
                                    <Table.Th>WGS</Table.Th>
                                    <Table.Th>AMR</Table.Th>
                                    <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {filteredRows.map((row) => {
                                    const isExpanded = expandedSampleIds.has(row.sampleID)

                                    return (
                                        <Fragment key={row.sampleID}>
                                            <Table.Tr>
                                                <Table.Td>
                                                    <ActionIcon
                                                        variant='subtle'
                                                        color='gray'
                                                        onClick={() =>
                                                            toggleExpanded(row.sampleID)
                                                        }
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp size={16} />
                                                        ) : (
                                                            <ChevronDown size={16} />
                                                        )}
                                                    </ActionIcon>
                                                </Table.Td>
                                                <Table.Td>
                                                    {row.location_name || '-'}
                                                </Table.Td>
                                                <Table.Td>
                                                    {row.latitude}, {row.longitude}
                                                </Table.Td>
                                                <Table.Td>
                                                    {row.water_temperature ?? '-'}
                                                </Table.Td>
                                                <Table.Td>{row.ph ?? '-'}</Table.Td>
                                                <Table.Td>{row.tds ?? '-'}</Table.Td>
                                                <Table.Td>{row.do ?? '-'}</Table.Td>
                                                <Table.Td>
                                                    {row.sample_analysis_type || '-'}
                                                </Table.Td>
                                                <Table.Td>
                                                    {renderChildCount(row.metagenomic)}
                                                </Table.Td>
                                                <Table.Td>
                                                    {renderChildCount(row.wgs)}
                                                </Table.Td>
                                                <Table.Td>
                                                    {renderChildCount(
                                                        row.amrResistanceGenes
                                                    )}
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap='xs' wrap='nowrap'>
                                                        <ActionIcon
                                                            variant='subtle'
                                                            color='dark'
                                                            onClick={() => openEdit(row)}
                                                            aria-label='Edit row'
                                                        >
                                                            <Pencil size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon
                                                            variant='subtle'
                                                            color='red'
                                                            onClick={() => openDelete(row)}
                                                            aria-label='Delete row'
                                                        >
                                                            <Trash2 size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                            {isExpanded && (
                                                <Table.Tr>
                                                    <Table.Td colSpan={12}>
                                                        <SimpleGrid
                                                            cols={{ base: 1, lg: 3 }}
                                                            spacing='sm'
                                                        >
                                                            <div className='admin-subcard'>
                                                                <Stack gap='xs'>
                                                                    <Text fw={600}>
                                                                        Metagenomic
                                                                    </Text>
                                                                    {row.metagenomic?.length ? (
                                                                        row.metagenomic.map(
                                                                            (item) => (
                                                                                <Text
                                                                                    key={`${row.sampleID}-${item.sequence_name}`}
                                                                                    size='sm'
                                                                                >
                                                                                    {item.sequence_name}
                                                                                    {item.element_type
                                                                                        ? ` (${item.element_type})`
                                                                                        : ''}
                                                                                </Text>
                                                                            )
                                                                        )
                                                                    ) : (
                                                                        <Text size='sm' c='dimmed'>
                                                                            No metagenomic records
                                                                        </Text>
                                                                    )}
                                                                </Stack>
                                                            </div>

                                                            <div className='admin-subcard'>
                                                                <Stack gap='xs'>
                                                                    <Text fw={600}>WGS</Text>
                                                                    {row.wgs?.length ? (
                                                                        row.wgs.map((item) => {
                                                                            const virulenceText =
                                                                                item.virulenceGenes
                                                                                    ?.map(
                                                                                        (gene) =>
                                                                                            gene.geneSymbol
                                                                                    )
                                                                                    .join(', ')

                                                                            return (
                                                                                <Stack
                                                                                    gap={2}
                                                                                    key={`${row.sampleID}-${item.isolateID}`}
                                                                                >
                                                                                    <Text size='sm'>
                                                                                        Isolate{' '}
                                                                                        {item.isolateID}
                                                                                        {item.organism
                                                                                            ? ` - ${item.organism}`
                                                                                            : ''}
                                                                                    </Text>
                                                                                    <Text
                                                                                        size='xs'
                                                                                        c='dimmed'
                                                                                    >
                                                                                        Virulence:{' '}
                                                                                        {virulenceText ||
                                                                                            'None'}
                                                                                    </Text>
                                                                                </Stack>
                                                                            )
                                                                        })
                                                                    ) : (
                                                                        <Text size='sm' c='dimmed'>
                                                                            No WGS records
                                                                        </Text>
                                                                    )}
                                                                </Stack>
                                                            </div>

                                                            <div className='admin-subcard'>
                                                                <Stack gap='xs'>
                                                                    <Text fw={600}>
                                                                        AMR Resistance Genes
                                                                    </Text>
                                                                    {row.amrResistanceGenes
                                                                        ?.length ? (
                                                                        <Group gap='xs'>
                                                                            {row.amrResistanceGenes.map(
                                                                                (gene) => (
                                                                                    <Badge
                                                                                        key={`${row.sampleID}-${gene.geneSymbol}`}
                                                                                        variant='outline'
                                                                                    >
                                                                                        {
                                                                                            gene.geneSymbol
                                                                                        }
                                                                                    </Badge>
                                                                                )
                                                                            )}
                                                                        </Group>
                                                                    ) : (
                                                                        <Text size='sm' c='dimmed'>
                                                                            No AMR genes
                                                                        </Text>
                                                                    )}
                                                                </Stack>
                                                            </div>
                                                        </SimpleGrid>
                                                    </Table.Td>
                                                </Table.Tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </div>

            <Modal
                opened={filtersOpened}
                onClose={() => setFiltersOpened(false)}
                title='Filter Water Data'
                centered
                size='lg'
            >
                <Stack gap='sm'>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='sm'>
                        <TextInput
                            label='Location'
                            value={filtersDraft.location}
                            onChange={(event) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    location: event.currentTarget.value,
                                }))
                            }
                        />
                        <TextInput
                            label='Collected By'
                            value={filtersDraft.collectedBy}
                            onChange={(event) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    collectedBy: event.currentTarget.value,
                                }))
                            }
                        />
                        <Select
                            label='Analysis Type'
                            value={filtersDraft.analysisType || null}
                            onChange={(value) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    analysisType: value || '',
                                }))
                            }
                            data={[
                                { value: 'Metagenomic', label: 'Metagenomic' },
                                { value: 'WGS', label: 'WGS' },
                            ]}
                            allowDeselect
                        />
                        <div />
                        <NumberInput
                            label='Temp Min'
                            value={filtersDraft.tempMin}
                            onChange={(value) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    tempMin: value,
                                }))
                            }
                            decimalScale={2}
                        />
                        <NumberInput
                            label='Temp Max'
                            value={filtersDraft.tempMax}
                            onChange={(value) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    tempMax: value,
                                }))
                            }
                            decimalScale={2}
                        />
                        <NumberInput
                            label='pH Min'
                            value={filtersDraft.phMin}
                            onChange={(value) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    phMin: value,
                                }))
                            }
                            decimalScale={2}
                        />
                        <NumberInput
                            label='pH Max'
                            value={filtersDraft.phMax}
                            onChange={(value) =>
                                setFiltersDraft((prev) => ({
                                    ...prev,
                                    phMax: value,
                                }))
                            }
                            decimalScale={2}
                        />
                    </SimpleGrid>

                    <Group justify='flex-end' mt='sm'>
                        <Button variant='outline' color='gray' onClick={clearFilters}>
                            Clear
                        </Button>
                        <Button color='dark' onClick={applyFilters}>
                            Apply Filters
                        </Button>
                    </Group>
                </Stack>
            </Modal>

            <WaterSampleModal
                key={`create-${createModalKey}`}
                opened={createOpened}
                onClose={() => setCreateOpened(false)}
                onSubmit={handleCreate}
                loading={saving}
                mode='create'
            />

            <WaterSampleModal
                key={`edit-${editModalKey}`}
                opened={editOpened}
                onClose={() => {
                    setEditOpened(false)
                    setSelectedRow(null)
                }}
                onSubmit={handleEdit}
                loading={saving}
                mode='edit'
                initialData={selectedRow}
            />

            <DeleteReasonModal
                opened={deleteOpened}
                onClose={() => {
                    setDeleteOpened(false)
                    setSelectedRow(null)
                }}
                onConfirm={handleDelete}
                loading={saving}
                title='Why are you deleting this data?'
                description='Provide a short reason why this water record should be deleted.'
                confirmLabel='Delete Entry'
            />
        </>
    )
}
