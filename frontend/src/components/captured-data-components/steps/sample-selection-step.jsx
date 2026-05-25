import {Stack, Text, Select, Alert} from '@mantine/core';
import {AlertCircle} from 'lucide-react';
import {forwardRef, useImperativeHandle, useState} from 'react';

const SampleSelectionStep = forwardRef(({samples, formData, setFormData, onValidationChange}, ref) => {
    const [touched, setTouched] = useState(false);

    const sampleOptions = samples.map((s) => ({
        value: s.sample_id,
        label: `${s.sample_id} - ${s.location_name || 'No location'}`,
    }));

    const handleChange = (value) => {
        setFormData((prev) => ({...prev, sample_id: value}));
        setTouched(true);
    };

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!formData.sample_id) {
                setTouched(true);
                if (onValidationChange) onValidationChange(false);
                return false;
            }
            if (onValidationChange) onValidationChange(true);
            return true;
        },
    }));

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Select Sample</Text>
                <Text size="sm" c="dimmed" mb="md">Choose which sample to add data to</Text>
            </div>

            {samples.length === 0 ? (
                <Alert icon={<AlertCircle size={16} />} title="No samples available" color="yellow">
                    You don't have any samples yet. Please create a sample first.
                </Alert>
            ) : (
                <Select
                    label="Sample"
                    placeholder="Select a sample"
                    data={sampleOptions}
                    value={formData.sample_id || ''}
                    onChange={handleChange}
                    error={touched && !formData.sample_id ? 'Please select a sample' : ''}
                    searchable
                    clearable
                />
            )}
        </Stack>
    );
});

SampleSelectionStep.displayName = 'SampleSelectionStep';
export default SampleSelectionStep;
