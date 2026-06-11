import {Modal, Stack, Title, Divider, Group, Button, Paper, Text, ActionIcon, Badge} from '@mantine/core';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';

function RecordPreview({title, record, columns}) {
    if (!record || Object.keys(record).length === 0) return null;
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Title order={5} mb="xs">{title}</Title>
            <Stack gap={4}>
                {columns.map(col => (
                    <Group key={col.accessor} gap={8}>
                        <strong style={{minWidth: 120}}>{col.title}:</strong>
                        <span>
                            {col.accessor === 'resistant' && record[col.accessor] !== undefined ? (
                                <Badge color={record[col.accessor] ? 'red' : 'green'} variant='light' size='sm'>
                                    {record[col.accessor] ? 'Resistant' : 'Susceptible'}
                                </Badge>
                            ) : record[col.accessor] === 'true' ? (
                                <Badge color='red' variant='light' size='sm'>true</Badge>
                            ) : record[col.accessor] === 'false' ? (
                                <Badge color='green' variant='light' size='sm'>false</Badge>
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

export default function BulkPreviewModal({opened, onClose, samples}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentSample = samples[currentIndex];

    if (!currentSample) return null;

    const sampleColumns = [
        {accessor: 'sample_id', title: 'Sample ID'},
        {accessor: 'collection_date', title: 'Collection Date'},
        {accessor: 'location_name', title: 'Location'},
        {accessor: 'latitude', title: 'Latitude'},
        {accessor: 'longitude', title: 'Longitude'},
        {accessor: 'isolation_source', title: 'Source'},
        {accessor: 'water_temperature', title: 'Temp (°C)'},
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

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };
    const handleNext = () => {
        if (currentIndex < samples.length - 1) setCurrentIndex(currentIndex + 1);
    };

    // Determine what content we have
    const hasSample = currentSample.sample && Object.keys(currentSample.sample).length > 0;
    const hasIsolates = currentSample.isolates && currentSample.isolates.length > 0;
    const hasPhenotypes = currentSample.phenotypes && currentSample.phenotypes.length > 0;
    const hasAmrFindings = currentSample.amrFindings && currentSample.amrFindings.length > 0;

    // Build title based on what data we have
    const getTitle = () => {
        if (hasSample) return `Sample: ${currentSample.sample.sample_id || 'Record'}`;
        if (hasIsolates) return `Isolate: ${currentSample.isolates[0].isolate_id || 'Record'}`;
        if (hasPhenotypes) return `Phenotype: ${currentSample.phenotypes[0].phenotype_id || 'Record'}`;
        if (hasAmrFindings) return `AMR Finding: ${currentSample.amrFindings[0].finding_id || 'Record'}`;
        return 'Record';
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="90vw"
            centered
            radius="md"
            title={
                <Group justify="space-between" style={{width: '100%'}}>
                    <Title order={3}>Data Preview</Title>
                    <Text size="sm" c="dimmed">
                        {currentIndex + 1} of {samples.length}
                    </Text>
                </Group>
            }
        >
            <Stack gap="md">
                {/* Navigation buttons */}
                <Group justify="center" gap="sm">
                    <ActionIcon
                        variant="outline"
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        size="lg"
                    >
                        <ChevronLeft size={20} />
                    </ActionIcon>
                    <Text size="sm" weight={500}>{getTitle()}</Text>
                    <ActionIcon
                        variant="outline"
                        onClick={handleNext}
                        disabled={currentIndex === samples.length - 1}
                        size="lg"
                    >
                        <ChevronRight size={20} />
                    </ActionIcon>
                </Group>

                {/* Sample record */}
                {hasSample && (
                    <RecordPreview title="Sample Record" record={currentSample.sample} columns={sampleColumns} />
                )}

                {/* Isolate records */}
                {hasIsolates && (
                    <>
                        {hasSample && <Divider label="Isolate Records" labelPosition="center" my="sm" />}
                        {currentSample.isolates.map((rec) => (
                            <RecordPreview key={`isolate-${rec.isolate_id}`} title={`Isolate: ${rec.isolate_id}`} record={rec} columns={isolateColumns} />
                        ))}
                    </>
                )}

                {/* Phenotype records */}
                {hasPhenotypes && (
                    <>
                        {(hasSample || hasIsolates) && <Divider label="Phenotype Records" labelPosition="center" my="sm" />}
                        {currentSample.phenotypes.map((rec) => (
                            <RecordPreview key={`phenotype-${rec.phenotype_id}`} title={`Phenotype: ${rec.phenotype_id}`} record={rec} columns={phenotypeColumns} />
                        ))}
                    </>
                )}

                {/* AMR Finding records */}
                {hasAmrFindings && (
                    <>
                        {(hasSample || hasIsolates || hasPhenotypes) && <Divider label="AMR Finding Records" labelPosition="center" my="sm" />}
                        {currentSample.amrFindings.map((rec) => (
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