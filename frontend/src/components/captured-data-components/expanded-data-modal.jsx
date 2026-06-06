import {Modal, Stack, Title, Divider, Group, Button, Paper, Badge} from '@mantine/core';

// Utility to render a key-value preview
function RecordPreview({title, record, columns}) {
    if (!record || Object.keys(record).length === 0) return null;
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Title order={5} mb="xs">{title}</Title>
            <Stack gap={4}>
                {columns.map(col => (
                    <Group key={col.accessor} gap={8}>
                        <strong style={{minWidth: 140}}>{col.title}:</strong>
                        <span>
                            {col.accessor === 'resistant' && record[col.accessor] !== undefined ? (
                                <Badge color={record[col.accessor] ? 'red' : 'green'} variant='light' size='sm'>
                                    {record[col.accessor] ? 'Resistant' : 'Susceptible'}
                                </Badge>
                            ) : (
                                record[col.accessor] ?? '-'
                            )}
                        </span>
                    </Group>
                ))}
            </Stack>
        </Paper>
    );
}

export default function ExpandedDataModal({opened, onClose, sample, isolates, phenotypes, amrFindings}) {
    // Table column configs (match DataTable columns)
    const sampleColumns = [
        {accessor: 'sample_id', title: 'Sample ID'},
        {accessor: 'collection_date', title: 'Collection Date'},
        {accessor: 'location_name', title: 'Location'},
        {accessor: 'latitude', title: 'Latitude'},
        {accessor: 'longitude', title: 'Longitude'},
        {accessor: 'isolation_source', title: 'Isolation Source'},
        {accessor: 'water_temp', title: 'Temp (°C)'},
        {accessor: 'ph', title: 'pH'},
        {accessor: 'tds', title: 'TDS'},
        {accessor: 'do', title: 'DO'},
    ];
    const isolateColumns = [
        {accessor: 'isolate_id', title: 'Isolate ID'},
        {accessor: 'sample_id', title: 'Sample ID'},
        {accessor: 'organism', title: 'Organism'},
        {accessor: 'mlst_type', title: 'MLST Type'},
    ];
    const phenotypeColumns = [
        {accessor: 'phenotype_id', title: 'Phenotype ID'},
        {accessor: 'sample_id', title: 'Sample ID'},
        {accessor: 'organism', title: 'Organism'},
        {accessor: 'antibiotic', title: 'Antibiotic'},
        {accessor: 'resistant', title: 'Resistance'},
    ];
    const amrColumns = [
        {accessor: 'finding_id', title: 'Finding ID'},
        {accessor: 'sample_id', title: 'Sample ID'},
        {accessor: 'gene_symbol', title: 'Gene Symbol'},
        {accessor: 'drug_class', title: 'Drug Class'},
        {accessor: 'analysis_type', title: 'Analysis Type'},
        {accessor: 'method', title: 'Method'},
        {accessor: 'percent_identity', title: 'Identity %'},
    ];

    const hasSample = sample && Object.keys(sample).length > 0;
    const hasIsolates = isolates && isolates.length > 0;
    const hasPhenotypes = phenotypes && phenotypes.length > 0;
    const hasAmrFindings = amrFindings && amrFindings.length > 0;

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="90vw"
            centered
            radius="md"
            title={
                <Title order={3}>
                    Sample: {sample?.sample_id || 'Details'}
                </Title>
            }
        >
            <Stack gap="md">
                {hasSample && (
                    <RecordPreview title="Sample Record" record={sample} columns={sampleColumns} />
                )}

                {hasIsolates && (
                    <>
                        {hasSample && <Divider label="Isolate Records" labelPosition="center" my="sm" />}
                        {isolates.map((rec) => (
                            <RecordPreview key={`isolate-${rec.isolate_id}`} title={`Isolate: ${rec.isolate_id}`} record={rec} columns={isolateColumns} />
                        ))}
                    </>
                )}

                {hasPhenotypes && (
                    <>
                        {(hasSample || hasIsolates) && <Divider label="Predicted Phenotype Records" labelPosition="center" my="sm" />}
                        {phenotypes.map((rec) => (
                            <RecordPreview key={`phenotype-${rec.phenotype_id}`} title={`Phenotype: ${rec.phenotype_id}`} record={rec} columns={phenotypeColumns} />
                        ))}
                    </>
                )}

                {hasAmrFindings && (
                    <>
                        {(hasSample || hasIsolates || hasPhenotypes) && <Divider label="AMR Finding Records" labelPosition="center" my="sm" />}
                        {amrFindings.map((rec) => (
                            <RecordPreview key={`amr-${rec.finding_id}`} title={`AMR Finding: ${rec.finding_id}`} record={rec} columns={amrColumns} />
                        ))}
                    </>
                )}

                <Button mt="md" onClick={onClose} variant="outline" color="gray">
                    Close
                </Button>
            </Stack>
        </Modal>
    );
}
