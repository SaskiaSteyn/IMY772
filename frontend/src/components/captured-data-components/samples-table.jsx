import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Pencil, Maximize2} from 'lucide-react';

const SamplesTable = ({records, highlightedSampleIds, onEditClick, onExpandClick}) => {
    return (
        <DataTable
            striped
            highlightOnHover
            records={records}
            idAccessor='sample_id'
            rowSx={(record) => ({
                backgroundColor: highlightedSampleIds?.has(record.sample_id)
                    ? 'rgba(59, 130, 246, 0.2)'
                    : undefined,
                transition: 'background-color 0.3s ease',
            })}
            columns={[
                {
                    accessor: 'sample_id',
                    title: 'Sample ID',
                    width: 120,
                    textAlignment: 'center',
                },
                {
                    accessor: 'collection_date',
                    title: 'Collection Date',
                    width: 130,
                    textAlignment: 'center',
                    render: (record) => record.collection_date ? new Date(record.collection_date).toLocaleDateString() : '-',
                },
                {
                    accessor: 'water_temp',
                    title: 'Temp (°C)',
                    width: 110,
                    textAlignment: 'center',
                },
                {
                    accessor: 'ph',
                    title: 'pH',
                    width: 80,
                    textAlignment: 'center',
                },
                {
                    accessor: 'tds',
                    title: 'TDS',
                    width: 90,
                    textAlignment: 'center',
                },
                {
                    accessor: 'do',
                    title: 'DO',
                    width: 80,
                    textAlignment: 'center',
                },
                {
                    accessor: 'isolation_source',
                    title: 'Source',
                    width: 150,
                },
                {
                    accessor: 'location_name',
                    title: 'Location',
                    width: 180,
                },
                {
                    accessor: 'actions',
                    title: '',
                    width: 80,
                    textAlignment: 'center',
                    render: (record) => (
                        <Group justify='center' gap={4}>
                            <ActionIcon
                                size='sm'
                                variant='subtle'
                                onClick={() => onExpandClick(record)}
                                title='View full sample data'
                            >
                                <Maximize2 size={16} />
                            </ActionIcon>
                            <ActionIcon
                                size='sm'
                                variant='subtle'
                                onClick={() => onEditClick(record)}
                                title='Edit record'
                            >
                                <Pencil size={16} />
                            </ActionIcon>
                        </Group>
                    ),
                },
            ]}
            noRecordsText=''
            noRecordsIcon={<></>}
            minHeight={300}
            styles={{
                emptyState: {display: 'none'},
            }}
        />
    );
};

export default SamplesTable;