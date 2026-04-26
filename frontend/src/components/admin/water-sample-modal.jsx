import {
    Alert,
    Button,
    Divider,
    Group,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Textarea,
    Title,
} from '@mantine/core';
import { useMemo, useState } from 'react';

const initialSampleForm = {
    water_temperature: '',
    ph: '',
    tds: '',
    do: '',
    sample_analysis_type: '',
    isolation_source: '',
    collection_date: '',
    location_name: '',
    latitude: '',
    longitude: '',
    collected_by: '',
    predicted_sir_profile: '',
};

const emptyMetagenomicRecord = {
    sequence_name: '',
    element_type: '',
    class: '',
    subclass: '',
};

const emptyWgsRecord = {
    isolateID: '',
    organism: '',
    virulenceGenesText: '',
};

function mapSampleToForm(sample) {
    if (!sample) {
        return initialSampleForm;
    }

    return {
        water_temperature: sample.water_temperature ?? '',
        ph: sample.ph ?? '',
        tds: sample.tds ?? '',
        do: sample.do ?? '',
        sample_analysis_type: sample.sample_analysis_type ?? '',
        isolation_source: sample.isolation_source ?? '',
        collection_date: sample.collection_date
            ? String(sample.collection_date).slice(0, 10)
            : '',
        location_name: sample.location_name ?? '',
        latitude: sample.latitude ?? '',
        longitude: sample.longitude ?? '',
        collected_by: sample.collected_by ?? '',
        predicted_sir_profile: sample.predicted_sir_profile ?? '',
    };
}

