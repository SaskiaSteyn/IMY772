import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Maximize2, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

const IsolatesTable = ({records, highlightedSampleIds, onExpandClick, onEditClick, onDeleteClick}) => {
    const [sortStatus, setSortStatus] = useState({columnAccessor: 'isolate_id', direction: 'asc'});

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
            idAccessor='isolate_id'
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
                    accessor: 'isolate_id',
                    title: 'Isolate ID',
                    width: 100,
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
                    accessor: 'mlst_type',
                    title: 'MLST Type',
                    width: 120,
                    textAlignment: 'center',
                    sortable: true,
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
                            <ActionIcon
                                size='sm'
                                variant='subtle'
                                color='red'
                                onClick={() => onDeleteClick(record)}
                                title='Delete isolate'
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

export default IsolatesTable;
