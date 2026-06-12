import {Stack, TextInput, Select, NumberInput, Button, Group, Text} from '@mantine/core';
import {forwardRef, useImperativeHandle, useState} from 'react';

const methods = ['ABRicate', 'BLAST', 'VirulenceFinder', 'Other'];

const emptyGene = () => ({
    gene_symbol: '',
    method: '',
    customMethod: '',
    percent_identity: '',
    coverage_percent: '',
    alignment_length: '',
    target_length: '',
    ref_seq_length: '',
    accession: '',
    sequence_name: '',
    element_type: '',
});

const VirulenceGenesStep = forwardRef(({formData, setFormData, onAddMore, onValidationChange}, ref) => {
    const [geneData, setGeneData] = useState(emptyGene());
    const [touched, setTouched] = useState({});
    const [customMethod, setCustomMethod] = useState('');

    const handleChange = (field, value) => {
        setGeneData((prev) => ({...prev, [field]: value}));
        setTouched((prev) => ({...prev, [field]: true}));
    };

    const effectiveMethod = geneData.method === 'Other' ? customMethod : geneData.method;

    const isValid = geneData.gene_symbol && geneData.gene_symbol.trim() !== '';

    const getEffectiveData = () => ({
        ...geneData,
        method: effectiveMethod,
        customMethod: undefined,
        percent_identity: geneData.percent_identity !== '' ? parseFloat(geneData.percent_identity) : undefined,
        coverage_percent: geneData.coverage_percent !== '' ? parseFloat(geneData.coverage_percent) : undefined,
        alignment_length: geneData.alignment_length !== '' ? parseInt(geneData.alignment_length, 10) : undefined,
        target_length: geneData.target_length !== '' ? parseInt(geneData.target_length, 10) : undefined,
        ref_seq_length: geneData.ref_seq_length !== '' ? parseInt(geneData.ref_seq_length, 10) : undefined,
    });

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!isValid) {
                setTouched({gene_symbol: true});
                if (onValidationChange) onValidationChange(false);
                return false;
            }
            if (onValidationChange) onValidationChange(true);
            return true;
        },
        getData: getEffectiveData,
        reset: () => {
            setGeneData(emptyGene());
            setCustomMethod('');
            setTouched({});
        },
    }));

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Add Virulence Gene</Text>
                <Text size="sm" c="dimmed" mb="md">Enter virulence gene finding information</Text>
            </div>

            <TextInput
                label="Gene Symbol"
                placeholder="e.g., hlyA, stx1, invA"
                value={geneData.gene_symbol}
                onChange={(e) => handleChange('gene_symbol', e.currentTarget.value)}
                error={touched.gene_symbol && !geneData.gene_symbol ? 'Gene symbol is required' : ''}
            />

            <Select
                label="Method"
                placeholder="Select tool/pipeline"
                data={methods}
                value={geneData.method || null}
                onChange={(value) => {
                    handleChange('method', value || '');
                    if (value !== 'Other') setCustomMethod('');
                }}
                searchable
                clearable
            />

            {geneData.method === 'Other' && (
                <TextInput
                    label="Specify method"
                    placeholder="Enter method name"
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.currentTarget.value)}
                    autoFocus
                />
            )}

            <Group grow>
                <NumberInput
                    label="Percent Identity (%)"
                    placeholder="0-100"
                    value={geneData.percent_identity !== '' ? parseFloat(geneData.percent_identity) || '' : ''}
                    onChange={(value) => handleChange('percent_identity', value?.toString() || '')}
                    min={0}
                    max={100}
                    step={0.1}
                />
                <NumberInput
                    label="Coverage (%)"
                    placeholder="0-100"
                    value={geneData.coverage_percent !== '' ? parseFloat(geneData.coverage_percent) || '' : ''}
                    onChange={(value) => handleChange('coverage_percent', value?.toString() || '')}
                    min={0}
                    max={100}
                    step={0.1}
                />
            </Group>

            <Group grow>
                <NumberInput
                    label="Alignment Length"
                    placeholder="e.g., 792"
                    value={geneData.alignment_length !== '' ? parseInt(geneData.alignment_length, 10) || '' : ''}
                    onChange={(value) => handleChange('alignment_length', value?.toString() || '')}
                    min={0}
                />
                <NumberInput
                    label="Target Length"
                    placeholder="e.g., 792"
                    value={geneData.target_length !== '' ? parseInt(geneData.target_length, 10) || '' : ''}
                    onChange={(value) => handleChange('target_length', value?.toString() || '')}
                    min={0}
                />
                <NumberInput
                    label="Reference Sequence Length"
                    placeholder="e.g., 792"
                    value={geneData.ref_seq_length !== '' ? parseInt(geneData.ref_seq_length, 10) || '' : ''}
                    onChange={(value) => handleChange('ref_seq_length', value?.toString() || '')}
                    min={0}
                />
            </Group>

            <TextInput
                label="Sequence Name"
                placeholder="e.g., contig_001"
                value={geneData.sequence_name}
                onChange={(e) => handleChange('sequence_name', e.currentTarget.value)}
            />

            <TextInput
                label="Element Type"
                placeholder="e.g., virulence_factor"
                value={geneData.element_type}
                onChange={(e) => handleChange('element_type', e.currentTarget.value)}
            />

            <TextInput
                label="Accession"
                placeholder="e.g., AF000000"
                value={geneData.accession}
                onChange={(e) => handleChange('accession', e.currentTarget.value)}
            />

            {onAddMore && (
                <Group justify="flex-end" mt="lg">
                    <Button
                        variant="light"
                        onClick={() => {
                            if (isValid) {
                                onAddMore(getEffectiveData());
                                setGeneData(emptyGene());
                                setCustomMethod('');
                                setTouched({});
                            } else {
                                setTouched({gene_symbol: true});
                            }
                        }}
                    >
                        + Add Another Gene
                    </Button>
                </Group>
            )}
        </Stack>
    );
});

VirulenceGenesStep.displayName = 'VirulenceGenesStep';
export default VirulenceGenesStep;
