import {Button, Stack, TextInput, SimpleGrid, Paper, Group, Text} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';

const AmrGenesStep = ({formData, setFormData}) => {
    if (!formData || !Array.isArray(formData.amrGenes)) {
        return <Stack>Loading...</Stack>;
    }

    const genes = formData.amrGenes;

    const updateGene = (index, value) => {
        const updated = [...genes];
        updated[index] = value;
        setFormData({...formData, amrGenes: updated});
    };

    const addGene = () => {
        setFormData({...formData, amrGenes: [...genes, '']});
    };

    const removeGene = (index) => {
        const updated = genes.filter((_, i) => i !== index);
        setFormData({...formData, amrGenes: updated});
    };

    return (
        <Stack gap="md">
            {genes.map((gene, idx) => (
                <Paper key={idx} withBorder p="md" radius="md" style={{backgroundColor: '#f8f9fa'}}>
                    <Group gap="md" align="flex-end">
                        <div style={{flex: 1}}>
                            <Text size="sm" fw={500} mb="xs">Gene {idx + 1}</Text>
                            <TextInput
                                label="Gene Symbol"
                                value={gene || ''}
                                onChange={(e) => updateGene(idx, e.target.value)}
                                placeholder="e.g., blaCTX-M-15"
                            />
                        </div>
                        {genes.length > 1 && (
                            <Button
                                variant="light"
                                color="red"
                                onClick={() => removeGene(idx)}
                                leftSection={<Trash2 size={16} />}
                                size="sm"
                            >
                                Remove
                            </Button>
                        )}
                    </Group>
                </Paper>
            ))}
            <Button 
                leftSection={<Plus size={16} />} 
                onClick={addGene} 
                variant="outline"
            >
                Add AMR Gene
            </Button>
        </Stack>
    );
};

export default AmrGenesStep;