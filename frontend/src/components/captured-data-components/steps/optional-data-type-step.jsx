import {Stack, Text, SimpleGrid, Card, Center, Group, Checkbox} from '@mantine/core';
import {Microscope, Beaker, Dna} from 'lucide-react';
import {useState, useImperativeHandle, forwardRef} from 'react';

const OptionalDataTypeStep = forwardRef(({formData, setFormData, onValidationChange}, ref) => {
    const [touched, setTouched] = useState(false);

    const dataTypes = [
        {id: 'isolates', label: 'Isolates', icon: Microscope, description: 'Microbial isolates'},
        {id: 'phenotypes', label: 'Phenotypes', icon: Beaker, description: 'Predicted phenotypes'},
        {id: 'amr_findings', label: 'AMR Findings', icon: Dna, description: 'Antimicrobial resistance genes'},
    ];

    const toggleDataType = (dataTypeId) => {
        setFormData((prev) => {
            const selectedTypes = prev.selectedRelatedDataTypes || [];
            const newTypes = selectedTypes.includes(dataTypeId)
                ? selectedTypes.filter((t) => t !== dataTypeId)
                : [...selectedTypes, dataTypeId];
            return {...prev, selectedRelatedDataTypes: newTypes};
        });
        setTouched(true);
    };

    useImperativeHandle(ref, () => ({
        validate: () => {
            // This step is optional, so always valid
            if (onValidationChange) onValidationChange(true);
            return true;
        },
    }));

    const selectedTypes = formData.selectedRelatedDataTypes || [];

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Add Related Data (Optional)</Text>
                <Text size="sm" c="dimmed" mb="md">Select which types of data you want to add to this sample</Text>
            </div>

            <SimpleGrid cols={{base: 1, sm: 3}} spacing="md">
                {dataTypes.map(({id, label, icon: Icon, description}) => (
                    <Card
                        key={id}
                        shadow="md"
                        padding="md"
                        radius="md"
                        withBorder
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            borderColor: selectedTypes.includes(id) ? '#7db344' : '#dee2e6',
                            backgroundColor: selectedTypes.includes(id) ? '#f7fef0' : undefined,
                        }}
                        onClick={() => toggleDataType(id)}
                    >
                        <Group justify="space-between" align="flex-start">
                            <div>
                                <Group gap="xs" mb="xs">
                                    <Icon size={24} color="#7db344" />
                                    <Text fw={600} size="sm">{label}</Text>
                                </Group>
                                <Text size="xs" c="dimmed">{description}</Text>
                            </div>
                            <Checkbox checked={selectedTypes.includes(id)} onChange={() => {}} readOnly />
                        </Group>
                    </Card>
                ))}
            </SimpleGrid>
        </Stack>
    );
});

OptionalDataTypeStep.displayName = 'OptionalDataTypeStep';
export default OptionalDataTypeStep;
