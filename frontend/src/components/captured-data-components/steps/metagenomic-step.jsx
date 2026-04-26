import {Button, Stack, TextInput, SimpleGrid, Paper, Title} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';
import {useState, useImperativeHandle, forwardRef} from 'react';
import styles from './sample-info-step.module.scss';

const MetagenomicStep = forwardRef(({formData, setFormData, onValidationChange}, ref) => {
    const [touched, setTouched] = useState([]);
    const [shake, setShake] = useState([]);
    const [error, setError] = useState(false);
    const [showError, setShowError] = useState(false);

    const updateRecord = (index, field, value) => {
        const updated = [...formData.metagenomicRecords];
        updated[index][field] = value;
        setFormData({...formData, metagenomicRecords: updated});
        if (field === 'sequence_name' || field === 'element_type') {
            setTouched((prev) => {
                const arr = [...prev];
                arr[index] = {...(arr[index] || {}), [field]: true};
                return arr;
            });
        }
    };

    const addRecord = () => {
        setFormData({
            ...formData,
            metagenomicRecords: [
                ...formData.metagenomicRecords,
                {sequence_name: '', element_type: '', class: '', subclass: ''}
            ]
        });
        setTouched((prev) => [...prev, {sequence_name: false, element_type: false}]);
        setShake((prev) => [...prev, {sequence_name: false, element_type: false}]);
    };

    const removeRecord = (index) => {
        const updated = formData.metagenomicRecords.filter((_, i) => i !== index);
        setFormData({...formData, metagenomicRecords: updated});
        setTouched((prev) => prev.filter((_, i) => i !== index));
        setShake((prev) => prev.filter((_, i) => i !== index));
    };

    // Validation logic
    const missing = formData.metagenomicRecords.map((rec) => ({
        sequence_name: !rec.sequence_name || rec.sequence_name.trim() === '',
        element_type: !rec.element_type || rec.element_type.trim() === ''
    }));
    const anyMissing = missing.some(m => m.sequence_name || m.element_type);

    // Expose validation to parent
    useImperativeHandle(ref, () => ({
        validate: () => {
            setTouched(missing.map(m => ({sequence_name: true, element_type: true})));
            setShake(missing);
            setError(anyMissing);
            setShowError(true);
            setTimeout(() => setShake(missing.map(() => ({sequence_name: false, element_type: false}))), 400);
            return !anyMissing;
        }
    }));

    // Hide error if all valid
    if (!anyMissing && showError) setShowError(false);
    if (onValidationChange) onValidationChange(!anyMissing);

    return (
        <Stack gap="md">
            {showError && error && (
                <div style={{color: 'red', marginBottom: 8, fontWeight: 500}}>
                    Please fill in all required fields for each record.
                </div>
            )}
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
                                required
                                className={shake[idx]?.sequence_name ? styles.shake : ''}
                                error={touched[idx]?.sequence_name && (!record.sequence_name || record.sequence_name.trim() === '') ? 'Required' : undefined}
                            />
                            <TextInput
                                label="Element Type"
                                placeholder="e.g., AMR"
                                value={record.element_type}
                                onChange={(e) => updateRecord(idx, 'element_type', e.target.value)}
                                required
                                className={shake[idx]?.element_type ? styles.shake : ''}
                                error={touched[idx]?.element_type && (!record.element_type || record.element_type.trim() === '') ? 'Required' : undefined}
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
                disabled={anyMissing}
            >
                Add Metagenomic Record
            </Button>
        </Stack>
    );
});

export default MetagenomicStep;