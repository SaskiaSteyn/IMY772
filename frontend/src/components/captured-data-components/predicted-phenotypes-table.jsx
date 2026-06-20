import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group, Badge} from '@mantine/core';
import {Maximize2, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

const PredictedPhenotypesTable = ({records, highlightedSampleIds, onExpandClick, onEditClick, onDeleteClick}) => {
    const [sortStatus, setSortStatus] = useState({columnAccessor: 'phenotype_id', direction: 'asc'});

    const sortedRecords = [...records].sort((a, b) => {
        const col = sortStatus.columnAccessor;
        const aVal = a[col] ?? '';
        const bVal = b[col] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, {numeric: true});
        return sortStatus.direction === 'asc' ? cmp : -cmp;
    });

    return (
        <DataTable
            striped
            highlightOnHover
            records={sortedRecords}
            idAccessor='phenotype_id'
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
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
                    sortable: true,
                },
                {
                    accessor: 'sample_id',
                    title: 'Sample ID',
                    width: 120,
                    textAlignment: 'center',
                    sortable: true,
                },
                {
                    accessor: 'organism',
                    title: 'Organism',
                    width: 200,
                    sortable: true,
                },
                {
                    accessor: 'antibiotic',
                    title: 'Antibiotic',
                    width: 160,
                    sortable: true,
                },
                {
                    accessor: 'predicted_sir_profile',
                    title: 'Resistance Status',
                    width: 140,
                    textAlignment: 'center',
                    render: (record) => {
                        const v = record.predicted_sir_profile;
                        const colorMap = {Resistant: 'red', Intermediate: 'orange', Susceptible: 'green'};
                        return (
                            <Badge color={colorMap[v] || 'gray'} variant='light'>
                                {v || 'Unknown'}
                            </Badge>
                        );
                    },
                },
                {
                    accessor: 'is_manual_override',
                    title: 'Source',
                    width: 120,
                    textAlignment: 'center',
                    render: (record) => (
                        <Badge color={record.is_manual_override ? 'orange' : 'gray'} variant='outline'>
                            {record.is_manual_override ? 'Manual' : 'AI'}
                        </Badge>
                    ),
                },
                {
                    accessor: 'actions',
                    title: '',
                    width: 100,
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
                            <ActionIcon
                                size='sm'
                                variant='subtle'
                                color='red'
                                onClick={() => onDeleteClick(record)}
                                title='Delete phenotype'
                            >
                                <Trash2 size={16} />
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
