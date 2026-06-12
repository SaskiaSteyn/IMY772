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
        amr_class: '',
        analysis_type: 'WGS',
        method: '',
        percent_identity: '',
        sequence_name: '',
        element_type: '',
        subclass: '',
        percentage_coverage: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const analysisTypes = ['WGS', 'Metagenomic'];
    const methods = ['BLAST', 'ResFinder', 'ARG-ANNOT', 'CARD', 'AMRFinder', 'Other'];

    useEffect(() => {
        if (record && opened) {
            setFormData({
                gene_symbol: record.gene_symbol ?? '',
                amr_class: record.amr_class ?? '',
                analysis_type: record.analysis_type ?? 'WGS',
                method: record.method ?? '',
                percent_identity: record.percent_identity ?? '',
                sequence_name: record.sequence_name ?? '',
                element_type: record.element_type ?? '',
                subclass: record.subclass ?? '',
                percentage_coverage: record.percentage_coverage ?? '',
            });
            setError('');
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        if (!formData.gene_symbol || !formData.amr_class || !formData.method) {
            setError('Gene symbol, AMR class, and method are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updateData = {
                gene_symbol: formData.gene_symbol,
                amr_class: formData.amr_class,
                analysis_type: formData.analysis_type,
                method: formData.method,
            };
            if (formData.percent_identity !== '') updateData.percent_identity = parseFloat(formData.percent_identity);
            if (formData.sequence_name) updateData.sequence_name = formData.sequence_name;
            if (formData.element_type) updateData.element_type = formData.element_type;
            if (formData.subclass) updateData.subclass = formData.subclass;
            if (formData.percentage_coverage !== '') updateData.percentage_coverage = parseFloat(formData.percentage_coverage);

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
                    label="AMR Class"
                    placeholder="e.g., Beta-lactams, Tetracyclines"
                    value={formData.amr_class}
                    onChange={(e) => setFormData({...formData, amr_class: e.currentTarget.value})}
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

                <TextInput
                    label="Sequence Name"
                    placeholder="Enter sequence name"
                    value={formData.sequence_name}
                    onChange={(e) => setFormData({...formData, sequence_name: e.currentTarget.value})}
                />

                <TextInput
                    label="Element Type"
                    placeholder="e.g., AMR"
                    value={formData.element_type}
                    onChange={(e) => setFormData({...formData, element_type: e.currentTarget.value})}
                />

                <TextInput
                    label="Subclass"
                    placeholder="e.g., BETA-LACTAM"
                    value={formData.subclass}
                    onChange={(e) => setFormData({...formData, subclass: e.currentTarget.value})}
                />

                <NumberInput
                    label="Percentage Coverage (%)"
                    placeholder="0-100"
                    value={formData.percentage_coverage ? parseFloat(formData.percentage_coverage) : ''}
                    onChange={(value) => setFormData({...formData, percentage_coverage: value?.toString() || ''})}
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
