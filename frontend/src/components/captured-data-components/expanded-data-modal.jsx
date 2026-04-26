import {Modal, Stack, Title, Divider, Group, Button, Paper} from '@mantine/core';

// Utility to render a key-value preview
function RecordPreview({title, record, columns}) {
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Title order={5} mb="xs">{title}</Title>
            <Stack gap={4}>
                {columns.map(col => (
                    <Group key={col.accessor} gap={8}>
                        <strong style={{minWidth: 120}}>{col.title}:</strong>
                        <span>{record[col.accessor]}</span>
                    </Group>
                ))}
            </Stack>
        </Paper>
    );
}

export default function ExpandedDataModal({opened, onClose, sample, metagenomic, wgs, amrGenes, virulenceGenes}) {
    // Table column configs (match DataTable columns)
    const sampleColumns = [
        {accessor: 'sampleID', title: 'Sample ID'},
        {accessor: 'water_temperature', title: 'Temp (°C)'},
        {accessor: 'ph', title: 'pH'},
        {accessor: 'tds', title: 'TDS'},
        {accessor: 'do', title: 'DO'},
        {accessor: 'sample_analysis_type', title: 'Analysis Type'},
        {accessor: 'location_name', title: 'Location'},
        {accessor: 'collected_by', title: 'Collected By'},
    ];
    const metagenomicColumns = [
        {accessor: 'sampleID', title: 'Sample ID'},
        {accessor: 'sequence_name', title: 'Sequence Name'},
        {accessor: 'element_type', title: 'Element Type'},
        {accessor: 'class', title: 'Class'},
        {accessor: 'subclass', title: 'Subclass'},
    ];
    const wgsColumns = [
        {accessor: 'sampleID', title: 'Sample ID'},
        {accessor: 'isolateID', title: 'Isolate ID'},
        {accessor: 'organism', title: 'Organism'},
    ];
    const amrGenesColumns = [
        {accessor: 'sampleID', title: 'Sample ID'},
        {accessor: 'geneSymbol', title: 'Gene Symbol'},
    ];
    const virulenceGenesColumns = [
        {accessor: 'wgs.sampleID', title: 'Sample ID'},
        {accessor: 'wgs.isolateID', title: 'Isolate ID'},
        {accessor: 'geneSymbol', title: 'Gene Symbol'},
    ];

    return (
        <Modal opened={opened} onClose={onClose} size="90vw" centered radius="md" title={<Title order={3}>Sample {sample?.sampleID || 'Preview'}</Title>}>
            <Stack gap="md">
                <RecordPreview title="Sample Record" record={sample} columns={sampleColumns} />
                {metagenomic && metagenomic.length > 0 && (
                    <>
                        <Divider label="Metagenomic Records" labelPosition="center" my="sm" />
                        {metagenomic.map((rec, i) => (
                            <RecordPreview key={i} title={`Metagenomic Record ${i + 1}`} record={rec} columns={metagenomicColumns} />
                        ))}
                    </>
                )}
                {wgs && wgs.length > 0 && (
                    <>
                        <Divider label="WGS Records" labelPosition="center" my="sm" />
                        {wgs.map((rec, i) => (
                            <RecordPreview key={i} title={`WGS Record ${i + 1}`} record={rec} columns={wgsColumns} />
                        ))}
                    </>
                )}
                {amrGenes && amrGenes.length > 0 && (
                    <>
                        <Divider label="AMR Genes" labelPosition="center" my="sm" />
                        {amrGenes.map((rec, i) => (
                            <RecordPreview key={i} title={`AMR Gene ${i + 1}`} record={rec} columns={amrGenesColumns} />
                        ))}
                    </>
                )}
                {virulenceGenes && virulenceGenes.length > 0 && (
                    <>
                        <Divider label="Virulence Genes" labelPosition="center" my="sm" />
                        {virulenceGenes.map((rec, i) => (
                            <RecordPreview key={i} title={`Virulence Gene ${i + 1}`} record={rec} columns={virulenceGenesColumns} />
                        ))}
                    </>
                )}
                <Button mt="md" onClick={onClose} variant="outline" color="gray">Close</Button>
            </Stack>
        </Modal>
    );
}
