import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Pencil, Maximize2, Trash2} from 'lucide-react';
import {useState} from 'react';

const VirulenceGenesTable = ({records, highlightedSampleIds, onEditClick, onExpandClick, onDeleteClick}) => {
    const [sortStatus, setSortStatus] = useState({columnAccessor: 'virulence_gene_id', direction: 'asc'});

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
            idAccessor='virulence_gene_id'
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
                    accessor: 'virulence_gene_id',
                    title: 'ID',
                    width: 80,
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
                    accessor: 'gene_symbol',
                    title: 'Gene Symbol',
                    width: 150,
                    sortable: true,
                },
                {
                    accessor: 'method',
                    title: 'Method',
                    width: 120,
                    sortable: true,
                },
                {
                    accessor: 'percent_identity',
                    title: 'Identity %',
                    width: 110,
                    textAlignment: 'center',
                    render: (record) => {
                        const value = parseFloat(record.percent_identity);
                        return isNaN(value) ? '-' : `${value.toFixed(1)}%`;
                    },
                },
                {
                    accessor: 'coverage_percent',
                    title: 'Coverage %',
                    width: 110,
                    textAlignment: 'center',
                    render: (record) => {
                        const value = parseFloat(record.coverage_percent);
                        return isNaN(value) ? '-' : `${value.toFixed(1)}%`;
                    },
                },
                {
                    accessor: 'element_type',
                    title: 'Element Type',
                    width: 130,
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
                            <ActionIcon
                                size='sm'
                                variant='subtle'
                                color='red'
                                onClick={() => onDeleteClick(record)}
                                title='Delete record'
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

export default VirulenceGenesTable;
