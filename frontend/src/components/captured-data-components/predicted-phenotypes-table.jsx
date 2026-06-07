import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group, Badge} from '@mantine/core';
import {Maximize2, Pencil} from 'lucide-react';

const PredictedPhenotypesTable = ({records, highlightedSampleIds, onExpandClick, onEditClick}) => {
    return (
        <DataTable
            striped
            highlightOnHover
            records={records}
            idAccessor='phenotype_id'
            rowStyle={(record) => ({
                backgroundColor: highlightedSampleIds?.has(record.sample_id)
                    ? 'rgba(59, 130, 246, 0.2)'
                    : undefined,
                transition: 'background-color 0.3s ease',
            })}
            columns={[
                {
                    accessor: 'phenotype_id',
                    title: 'Phenotype ID',
                    width: 120,
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
                    accessor: 'antibiotic',
                    title: 'Antibiotic',
                    width: 160,
                },
                {
                    accessor: 'resistant',
                    title: 'Resistance Status',
                    width: 140,
                    textAlignment: 'center',
                    render: (record) => (
                        <Badge color={record.resistant ? 'red' : 'green'} variant='light'>
                            {record.resistant ? 'Resistant' : 'Susceptible'}
                        </Badge>
                    ),
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
                                title='Edit phenotype'
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

export default PredictedPhenotypesTable;