function buildSamplePayload(sampleForm) {
    const toNumberOrNull = (value) => {
        if (value === '' || value === null || value === undefined) {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    return {
        water_temperature: toNumberOrNull(sampleForm.water_temperature),
        ph: toNumberOrNull(sampleForm.ph),
        tds: toNumberOrNull(sampleForm.tds),
        do: toNumberOrNull(sampleForm.do),
        sample_analysis_type: sampleForm.sample_analysis_type || null,
        isolation_source: sampleForm.isolation_source || null,
        collection_date: sampleForm.collection_date || null,
        location_name: sampleForm.location_name || null,
        latitude: toNumberOrNull(sampleForm.latitude),
        longitude: toNumberOrNull(sampleForm.longitude),
        collected_by: sampleForm.collected_by || null,
        predicted_sir_profile: sampleForm.predicted_sir_profile || null,
    };
}

export default function WaterSampleModal({
    opened,
    onClose,
    onSubmit,
    loading = false,
    mode = 'create',
    initialData = null,
}) {
    const [sampleForm, setSampleForm] = useState(() =>
        mapSampleToForm(initialData),
    );
    const [metagenomicRecords, setMetagenomicRecords] = useState(() => [
        emptyMetagenomicRecord,
    ]);
    const [wgsRecords, setWgsRecords] = useState(() => [emptyWgsRecord]);
    const [amrGenesText, setAmrGenesText] = useState('');
    const [error, setError] = useState('');

    const isEditing = mode === 'edit';

    const modalTitle = isEditing ? 'Edit Water Sample' : 'Create Water Sample';

    const analysisType = useMemo(
        () => String(sampleForm.sample_analysis_type || '').toLowerCase(),
        [sampleForm.sample_analysis_type],
    );

    function updateSampleField(key, value) {
        setSampleForm((prev) => ({ ...prev, [key]: value }));
    }

    function updateMetagenomic(index, key, value) {
        setMetagenomicRecords((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    }

    function addMetagenomicRecord() {
        setMetagenomicRecords((prev) => [...prev, emptyMetagenomicRecord]);
    }

    function removeMetagenomicRecord(index) {
        setMetagenomicRecords((prev) => prev.filter((_, i) => i !== index));
    }

    function updateWgs(index, key, value) {
        setWgsRecords((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    }

    function addWgsRecord() {
        setWgsRecords((prev) => [...prev, emptyWgsRecord]);
    }

    function removeWgsRecord(index) {
        setWgsRecords((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (sampleForm.latitude === '' || sampleForm.longitude === '') {
            setError('Latitude and longitude are required.');
            return;
        }

        const payload = buildSamplePayload(sampleForm);

        if (!isEditing) {
            if (analysisType === 'metagenomic') {
                payload.metagenomic = metagenomicRecords
                    .map((record) => ({
                        sequence_name: String(
                            record.sequence_name || '',
                        ).trim(),
                        element_type: String(record.element_type || '').trim(),
                        class: String(record.class || '').trim(),
                        subclass: String(record.subclass || '').trim(),
                    }))
                    .filter((record) => record.sequence_name);

                payload.amrResistanceGenes = amrGenesText
                    .split(',')
                    .map((gene) => gene.trim())
                    .filter(Boolean);
            }

            if (analysisType === 'wgs') {
                payload.wgs = wgsRecords
                    .map((record) => ({
                        isolateID:
                            record.isolateID === '' ||
                            record.isolateID === null ||
                            record.isolateID === undefined
                                ? null
                                : Number(record.isolateID),
                        organism: String(record.organism || '').trim() || null,
                        virulenceGenes: String(record.virulenceGenesText || '')
                            .split(',')
                            .map((gene) => gene.trim())
                            .filter(Boolean),
                    }))
                    .filter((record) => Number.isInteger(record.isolateID));
            }
        }

        try {
            setError('');
            await onSubmit(payload);
        } catch (submitError) {
            setError(submitError.message || 'Failed to save water sample.');
        }
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Title order={2} fw={800} lh={1.15}>
                    {modalTitle}
                </Title>
            }
            centered
            size='xl'
            radius='md'
        >
            <form onSubmit={handleSubmit}>
                <Stack gap='md'>
                    {error && (
                        <Alert color='red' variant='light'>
                            {error}
                        </Alert>
                    )}

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='sm'>
                        <TextInput
                            label='Location'
                            value={sampleForm.location_name}
                            onChange={(event) =>
                                updateSampleField(
                                    'location_name',
                                    event.currentTarget.value,
                                )
                            }
                        />
                        <TextInput
                            label='Collected By'
                            value={sampleForm.collected_by}
                            onChange={(event) =>
                                updateSampleField(
                                    'collected_by',
                                    event.currentTarget.value,
                                )
                            }
                        />
                        <TextInput
                            label='Collection Date'
                            type='date'
                            value={sampleForm.collection_date}
                            onChange={(event) =>
                                updateSampleField(
                                    'collection_date',
                                    event.currentTarget.value,
                                )
                            }
                        />
                        <Select
                            label='Analysis Type'
                            data={[
                                { value: 'Metagenomic', label: 'Metagenomic' },
                                { value: 'WGS', label: 'WGS' },
                            ]}
                            value={sampleForm.sample_analysis_type || null}
                            onChange={(value) =>
                                updateSampleField(
                                    'sample_analysis_type',
                                    value || '',
                                )
                            }
                            allowDeselect
                        />
                        <TextInput
                            label='Isolation Source'
                            value={sampleForm.isolation_source}
                            onChange={(event) =>
                                updateSampleField(
                                    'isolation_source',
                                    event.currentTarget.value,
                                )
                            }
                        />
                        <TextInput
                            label='Predicted SIR Profile'
                            value={sampleForm.predicted_sir_profile}
                            onChange={(event) =>
                                updateSampleField(
                                    'predicted_sir_profile',
                                    event.currentTarget.value,
                                )
                            }
                        />
                        <NumberInput
                            label='Latitude'
                            value={sampleForm.latitude}
                            onChange={(value) =>
                                updateSampleField('latitude', value)
                            }
                            required
                            decimalScale={8}
                        />
                        <NumberInput
                            label='Longitude'
                            value={sampleForm.longitude}
                            onChange={(value) =>
                                updateSampleField('longitude', value)
                            }
                            required
                            decimalScale={8}
                        />
                        <NumberInput
                            label='Temperature'
                            value={sampleForm.water_temperature}
                            onChange={(value) =>
                                updateSampleField('water_temperature', value)
                            }
                            decimalScale={2}
                        />
                        <NumberInput
                            label='pH'
                            value={sampleForm.ph}
                            onChange={(value) => updateSampleField('ph', value)}
                            decimalScale={2}
                        />
                        <NumberInput
                            label='TDS'
                            value={sampleForm.tds}
                            onChange={(value) =>
                                updateSampleField('tds', value)
                            }
                            decimalScale={2}
                        />
                        <NumberInput
                            label='DO'
                            value={sampleForm.do}
                            onChange={(value) => updateSampleField('do', value)}
                            decimalScale={2}
                        />
                    </SimpleGrid>

                    {!isEditing && analysisType === 'metagenomic' && (
                        <>
                            <Divider />
                            <Group justify='flex-end'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    color='gray'
                                    onClick={addMetagenomicRecord}
                                >
                                    Add Record
                                </Button>
                            </Group>
                            {metagenomicRecords.map((record, index) => (
                                <Stack key={`meta-${index}`} gap='xs'>
                                    <SimpleGrid
                                        cols={{ base: 1, sm: 2 }}
                                        spacing='sm'
                                    >
                                        <TextInput
                                            label='Sequence Name'
                                            value={record.sequence_name}
                                            onChange={(event) =>
                                                updateMetagenomic(
                                                    index,
                                                    'sequence_name',
                                                    event.currentTarget.value,
                                                )
                                            }
                                        />
                                        <TextInput
                                            label='Element Type'
                                            value={record.element_type}
                                            onChange={(event) =>
                                                updateMetagenomic(
                                                    index,
                                                    'element_type',
                                                    event.currentTarget.value,
                                                )
                                            }
                                        />
                                        <TextInput
                                            label='Class'
                                            value={record.class}
                                            onChange={(event) =>
                                                updateMetagenomic(
                                                    index,
                                                    'class',
                                                    event.currentTarget.value,
                                                )
                                            }
                                        />
                                        <TextInput
                                            label='Subclass'
                                            value={record.subclass}
                                            onChange={(event) =>
                                                updateMetagenomic(
                                                    index,
                                                    'subclass',
                                                    event.currentTarget.value,
                                                )
                                            }
                                        />
                                    </SimpleGrid>
                                    {metagenomicRecords.length > 1 && (
                                        <Group justify='flex-end'>
                                            <Button
                                                type='button'
                                                color='red'
                                                variant='subtle'
                                                onClick={() =>
                                                    removeMetagenomicRecord(
                                                        index,
                                                    )
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </Group>
                                    )}
                                </Stack>
                            ))}
                            <Textarea
                                label='AMR Resistance Genes (comma-separated)'
                                placeholder='geneA, geneB, geneC'
                                value={amrGenesText}
                                onChange={(event) =>
                                    setAmrGenesText(event.currentTarget.value)
                                }
                                minRows={2}
                                autosize
                            />
                        </>
                    )}

                    {!isEditing && analysisType === 'wgs' && (
                        <>
                            <Divider />
                            <Group justify='flex-end'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    color='gray'
                                    onClick={addWgsRecord}
                                >
                                    Add Record
                                </Button>
                            </Group>
                            {wgsRecords.map((record, index) => (
                                <Stack key={`wgs-${index}`} gap='xs'>
                                    <SimpleGrid
                                        cols={{ base: 1, sm: 2 }}
                                        spacing='sm'
                                    >
                                        <NumberInput
                                            label='Isolate ID'
                                            value={record.isolateID}
                                            onChange={(value) =>
                                                updateWgs(
                                                    index,
                                                    'isolateID',
                                                    value,
                                                )
                                            }
                                            allowDecimal={false}
                                        />
                                        <TextInput
                                            label='Organism'
                                            value={record.organism}
                                            onChange={(event) =>
                                                updateWgs(
                                                    index,
                                                    'organism',
                                                    event.currentTarget.value,
                                                )
                                            }
                                        />
                                    </SimpleGrid>
                                    <Textarea
                                        label='Virulence Genes (comma-separated)'
                                        placeholder='geneX, geneY'
                                        value={record.virulenceGenesText}
                                        onChange={(event) =>
                                            updateWgs(
                                                index,
                                                'virulenceGenesText',
                                                event.currentTarget.value,
                                            )
                                        }
                                        minRows={2}
                                        autosize
                                    />
                                    {wgsRecords.length > 1 && (
                                        <Group justify='flex-end'>
                                            <Button
                                                type='button'
                                                color='red'
                                                variant='subtle'
                                                onClick={() =>
                                                    removeWgsRecord(index)
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </Group>
                                    )}
                                </Stack>
                            ))}
                        </>
                    )}

                    {!isEditing && !analysisType && (
                        <Text size='sm' c='dimmed'>
                            Select an analysis type to add optional child
                            records.
                        </Text>
                    )}

                    <Group justify='flex-end' mt='sm'>
                        <Button
                            type='button'
                            variant='outline'
                            color='themeColors.6'
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='submit'
                            color='themeColors.6'
                            loading={loading}
                        >
                            {isEditing ? 'Save Changes' : 'Create Sample'}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}
