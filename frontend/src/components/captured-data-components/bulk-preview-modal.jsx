import {Modal, Stack, Title, Divider, Group, Button, Paper, Text, ActionIcon} from '@mantine/core';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useState} from 'react';

function RecordPreview({title, record, columns}) {
    if (!record) return null;
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Title order={5} mb="xs">{title}</Title>
            <Stack gap={4}>
                {columns.map(col => (
                    <Group key={col.accessor} gap={8}>
                        <strong style={{minWidth: 120}}>{col.title}:</strong>
                        <span>{record[col.accessor] ?? ''}</span>
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
        {accessor: 'sequence_name', title: 'Sequence Name'},
        {accessor: 'element_type', title: 'Element Type'},
        {accessor: 'class', title: 'Class'},
        {accessor: 'subclass', title: 'Subclass'},
    ];
    const wgsColumns = [
        {accessor: 'isolateID', title: 'Isolate ID'},
        {accessor: 'organism', title: 'Organism'},
    ];
    const amrGenesColumns = [
        {accessor: 'geneSymbol', title: 'Gene Symbol'},
    ];
    const virulenceGenesColumns = [
        {accessor: 'geneSymbol', title: 'Gene Symbol'},
    ];

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };
    const handleNext = () => {
        if (currentIndex < samples.length - 1) setCurrentIndex(currentIndex + 1);
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
                    <Title order={3}>Sample Preview</Title>
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
                <RecordPreview title="Sample Record" record={currentSample.sample} columns={sampleColumns} />

                {/* Metagenomic records */}
                {currentSample.metagenomic && currentSample.metagenomic.length > 0 && (
                    <>
                        <Divider label="Metagenomic Records" labelPosition="center" my="sm" />
                        {currentSample.metagenomic.map((rec, i) => (
                            <RecordPreview key={i} title={`Metagenomic Record ${i + 1}`} record={rec} columns={metagenomicColumns} />
                        ))}
                    </>
                )}

                {/* WGS records */}
                {currentSample.wgs && currentSample.wgs.length > 0 && (
                    <>
                        <Divider label="WGS Records" labelPosition="center" my="sm" />
                        {currentSample.wgs.map((rec, i) => (
                            <RecordPreview key={i} title={`WGS Record ${i + 1}`} record={rec} columns={wgsColumns} />
                        ))}
                    </>
                )}

                {/* AMR Genes (extracted from metagenomic records) */}
                {currentSample.amrGenes && currentSample.amrGenes.length > 0 && (
                    <>
                        <Divider label="AMR Genes" labelPosition="center" my="sm" />
                        {currentSample.amrGenes.map((gene, i) => (
                            <RecordPreview key={i} title={`AMR Gene ${i + 1}`} record={gene} columns={amrGenesColumns} />
                        ))}
                    </>
                )}

                {/* Virulence Genes (extracted from WGS records) */}
                {currentSample.virulenceGenes && currentSample.virulenceGenes.length > 0 && (
                    <>
                        <Divider label="Virulence Genes" labelPosition="center" my="sm" />
                        {currentSample.virulenceGenes.map((gene, i) => (
                            <RecordPreview key={i} title={`Virulence Gene ${i + 1}`} record={gene} columns={virulenceGenesColumns} />
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