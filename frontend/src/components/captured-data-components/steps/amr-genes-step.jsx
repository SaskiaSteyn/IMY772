import {Button, Stack, TextInput, SimpleGrid, Paper} from '@mantine/core';
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
        <Stack>
            {genes.map((gene, idx) => (
                <Paper key={idx} withBorder p="md" radius="md">
                    <SimpleGrid cols={2} spacing="md" style={{alignItems: 'flex-end'}}>
                        <TextInput
                            label="Gene Symbol"
                            value={gene || ''}
                            onChange={(e) => updateGene(idx, e.target.value)}
                            placeholder="e.g., blaCTX-M-15"
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
                Add Another AMR Gene
            </Button>
        </Stack>
    );
};

export default AmrGenesStep;