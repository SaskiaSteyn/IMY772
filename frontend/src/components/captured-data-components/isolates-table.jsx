import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Maximize2, Pencil} from 'lucide-react';

const IsolatesTable = ({records, highlightedSampleIds, onExpandClick, onEditClick}) => {
    return (
        <DataTable
            striped
            highlightOnHover
            records={records}
            idAccessor='isolate_id'
            rowSx={(record) => ({
                backgroundColor: highlightedSampleIds?.has(record.sample_id)
                    ? 'rgba(59, 130, 246, 0.2)'
                    : undefined,
                transition: 'background-color 0.3s ease',
            })}
            columns={[
                {
                    accessor: 'isolate_id',
                    title: 'Isolate ID',
                    width: 100,
                    textAlignment: 'center',
                },
                {
                    accessor: 'sample_id',
                    title: 'Sample ID',
                    width: 120,
                    textAlignment: 'center',
                },
                {
                    accessor: 'organism',
                    title: 'Organism',
                    width: 200,
                },
                {
                    accessor: 'mlst_type',
                    title: 'MLST Type',
                    width: 120,
                    textAlignment: 'center',
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
                                onClick={() => onEditClick(record)}
                                title='Edit isolate'
                            >
                                <Pencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                                size='sm'
                                variant='subtle'
                                onClick={() => onExpandClick(record)}
                                title='View sample data'
                            >
                                <Maximize2 size={16} />
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

export default IsolatesTable;
