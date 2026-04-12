export const measurementsFields = [
    { key: 'water_temperature', label: 'Water Temperature', type: 'number' },
    { key: 'ph', label: 'pH', type: 'number' },
    { key: 'tds', label: 'TDS', type: 'number' },
    { key: 'do', label: 'DO', type: 'number' },
    {
        key: 'sample_analysis_type',
        label: 'Sample Analysis Type',
        type: 'text',
    },
    { key: 'isolation_source', label: 'Isolation Source', type: 'text' },
    { key: 'collection_date', label: 'Collection Date', type: 'date' },
    { key: 'location_name', label: 'Location Name', type: 'text' },
    { key: 'latitude', label: 'Latitude', type: 'number', required: true },
    { key: 'longitude', label: 'Longitude', type: 'number', required: true },
    { key: 'collected_by', label: 'Collected By', type: 'text' },
    {
        key: 'predicted_sir_profile',
        label: 'Predicted SIR Profile',
        type: 'text',
    },
]

export const metagenomicFields = [
    { key: 'sampleID', label: 'Sample ID', type: 'integer', required: true },
    {
        key: 'sequence_name',
        label: 'Sequence Name',
        type: 'text',
        required: true,
    },
    { key: 'element_type', label: 'Element Type', type: 'text' },
    { key: 'class', label: 'Class', type: 'text' },
    { key: 'subclass', label: 'Subclass', type: 'text' },
]

export const wgsFields = [
    { key: 'sampleID', label: 'Sample ID', type: 'integer', required: true },
    { key: 'isolateID', label: 'Isolate ID', type: 'integer', required: true },
    { key: 'organism', label: 'Organism', type: 'text' },
]

export const amrResistanceGenesFields = [
    { key: 'sampleID', label: 'Sample ID', type: 'integer', required: true },
    { key: 'geneSymbol', label: 'Gene Symbol', type: 'text', required: true },
]

export const virulenceGenesFields = [
    { key: 'sampleID', label: 'Sample ID', type: 'integer', required: true },
    { key: 'isolateID', label: 'Isolate ID', type: 'integer', required: true },
    { key: 'geneSymbol', label: 'Gene Symbol', type: 'text', required: true },
]
