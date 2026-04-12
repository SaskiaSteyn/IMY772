import { DataTable } from 'mantine-datatable';

const SamplesTable = ({ records, highlightedSampleIds }) => {
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
                    accessor: 'water_temperature',
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
                    accessor: 'sample_analysis_type',
                    title: 'Analysis Type',
                    width: 140,
                },
                { accessor: 'location_name', title: 'Location' },
                { accessor: 'collected_by', title: 'Collected By', width: 140 },
            ]}
            noRecordsText=''
            noRecordsIcon={<></>}
            minHeight={300}
            styles={{
                emptyState: { display: 'none' },
            }}
        />
    );
};

export default SamplesTable;
