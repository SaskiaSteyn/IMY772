import {DataTable} from 'mantine-datatable';

const AMRGenesTable = ({records}) => {

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
                // ... add actions (edit, delete icons)
            ]}
        // sorting, pagination, etc.
        />
    );
};

export default AMRGenesTable;