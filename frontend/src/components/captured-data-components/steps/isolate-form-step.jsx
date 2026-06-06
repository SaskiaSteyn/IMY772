import {Stack, TextInput, Select, Button, Group, Text} from '@mantine/core';
import {forwardRef, useImperativeHandle, useState} from 'react';

const IsolateFormStep = forwardRef(({formData, setFormData, onAddMore, onValidationChange}, ref) => {
    const [isolateData, setIsolateData] = useState({organism: '', mlst_type: ''});
    const [touched, setTouched] = useState({});

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

    const handleChange = (field, value) => {
        setIsolateData((prev) => ({...prev, [field]: value}));
        setTouched((prev) => ({...prev, [field]: true}));
    };

    const isValid = isolateData.organism && isolateData.organism.trim() !== '';

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!isValid) {
                setTouched({organism: true, mlst_type: true});
                if (onValidationChange) onValidationChange(false);
                return false;
            }
            if (onValidationChange) onValidationChange(true);
            return true;
        },
        getData: () => isolateData,
        reset: () => {
            setIsolateData({organism: '', mlst_type: ''});
            setTouched({});
        },
    }));

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Add Isolate</Text>
                <Text size="sm" c="dimmed" mb="md">Enter isolate information</Text>
            </div>

            <Select
                label="Organism"
                placeholder="Select or type organism"
                data={organisms}
                value={isolateData.organism}
                onChange={(value) => handleChange('organism', value || '')}
                error={touched.organism && !isolateData.organism ? 'Organism is required' : ''}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create "${query}"`}
            />

            <TextInput
                label="MLST Type (Optional)"
                placeholder="e.g., ST131"
                value={isolateData.mlst_type}
                onChange={(e) => handleChange('mlst_type', e.currentTarget.value)}
            />

            {onAddMore && (
                <Group justify="flex-end" mt="lg">
                    <Button
                        variant="light"
                        onClick={() => {
                            if (isValid) {
                                onAddMore(isolateData);
                                setIsolateData({organism: '', mlst_type: ''});
                                setTouched({});
                            } else {
                                setTouched({organism: true});
                            }
                        }}
                    >
                        + Add Another Isolate
                    </Button>
                </Group>
            )}
        </Stack>
    );
});

IsolateFormStep.displayName = 'IsolateFormStep';
export default IsolateFormStep;
