import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Pencil, Maximize2} from 'lucide-react';

const WGSTable = ({records, highlightedSampleIds, onEditClick, onExpandClick}) => {
    return (
        <DataTable
            striped
            highlightOnHover
            records={records}
            idAccessor='sampleID'
            rowSx={(record) => ({
                backgroundColor: highlightedSampleIds?.has(record.sampleID)
                    ? 'rgba(59, 130, 246, 0.2)'
                    : undefined,
                transition: 'background-color 0.3s ease',
            })}
            columns={[
                {
                    accessor: 'sampleID',
                    title: 'Sample ID',
                    width: 100,
                    textAlignment: 'center',
                },
                {
                    accessor: 'isolateID',
                    title: 'Isolate ID',
                    width: 100,
                    textAlignment: 'center',
                },
                {
                    accessor: 'organism',
                    title: 'Organism',
                    width: 150,
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

export default WGSTable;