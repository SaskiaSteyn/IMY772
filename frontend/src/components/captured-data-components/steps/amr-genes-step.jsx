import {Button, Stack, TextInput, SimpleGrid, Paper, Group, Text} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';
import {useState, useImperativeHandle, forwardRef, useEffect} from 'react';
import styles from './sample-info-step.module.scss';

const AmrGenesStep = forwardRef(({formData, setFormData, onValidationChange}, ref) => {
    const [touched, setTouched] = useState([]);
    const [shake, setShake] = useState([]);
    const [error, setError] = useState(false);
    const [showError, setShowError] = useState(false);

    if (!formData || !Array.isArray(formData.amrGenes)) {
        return <Stack>Loading...</Stack>;
    }

    const genes = formData.amrGenes;

    const updateGene = (index, value) => {
        const updated = [...genes];
        updated[index] = value;
        setFormData({...formData, amrGenes: updated});
        setTouched((prev) => {
            const arr = [...prev];
            arr[index] = true;
            return arr;
        });
    };

    const addGene = () => {
        setFormData({...formData, amrGenes: [...genes, '']});
        setTouched((prev) => [...prev, false]);
        setShake((prev) => [...prev, false]);
    };

    const removeGene = (index) => {
        const updated = genes.filter((_, i) => i !== index);
        setFormData({...formData, amrGenes: updated});
        setTouched((prev) => prev.filter((_, i) => i !== index));
        setShake((prev) => prev.filter((_, i) => i !== index));
    };

    // Validation logic
    const missing = genes.map((g) => !g || g.trim() === '');
    const anyMissing = missing.some(Boolean);

    // Expose validation to parent
    useImperativeHandle(ref, () => ({
        validate: () => {
            setTouched(missing.map(() => true));
            setShake(missing);
            setError(anyMissing);
            setShowError(true);
            setTimeout(() => setShake(missing.map(() => false)), 400);
            return !anyMissing;
        }
    }));


    // Hide error if all valid
    useEffect(() => {
        if (!anyMissing && showError) setShowError(false);
    }, [anyMissing, showError]);

    // Notify parent of validation state
    useEffect(() => {
        if (onValidationChange) onValidationChange(!anyMissing);
    }, [anyMissing, onValidationChange]);

    return (
        <Stack gap="md">
            {showError && error && (
                <div style={{color: 'red', marginBottom: 8, fontWeight: 500}}>
                    Please fill in all gene symbols.
                </div>
            )}
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
                                required
                                className={shake[idx] ? styles.shake : ''}
                                error={touched[idx] && (!gene || gene.trim() === '') ? 'Required' : undefined}
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
                disabled={anyMissing}
            >
                Add AMR Gene
            </Button>
        </Stack>
    );
});

export default AmrGenesStep;