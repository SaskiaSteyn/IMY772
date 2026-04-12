import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Edit3, Trash2, Eye} from 'lucide-react';

const SamplesTable = ({records}) => {
    return (
        <DataTable
            withTableBorder
            withColumnBorders
            highlightOnHover
            records={records}
            idAccessor="sampleID"
            columns={[
                {accessor: 'sampleID', title: 'Sample ID', width: 100},
                {accessor: 'water_temperature', title: 'Temp (°C)', width: 110},
                {accessor: 'ph', title: 'pH', width: 80},
                {accessor: 'tds', title: 'TDS', width: 90},
                {accessor: 'do', title: 'DO', width: 80},
                {accessor: 'sample_analysis_type', title: 'Analysis Type', width: 140},
                {accessor: 'location_name', title: 'Location'},
                {accessor: 'collected_by', title: 'Collected By', width: 140},
                {
                    accessor: 'actions',
                    title: 'Actions',
                    width: 120,
                    render: (record) => (
                        <Group gap="xs" wrap="nowrap">
                            <ActionIcon variant="subtle" color="blue" onClick={() => console.log('View', record.sampleID)}>
                                <Eye size={18} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="orange" onClick={() => console.log('Edit', record.sampleID)}>
                                <Edit3 size={18} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => console.log('Delete', record.sampleID)}>
                                <Trash2 size={18} />
                            </ActionIcon>
                        </Group>
                    ),
                },
            ]}
            noRecordsText="No samples found"
        />
    );
};

export default SamplesTable;