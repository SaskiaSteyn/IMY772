import {Button, Stack, TextInput, SimpleGrid, Paper, Title} from '@mantine/core';
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
        <Stack gap="md">
            {formData.metagenomicRecords.map((record, idx) => (
                <Paper key={idx} withBorder p="md" radius="md" style={{backgroundColor: '#f8f9fa'}}>
                    <Stack gap="md">
                        <Title order={5}>Record {idx + 1}</Title>
                        <SimpleGrid cols={2} spacing="md">
                            <TextInput
                                label="Sequence Name"
                                placeholder="e.g., SEQ_001"
                                value={record.sequence_name}
                                onChange={(e) => updateRecord(idx, 'sequence_name', e.target.value)}
                            />
                            <TextInput
                                label="Element Type"
                                placeholder="e.g., AMR"
                                value={record.element_type}
                                onChange={(e) => updateRecord(idx, 'element_type', e.target.value)}
                            />
                            <TextInput
                                label="Class"
                                placeholder="e.g., Beta-lactam"
                                value={record.class}
                                onChange={(e) => updateRecord(idx, 'class', e.target.value)}
                            />
                            <TextInput
                                label="Subclass"
                                placeholder="e.g., ESBL"
                                value={record.subclass}
                                onChange={(e) => updateRecord(idx, 'subclass', e.target.value)}
                            />
                        </SimpleGrid>
                        {formData.metagenomicRecords.length > 1 && (
                            <Button
                                variant="light"
                                color="red"
                                onClick={() => removeRecord(idx)}
                                leftSection={<Trash2 size={16} />}
                                size="sm"
                                w="fit-content"
                            >
                                Remove Record
                            </Button>
                        )}
                    </Stack>
                </Paper>
            ))}
            <Button 
                leftSection={<Plus size={16} />} 
                onClick={addRecord} 
                variant="outline"
            >
                Add Metagenomic Record
            </Button>
        </Stack>
    );
};

export default MetagenomicStep;