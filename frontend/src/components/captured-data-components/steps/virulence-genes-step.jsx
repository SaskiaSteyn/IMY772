import {Button, Stack, TextInput, SimpleGrid, Paper} from '@mantine/core';
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
        <Stack>
            {genes.map((gene, idx) => (
                <Paper key={idx} withBorder p="md" radius="md">
                    <SimpleGrid cols={2} spacing="md" style={{alignItems: 'flex-end'}}>
                        <TextInput
                            label="Gene Symbol"
                            value={gene || ''}
                            onChange={(e) => updateGene(idx, e.target.value)}
                            placeholder="e.g., invA"
                        />
                        <Button
                            variant="subtle"
                            color="red"
                            onClick={() => removeGene(idx)}
                            disabled={genes.length === 1}
                            leftSection={<Trash2 size={16} />}
                        >
                            Remove
                        </Button>
                    </SimpleGrid>
                </Paper>
            ))}
            <Button leftSection={<Plus size={16} />} onClick={addGene} variant="outline">
                Add Another Virulence Gene
            </Button>
        </Stack>
    );
};

export default VirulenceGenesStep;