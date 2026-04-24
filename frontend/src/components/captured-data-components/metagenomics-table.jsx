import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Pencil} from 'lucide-react';

const MetagenomicsTable = ({records, highlightedSampleIds, onEditClick}) => {
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
                    accessor: 'sequence_name',
                    title: 'Sequence Name',
                    width: 150,
                },
                {
                    accessor: 'element_type',
                    title: 'Element Type',
                    width: 120,
                },
                {
                    accessor: 'class',
                    title: 'Class',
                    width: 100,
                },
                {
                    accessor: 'subclass',
                    title: 'Subclass',
                    width: 100,
                },
                {
                    accessor: 'actions',
                    title: '',
                    width: 50,
                    textAlignment: 'center',
                    render: (record) => (
                        <Group justify='center' gap={0}>
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

export default MetagenomicsTable;
