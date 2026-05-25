import {
    Button,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {ArrowLeft, Check} from 'lucide-react';
import {useEffect, useState} from 'react';

const EditAmrFindingModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        gene_symbol: '',
        drug_class: '',
        analysis_type: 'WGS',
        method: '',
        percent_identity: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const analysisTypes = ['WGS', 'Metagenomic'];
    const methods = ['BLAST', 'ResFinder', 'ARG-ANNOT', 'CARD', 'AMRFinder', 'Other'];

    useEffect(() => {
        if (record && opened) {
            setFormData({
                gene_symbol: record.gene_symbol ?? '',
                drug_class: record.drug_class ?? '',
                analysis_type: record.analysis_type ?? 'WGS',
                method: record.method ?? '',
                percent_identity: record.percent_identity ?? '',
            });
            setError('');
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        if (!formData.gene_symbol || !formData.drug_class || !formData.method) {
            setError('Gene symbol, drug class, and method are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updateData = {
                gene_symbol: formData.gene_symbol,
                drug_class: formData.drug_class,
                analysis_type: formData.analysis_type,
                method: formData.method,
            };
            if (formData.percent_identity !== '') {
                updateData.percent_identity = parseFloat(formData.percent_identity);
            }

            await onSave(record.finding_id, updateData);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save AMR finding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Edit AMR Finding"
            size="md"
            centered
            radius="md"
        >
            <Stack gap="md">
                <div>
                    <Text fw={600} mb="xs">Finding ID: {record?.finding_id}</Text>
                    <Text size="sm" c="dimmed">Update AMR finding information</Text>
                </div>

                {error && (
                    <div style={{color: 'red', padding: '8px', backgroundColor: '#ffe0e0', borderRadius: '4px'}}>
                        {error}
                    </div>
                )}

                <TextInput
                    label="Gene Symbol"
                    placeholder="e.g., blaTEM, tetA, aac(3)-II"
                    value={formData.gene_symbol}
                    onChange={(e) => setFormData({...formData, gene_symbol: e.currentTarget.value})}
                />

                <TextInput
                    label="Drug Class"
                    placeholder="e.g., Beta-lactams, Tetracyclines"
                    value={formData.drug_class}
                    onChange={(e) => setFormData({...formData, drug_class: e.currentTarget.value})}
                />

                <Select
                    label="Analysis Type"
                    data={analysisTypes}
                    value={formData.analysis_type}
                    onChange={(value) => setFormData({...formData, analysis_type: value || 'WGS'})}
                />

                <Select
                    label="Method"
                    placeholder="Select detection method"
                    data={methods}
                    value={formData.method}
                    onChange={(value) => setFormData({...formData, method: value || ''})}
                    searchable
                    creatable
                    getCreateLabel={(query) => `+ Create "${query}"`}
                />

                <NumberInput
                    label="Percent Identity (%)"
                    placeholder="0-100"
                    value={formData.percent_identity ? parseFloat(formData.percent_identity) : ''}
                    onChange={(value) => setFormData({...formData, percent_identity: value?.toString() || ''})}
                    min={0}
                    max={100}
                    step={0.1}
                />

                <Group justify="space-between" mt="lg">
                    <Button
                        variant="default"
                        onClick={onClose}
                        leftSection={<ArrowLeft size={18} />}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={loading} leftSection={<Check size={18} />}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default EditAmrFindingModal;
