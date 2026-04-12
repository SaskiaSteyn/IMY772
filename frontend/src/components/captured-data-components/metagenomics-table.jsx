import { DataTable } from 'mantine-datatable';

const MetagenomicsTable = ({ records }) => {
    return (
        <DataTable
            striped
            highlightOnHover
            records={records}
            idAccessor='sampleID'
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
                    accessor: 'sample_analysis_type',
                    title: 'Analysis Type',
                    width: 140,
                },
                { accessor: 'location_name', title: 'Location' },
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

export default MetagenomicsTable;
