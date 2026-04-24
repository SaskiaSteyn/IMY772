import {DataTable} from 'mantine-datatable';
import {ActionIcon, Group} from '@mantine/core';
import {Pencil} from 'lucide-react';

const VirulenceGenesTable = ({records, highlightedSampleIds, onEditClick}) => {
    return (
        <DataTable
            striped
            highlightOnHover
            records={records}
            idAccessor='geneID'
            rowSx={(record) => ({
                backgroundColor: highlightedSampleIds?.has(record.wgs?.sampleID)
                    ? 'rgba(59, 130, 246, 0.2)'
                    : undefined,
                transition: 'background-color 0.3s ease',
            })}
            columns={[
                {
                    accessor: 'wgs.sampleID',
                    title: 'Sample ID',
                    width: 100,
                    textAlignment: 'center',
                },
                {
                    accessor: 'wgs.isolateID',
                    title: 'Isolate ID',
                    width: 100,
                    textAlignment: 'center',
                },
                {
                    accessor: 'geneSymbol',
                    title: 'Gene Symbol',
                    width: 150,
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

export default VirulenceGenesTable;
