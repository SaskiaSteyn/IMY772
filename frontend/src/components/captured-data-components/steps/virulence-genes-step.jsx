import {Button, Stack, TextInput, Paper, Group, Text} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';

const VirulenceGenesStep = ({formData, setFormData}) => {
    // Guard against missing formData or virulenceGenes
    if (!formData || !Array.isArray(formData.virulenceGenes)) {
        return <Stack>Loading...</Stack>; // or return null
    }

    const genes = formData.virulenceGenes;

    const updateGene = (index, value) => {
        const updated = [...genes];
        updated[index] = value;
        setFormData({...formData, virulenceGenes: updated});
    };

    const addGene = () => {
        setFormData({...formData, virulenceGenes: [...genes, '']});
    };

    const removeGene = (index) => {
        const updated = genes.filter((_, i) => i !== index);
        setFormData({...formData, virulenceGenes: updated});
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
                                placeholder="e.g., invA"
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
                Add Virulence Gene
            </Button>
        </Stack>
    );
};

export default VirulenceGenesStep;