import {useImperativeHandle, forwardRef, useState, useEffect} from 'react';
import {SimpleGrid, TextInput, NumberInput, Stack, Title, Button, Paper} from '@mantine/core';
import {Trash2, Plus} from 'lucide-react';
import styles from './sample-info-step.module.scss';

const WgsStep = forwardRef(({formData, setFormData, onValidationChange}, ref) => {
    const [touched, setTouched] = useState([]);
    const [shake, setShake] = useState([]);
    const [error, setError] = useState(false);
    const [showError, setShowError] = useState(false);

    const updateRecord = (index, field, value) => {
        const updated = [...formData.wgsRecords];
        updated[index][field] = value;
        setFormData({...formData, wgsRecords: updated});
        setTouched((prev) => {
            const arr = [...prev];
            arr[index] = {...(arr[index] || {}), [field]: true};
            return arr;
        });
    };

    const addRecord = () => {
        setFormData({
            ...formData,
            wgsRecords: [...formData.wgsRecords, {isolateID: '', organism: ''}]
        });
        setTouched((prev) => [...prev, {isolateID: false, organism: false}]);
        setShake((prev) => [...prev, {isolateID: false, organism: false}]);
    };

    const removeRecord = (index) => {
        const updated = formData.wgsRecords.filter((_, i) => i !== index);
        setFormData({...formData, wgsRecords: updated});
        setTouched((prev) => prev.filter((_, i) => i !== index));
        setShake((prev) => prev.filter((_, i) => i !== index));
    };

    // Validation logic
    const missing = formData.wgsRecords.map((rec) => ({
        isolateID: !rec.isolateID,
        organism: !rec.organism || rec.organism.trim() === ''
    }));
    const anyMissing = missing.some(m => m.isolateID || m.organism);

    // Expose validation to parent
    useImperativeHandle(ref, () => ({
        validate: () => {
            setTouched(missing.map(m => ({isolateID: true, organism: true})));
            setShake(missing);
            setError(anyMissing);
            setShowError(true);
            setTimeout(() => setShake(missing.map(() => ({isolateID: false, organism: false}))), 400);
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
                    Please fill in all WGS record fields.
                </div>
            )}
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
                                required
                                className={shake[idx]?.isolateID ? styles.shake : ''}
                                error={touched[idx]?.isolateID && !record.isolateID ? 'Required' : undefined}
                            />
                            <TextInput
                                label="Organism"
                                placeholder="e.g., E. coli"
                                value={record.organism}
                                onChange={(e) => updateRecord(idx, 'organism', e.target.value)}
                                required
                                className={shake[idx]?.organism ? styles.shake : ''}
                                error={touched[idx]?.organism && (!record.organism || record.organism.trim() === '') ? 'Required' : undefined}
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
                disabled={anyMissing}
            >
                Add WGS Record
            </Button>
        </Stack>
    );
});

export default WgsStep;