import {Button, Stack, TextInput, NumberInput, SimpleGrid, Paper, Title} from '@mantine/core';
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
        <Stack gap="md">
            {formData.wgsRecords.map((record, idx) => (
                <Paper key={idx} withBorder p="md" radius="md" style={{backgroundColor: '#f8f9fa'}}>
                    <Stack gap="md">
                        <Title order={5}>Record {idx + 1}</Title>
                        <SimpleGrid cols={2} spacing="md">
                            <NumberInput
                                label="Isolate ID"
                                value={record.isolateID === '' ? undefined : record.isolateID}
                                onChange={(val) => updateRecord(idx, 'isolateID', val === '' ? undefined : val)}
                                placeholder="Enter numeric ID"
                                hideControls={false}
                            />
                            <TextInput
                                label="Organism"
                                placeholder="e.g., E. coli"
                                value={record.organism}
                                onChange={(e) => updateRecord(idx, 'organism', e.target.value)}
                            />
                        </SimpleGrid>
                        {formData.wgsRecords.length > 1 && (
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
                Add WGS Record
            </Button>
        </Stack>
    );
};

export default WgsStep;