import {useEffect, useState} from 'react'
import {
    Alert,
    Badge,
    Group,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Title,
} from '@mantine/core'
import {adminApi} from '../../api/admin.js'

function MetricCard({label, value}) {
    return (
        <div className='admin-metric-chip'>
            <Stack gap={2}>
                <Text size='xs' c='dimmed'>
                    {label}
                </Text>
                <Title order={3}>{value}</Title>
            </Stack>
        </div>
    )
}

export default function Statistics() {
    const [metrics, setMetrics] = useState(null)
    const [recentDeletions, setRecentDeletions] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function loadSummary() {
            setLoading(true)
            setError('')

            try {
                const data = await adminApi.getSummary()
                setMetrics(data.metrics || null)
                setRecentDeletions(data.recentDeletions || [])
            } catch (loadError) {
                setError(loadError.message || 'Failed to load summary data')
            } finally {
                setLoading(false)
            }
        }

        loadSummary()
    }, [])

    if (loading) {
        return (
            <div className='admin-section'>
                <Text c='dimmed'>Loading statistics...</Text>
            </div>
        )
    }

    return (
        <Stack gap='md'>
            <div className='admin-section'>
                <Stack gap='sm'>
                    {error && (
                        <Alert color='red' variant='light'>
                            {error}
                        </Alert>
                    )}

                    {!metrics ? (
                        <Text c='dimmed'>No summary metrics available.</Text>
                    ) : (
                        <SimpleGrid cols={{base: 2, sm: 3, lg: 4}} spacing='sm'>
                            <MetricCard label='Users' value={metrics.usersCount} />
                            <MetricCard label='Samples' value={metrics.samplesCount} />
                            <MetricCard label='Isolates' value={metrics.isolatesCount} />
                            <MetricCard label='AMR Findings' value={metrics.amrFindingsCount} />
                            <MetricCard label='Predicted Phenotypes' value={metrics.predictedPhenotypesCount} />
                        </SimpleGrid>
                    )}
                </Stack>
            </div>

            <div className='admin-table-shell'>
                <Stack gap='sm'>
                    <Title order={3}>Recent deletions</Title>
                    {recentDeletions.length === 0 ? (
                        <Text c='dimmed'>No delete activity recorded yet.</Text>
                    ) : (
                        <Table withTableBorder withColumnBorders highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Entity</Table.Th>
                                    <Table.Th>Actor</Table.Th>
                                    <Table.Th>Reason</Table.Th>
                                    <Table.Th>Date</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {recentDeletions.map((item) => (
                                    <Table.Tr key={item.id}>
                                        <Table.Td>
                                            <Badge variant='outline'>
                                                {item.entityType}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap='xs'>
                                                <Text size='sm'>
                                                    {item.actorEmail ||
                                                        `User ${item.actorUserID}`}
                                                </Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>{item.reason}</Table.Td>
                                        <Table.Td>
                                            {String(item.created_at).slice(0, 16).replace('T', ' ')}
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Stack>
            </div>
        </Stack>
    )
}
