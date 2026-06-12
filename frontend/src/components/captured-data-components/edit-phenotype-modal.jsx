import {
    Button,
    Checkbox,
    Group,
    Modal,
    Select,
    Stack,
    Text,
} from '@mantine/core';
import {ArrowLeft, Check} from 'lucide-react';
import {useEffect, useState} from 'react';

const EditPhenotypeModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        organism: '',
        antibiotic: '',
        predicted_sir_profile: null,
        manualOverride: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const organisms = [
        'Escherichia coli',
        'Staphylococcus aureus',
        'Salmonella enterica',
        'Listeria monocytogenes',
        'Campylobacter jejuni',
        'Vibrio parahaemolyticus',
        'Clostridium difficile',
        'Enterococcus faecalis',
    ];

    const antibiotics = [
        'Ampicillin',
        'Amoxicillin',
        'Cephalexin',
        'Ciprofloxacin',
        'Tetracycline',
        'Gentamicin',
        'Chloramphenicol',
        'Trimethoprim-Sulfamethoxazole',
        'Vancomycin',
        'Ceftriaxone',
        'Azithromycin',
        'Fluoroquinolone',
    ];

    useEffect(() => {
        if (record && opened) {
            setFormData({
                organism: record.organism ?? '',
                antibiotic: record.antibiotic ?? '',
                predicted_sir_profile: record.predicted_sir_profile ?? null,
                manualOverride: Boolean(record.is_manual_override),
            });
            setError('');
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        if (!formData.organism || !formData.antibiotic) {
            setError('Organism and antibiotic are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updateData = {
                organism: formData.organism,
                antibiotic: formData.antibiotic,
            };

            if (formData.manualOverride) {
                updateData.predicted_sir_profile = formData.predicted_sir_profile;
            } else if (record?.is_manual_override) {
                updateData.clear_manual_override = true;
            }

            await onSave(record.phenotype_id, updateData);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save phenotype');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Edit Predicted Phenotype"
            size="md"
            centered
            radius="md"
        >
            <Stack gap="md">
                <div>
                    <Text fw={600} mb="xs">Phenotype ID: {record?.phenotype_id}</Text>
                    <Text size="sm" c="dimmed">Update phenotype information</Text>
                </div>

                {error && (
                    <div style={{color: 'red', padding: '8px', backgroundColor: '#ffe0e0', borderRadius: '4px'}}>
                        {error}
                    </div>
                )}

                <Select
                    label="Organism"
                    placeholder="Select or type organism"
                    data={organisms}
                    value={formData.organism}
                    onChange={(value) => setFormData({...formData, organism: value || ''})}
                    searchable
                    creatable
                    getCreateLabel={(query) => `+ Create "${query}"`}
                />

                <Select
                    label="Antibiotic"
                    placeholder="Select or type antibiotic"
                    data={antibiotics}
                    value={formData.antibiotic}
                    onChange={(value) => setFormData({...formData, antibiotic: value || ''})}
                    searchable
                    creatable
                    getCreateLabel={(query) => `+ Create "${query}"`}
                />

                <Checkbox
                    label="Use manual override"
                    checked={formData.manualOverride}
                    onChange={(e) => setFormData({...formData, manualOverride: e.currentTarget.checked})}
                />

                <Text size="sm" c="dimmed">
                    AI prediction: {record?.ai_resistant === true ? 'Resistant' : record?.ai_resistant === false ? 'Susceptible' : 'Unknown'}
                </Text>

                <Select
                    label="Resistance Status"
                    placeholder="Select status"
                    data={['Susceptible', 'Intermediate', 'Resistant']}
                    value={formData.predicted_sir_profile}
                    onChange={(value) => setFormData({...formData, predicted_sir_profile: value})}
                    disabled={!formData.manualOverride}
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

export default EditPhenotypeModal;
