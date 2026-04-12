import {DataTable} from 'mantine-datatable';

const WGSTable = ({records}) => {
    return (
        <DataTable
            withTableBorder
            withColumnBorders
            records={records}
            idAccessor="sampleID"
            columns={[
                {accessor: 'sampleID', title: 'Sample ID'},
                {accessor: 'water_temperature', title: 'Temp (°C)'},
                {accessor: 'ph', title: 'pH'},
                {accessor: 'sample_analysis_type', title: 'Analysis Type'},
                {accessor: 'location_name', title: 'Location'},
            ]}
        />
    );
};

export default WGSTable;