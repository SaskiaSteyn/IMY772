import {
    Button,
    Group,
    Modal,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {ArrowLeft, Check} from 'lucide-react';
import {useEffect, useState} from 'react';

const EditIsolateModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        organism: '',
        mlst_type: '',
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

    useEffect(() => {
        if (record && opened) {
            setFormData({
                organism: record.organism ?? '',
                mlst_type: record.mlst_type ?? '',
            });
            setError('');
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        if (!formData.organism) {
            setError('Organism is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updateData = {
                organism: formData.organism,
            };
            if (formData.mlst_type) {
                updateData.mlst_type = formData.mlst_type;
            }

            await onSave(record.isolate_id, updateData);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save isolate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Edit Isolate"
            size="md"
            centered
            radius="md"
        >
            <Stack gap="md">
                <div>
                    <Text fw={600} mb="xs">Isolate ID: {record?.isolate_id}</Text>
                    <Text size="sm" c="dimmed">Update isolate information</Text>
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

                <TextInput
                    label="MLST Type (Optional)"
                    placeholder="e.g., ST131"
                    value={formData.mlst_type}
                    onChange={(e) => setFormData({...formData, mlst_type: e.currentTarget.value})}
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

export default EditIsolateModal;
