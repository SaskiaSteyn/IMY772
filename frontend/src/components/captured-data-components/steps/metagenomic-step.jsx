import {Button, Stack, TextInput, SimpleGrid, Paper} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';

const MetagenomicStep = ({formData, setFormData}) => {
    const updateRecord = (index, field, value) => {
        const updated = [...formData.metagenomicRecords];
        updated[index][field] = value;
        setFormData({...formData, metagenomicRecords: updated});
    };

    const addRecord = () => {
        setFormData({
            ...formData,
            metagenomicRecords: [
                ...formData.metagenomicRecords,
                {sequence_name: '', element_type: '', class: '', subclass: ''}
            ]
        });
    };

    const removeRecord = (index) => {
        const updated = formData.metagenomicRecords.filter((_, i) => i !== index);
        setFormData({...formData, metagenomicRecords: updated});
    };

    return (
        <Stack>
            {formData.metagenomicRecords.map((record, idx) => (
                <Paper key={idx} withBorder p="md" radius="md">
                    <SimpleGrid cols={4} spacing="md">
                        <TextInput
                            label="Sequence Name"
                            value={record.sequence_name}
                            onChange={(e) => updateRecord(idx, 'sequence_name', e.target.value)}
                        />
                        <TextInput
                            label="Element Type"
                            value={record.element_type}
                            onChange={(e) => updateRecord(idx, 'element_type', e.target.value)}
                        />
                        <TextInput
                            label="Class"
                            value={record.class}
                            onChange={(e) => updateRecord(idx, 'class', e.target.value)}
                        />
                        <TextInput
                            label="Subclass"
                            value={record.subclass}
                            onChange={(e) => updateRecord(idx, 'subclass', e.target.value)}
                        />
                    </SimpleGrid>
                    <Button
                        variant="subtle"
                        color="red"
                        onClick={() => removeRecord(idx)}
                        disabled={formData.metagenomicRecords.length === 1}
                        mt="sm"
                        leftSection={<Trash2 size={16} />}
                    >
                        Remove
                    </Button>
                </Paper>
            ))}
            <Button leftSection={<Plus size={16} />} onClick={addRecord} variant="outline">
                Add Another Metagenomic Record
            </Button>
        </Stack>
    );
};

export default MetagenomicStep;