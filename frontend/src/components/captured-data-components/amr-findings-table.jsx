import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Maximize2, Pencil, Trash2} from 'lucide-react';
import {useState} from 'react';

const AmrFindingsTable = ({records, highlightedSampleIds, onExpandClick, onEditClick, onDeleteClick}) => {
    const [sortStatus, setSortStatus] = useState({columnAccessor: 'finding_id', direction: 'asc'});

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
            idAccessor='finding_id'
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
                    accessor: 'finding_id',
                    title: 'Finding ID',
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
                    accessor: 'gene_symbol',
                    title: 'Gene Symbol',
                    width: 140,
                    sortable: true,
                },
                {
                    accessor: 'amr_class',
                    title: 'AMR Class',
                    width: 150,
                    sortable: true,
                },
                {
                    accessor: 'analysis_type',
                    title: 'Analysis Type',
                    width: 140,
                },
                {
                    accessor: 'method',
                    title: 'Method',
                    width: 120,
                    textAlignment: 'center',
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
                    accessor: 'sequence_name',
                    title: 'Sequence Name',
                    width: 160,
                },
                {
                    accessor: 'element_type',
                    title: 'Element Type',
                    width: 130,
                },
                {
                    accessor: 'subclass',
                    title: 'Subclass',
                    width: 120,
                },
                {
                    accessor: 'percentage_coverage',
                    title: 'Coverage %',
                    width: 110,
                    textAlignment: 'center',
                    render: (record) => {
                        const value = parseFloat(record.percentage_coverage);
                        return isNaN(value) ? '-' : `${value.toFixed(1)}%`;
                    },
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
                                title='Edit finding'
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
                                title='Delete finding'
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

export default AmrFindingsTable;
