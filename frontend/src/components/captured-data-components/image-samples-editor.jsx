import {
    ActionIcon,
    NumberInput,
    ScrollArea,
    Stack,
    Table,
    Text,
    TextInput,
} from '@mantine/core';
import { Trash2 } from 'lucide-react';

const COLUMNS = [
    { key: 'location_name', label: 'Location', type: 'text' },
    { key: 'latitude', label: 'Latitude *', type: 'number' },
    { key: 'longitude', label: 'Longitude *', type: 'number' },
    { key: 'water_temperature', label: 'Temp (°C)', type: 'number' },
    { key: 'ph', label: 'pH', type: 'number' },
    { key: 'tds', label: 'TDS', type: 'number' },
    { key: 'do', label: 'DO', type: 'number' },
    { key: 'collection_date', label: 'Date', type: 'text' },
    { key: 'collected_by', label: 'Collected By', type: 'text' },
    { key: 'isolation_source', label: 'Source', type: 'text' },
    { key: 'sample_analysis_type', label: 'Analysis', type: 'text' },
];

// Editable table for samples extracted from a photo (one row per sample).
// Controlled: parent owns the array via onUpdate(idx, field, value) / onRemove(idx).
export default function ImageSamplesEditor({ samples, onUpdate, onRemove }) {
    return (
        <Stack gap='xs'>
            <Text size='sm' c='dimmed'>
                Review and edit the {samples.length} extracted sample
                {samples.length === 1 ? '' : 's'} below. Latitude and Longitude
                are required for each row.
            </Text>
            <ScrollArea type='auto' offsetScrollbars>
                <Table striped withTableBorder withColumnBorders miw={1250}>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>#</Table.Th>
                            {COLUMNS.map((c) => (
                                <Table.Th key={c.key}>{c.label}</Table.Th>
                            ))}
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {samples.map((sample, idx) => (
                            <Table.Tr key={idx}>
                                <Table.Td>{idx + 1}</Table.Td>
                                {COLUMNS.map((c) =>
                                    c.type === 'number' ? (
                                        <Table.Td key={c.key}>
                                            <NumberInput
                                                size='xs'
                                                w={108}
                                                hideControls
                                                value={sample[c.key] ?? ''}
                                                onChange={(v) =>
                                                    onUpdate(idx, c.key, v)
                                                }
                                            />
                                        </Table.Td>
                                    ) : (
                                        <Table.Td key={c.key}>
                                            <TextInput
                                                size='xs'
                                                w={130}
                                                value={sample[c.key] ?? ''}
                                                onChange={(e) =>
                                                    onUpdate(
                                                        idx,
                                                        c.key,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Table.Td>
                                    ),
                                )}
                                <Table.Td>
                                    <ActionIcon
                                        color='red'
                                        variant='subtle'
                                        onClick={() => onRemove(idx)}
                                        title='Remove sample'
                                    >
                                        <Trash2 size={16} />
                                    </ActionIcon>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </Stack>
    );
}
