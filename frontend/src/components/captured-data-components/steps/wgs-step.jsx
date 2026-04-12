import {Button, Stack, TextInput, SimpleGrid, Paper} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';

const WgsStep = ({formData, setFormData}) => {
    const updateRecord = (index, field, value) => {
        const updated = [...formData.wgsRecords];
        updated[index][field] = value;
        setFormData({...formData, wgsRecords: updated});
    };

    const addRecord = () => {
        setFormData({
            ...formData,
            wgsRecords: [...formData.wgsRecords, {isolateID: '', organism: ''}]
        });
    };

    const removeRecord = (index) => {
        const updated = formData.wgsRecords.filter((_, i) => i !== index);
        setFormData({...formData, wgsRecords: updated});
    };

    return (
        <Stack>
            {formData.wgsRecords.map((record, idx) => (
                <Paper key={idx} withBorder p="md" radius="md">
                    <SimpleGrid cols={2} spacing="md">
                        <TextInput
                            label="Isolate ID"
                            value={record.isolateID}
                            onChange={(e) => updateRecord(idx, 'isolateID', e.target.value)}
                        />
                        <TextInput
                            label="Organism"
                            value={record.organism}
                            onChange={(e) => updateRecord(idx, 'organism', e.target.value)}
                        />
                    </SimpleGrid>
                    <Button
                        variant="subtle"
                        color="red"
                        onClick={() => removeRecord(idx)}
                        disabled={formData.wgsRecords.length === 1}
                        mt="sm"
                        leftSection={<Trash2 size={16} />}
                    >
                        Remove
                    </Button>
                </Paper>
            ))}
            <Button leftSection={<Plus size={16} />} onClick={addRecord} variant="outline">
                Add Another WGS Record
            </Button>
        </Stack>
    );
};

export default WgsStep;