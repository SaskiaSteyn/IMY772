import {Stack, TextInput, Select, NumberInput, Button, Group, Text} from '@mantine/core';
import {forwardRef, useImperativeHandle, useState} from 'react';

const AmrFindingFormStep = forwardRef(({formData, setFormData, onAddMore, onValidationChange}, ref) => {
    const [findingData, setFindingData] = useState({
        finding_id: '',
        gene_symbol: '',
        drug_class: '',
        analysis_type: 'WGS',
        method: '',
        percent_identity: '',
    });
    const [touched, setTouched] = useState({});
    const [customMethod, setCustomMethod] = useState('');

    const analysisTypes = ['WGS', 'Metagenomic'];
    const methods = ['BLAST', 'ResFinder', 'ARG-ANNOT', 'CARD', 'AMRFinder', 'Other'];

    const handleChange = (field, value) => {
        setFindingData((prev) => ({...prev, [field]: value}));
        setTouched((prev) => ({...prev, [field]: true}));
    };

    const effectiveMethod = findingData.method === 'Other' ? customMethod : findingData.method;

    const isValid =
        findingData.gene_symbol &&
        findingData.drug_class &&
        effectiveMethod.trim() !== '' &&
        findingData.percent_identity !== '';

    const getEffectiveData = () => ({
        ...findingData,
        method: effectiveMethod,
        percent_identity: parseFloat(findingData.percent_identity) || 0,
    });

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!isValid) {
                setTouched({
                    gene_symbol: true,
                    drug_class: true,
                    method: true,
                    percent_identity: true,
                });
                if (onValidationChange) onValidationChange(false);
                return false;
            }
            if (onValidationChange) onValidationChange(true);
            return true;
        },
        getData: getEffectiveData,
        reset: () => {
            setFindingData({
                finding_id: '',
                gene_symbol: '',
                drug_class: '',
                analysis_type: 'WGS',
                method: '',
                percent_identity: '',
            });
            setCustomMethod('');
            setTouched({});
        },
    }));

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Add AMR Finding</Text>
                <Text size="sm" c="dimmed" mb="md">Enter antibiotic resistance gene finding information</Text>
            </div>

            <TextInput
                label="Gene Symbol"
                placeholder="e.g., blaTEM, tetA, aac(3)-II"
                value={findingData.gene_symbol}
                onChange={(e) => handleChange('gene_symbol', e.currentTarget.value)}
                error={touched.gene_symbol && !findingData.gene_symbol ? 'Gene symbol is required' : ''}
            />

            <TextInput
                label="Drug Class"
                placeholder="e.g., Beta-lactams, Tetracyclines, Aminoglycosides"
                value={findingData.drug_class}
                onChange={(e) => handleChange('drug_class', e.currentTarget.value)}
                error={touched.drug_class && !findingData.drug_class ? 'Drug class is required' : ''}
            />

            <Select
                label="Analysis Type"
                data={analysisTypes}
                value={findingData.analysis_type}
                onChange={(value) => handleChange('analysis_type', value || 'WGS')}
                searchable
            />

            <Select
                label="Method"
                placeholder="Select detection method"
                data={methods}
                value={findingData.method}
                onChange={(value) => {
                    handleChange('method', value || '');
                    if (value !== 'Other') setCustomMethod('');
                }}
                error={touched.method && !effectiveMethod ? 'Method is required' : ''}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create "${query}"`}
            />

            {findingData.method === 'Other' && (
                <TextInput
                    label="Specify method"
                    placeholder="Enter method name"
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.currentTarget.value)}
                    error={touched.method && !customMethod.trim() ? 'Please specify the method' : ''}
                    autoFocus
                />
            )}

            <NumberInput
                label="Percent Identity (%)"
                placeholder="0-100"
                value={findingData.percent_identity ? parseFloat(findingData.percent_identity) : ''}
                onChange={(value) => handleChange('percent_identity', value?.toString() || '')}
                error={touched.percent_identity && !findingData.percent_identity ? 'Percent identity is required' : ''}
                min={0}
                max={100}
                step={0.1}
            />

            {onAddMore && (
                <Group justify="flex-end" mt="lg">
                    <Button
                        variant="light"
                        onClick={() => {
                            if (isValid) {
                                onAddMore(getEffectiveData());
                                setFindingData({
                                    finding_id: '',
                                    gene_symbol: '',
                                    drug_class: '',
                                    analysis_type: 'WGS',
                                    method: '',
                                    percent_identity: '',
                                });
                                setCustomMethod('');
                                setTouched({});
                            } else {
                                setTouched({
                                    gene_symbol: true,
                                    drug_class: true,
                                    method: true,
                                    percent_identity: true,
                                });
                            }
                        }}
                    >
                        + Add Another Finding
                    </Button>
                </Group>
            )}
        </Stack>
    );
});

AmrFindingFormStep.displayName = 'AmrFindingFormStep';
export default AmrFindingFormStep;
