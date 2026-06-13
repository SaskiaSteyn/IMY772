import {
    Button,
    Group,
    Modal,
    NumberInput,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {ArrowLeft, Check} from 'lucide-react';
import {useEffect, useState} from 'react';
import {updateSample} from '../../api/sample-data-management';

const EditSampleModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        sample_name: '',
        collected_by: '',
        collection_date: null,
        location_name: '',
        latitude: '',
        longitude: '',
        isolation_source: '',
        water_temp: '',
        ph: '',
        tds: '',
        do: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (record && opened) {
            setFormData({
                sample_name: record.sample_name ?? '',
                collected_by: record.collected_by ?? '',
                collection_date: record.collection_date ? new Date(record.collection_date) : null,
                location_name: record.location_name ?? '',
                latitude: record.latitude ?? '',
                longitude: record.longitude ?? '',
                isolation_source: record.isolation_source ?? '',
                water_temp: record.water_temp ?? '',
                ph: record.ph ?? '',
                tds: record.tds ?? '',
                do: record.do ?? '',
            });
            setError('');
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        setLoading(true);
        setError('');

        try {
            const updateData = {};

            if (formData.sample_name) updateData.sample_name = formData.sample_name;
            if (formData.collected_by) updateData.collected_by = formData.collected_by;
            if (formData.water_temp !== '') updateData.water_temp = parseFloat(formData.water_temp);
            if (formData.ph !== '') updateData.ph = parseFloat(formData.ph);
            if (formData.tds !== '') updateData.tds = parseFloat(formData.tds);
            if (formData.do !== '') updateData.do = parseFloat(formData.do);
            if (formData.isolation_source) updateData.isolation_source = formData.isolation_source;
            if (formData.collection_date) {
                updateData.collection_date = formData.collection_date.toISOString().split('T')[0];
            }
            if (formData.location_name) updateData.location_name = formData.location_name;
            if (formData.latitude !== '') updateData.latitude = parseFloat(formData.latitude);
            if (formData.longitude !== '') updateData.longitude = parseFloat(formData.longitude);

            await onSave(record.sample_id, updateData);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save sample');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Edit Sample"
            size="md"
            centered
            radius="md"
        >
            <Stack gap="md">
                <div>
                    <Text fw={600} mb="xs">Sample ID: {record?.sample_id}</Text>
                    <Text size="sm" c="dimmed">Update sample information</Text>
                </div>

                {error && (
                    <div style={{color: 'red', padding: '8px', backgroundColor: '#ffe0e0', borderRadius: '4px'}}>
                        {error}
                    </div>
                )}

                <TextInput
                    label="Sample Name"
                    placeholder="e.g., Vaal River Sample A"
                    value={formData.sample_name}
                    onChange={(e) => setFormData({...formData, sample_name: e.currentTarget.value})}
                    required
                />

                <TextInput
                    label="Collected By"
                    placeholder="e.g., Dr. Smith"
                    value={formData.collected_by}
                    onChange={(e) => setFormData({...formData, collected_by: e.currentTarget.value})}
                />

                <DatePickerInput
                    label="Collection Date"
                    placeholder="Select date"
                    value={formData.collection_date}
                    onChange={(date) => setFormData({...formData, collection_date: date})}
                />

                <TextInput
                    label="Location Name"
                    placeholder="e.g., Vaal Dam, Pretoria"
                    value={formData.location_name}
                    onChange={(e) => setFormData({...formData, location_name: e.currentTarget.value})}
                />

                <NumberInput
                    label="Latitude"
                    placeholder="-25.7479"
                    decimalScale={6}
                    value={formData.latitude || ''}
                    onChange={(val) => setFormData({...formData, latitude: val})}
                />

                <NumberInput
                    label="Longitude"
                    placeholder="28.2293"
                    decimalScale={6}
                    value={formData.longitude || ''}
                    onChange={(val) => setFormData({...formData, longitude: val})}
                />

                <TextInput
                    label="Isolation Source"
                    placeholder="e.g., water, soil, clinical sample"
                    value={formData.isolation_source}
                    onChange={(e) => setFormData({...formData, isolation_source: e.currentTarget.value})}
                />

                <NumberInput
                    label="Water Temperature (°C)"
                    placeholder="25.0"
                    decimalScale={2}
                    value={formData.water_temp || ''}
                    onChange={(val) => setFormData({...formData, water_temp: val})}
                />

                <NumberInput
                    label="pH Level"
                    placeholder="7.0"
                    decimalScale={2}
                    value={formData.ph || ''}
                    onChange={(val) => setFormData({...formData, ph: val})}
                />

                <NumberInput
                    label="Total Dissolved Solids (TDS)"
                    placeholder="100.0"
                    decimalScale={2}
                    value={formData.tds || ''}
                    onChange={(val) => setFormData({...formData, tds: val})}
                />

                <NumberInput
                    label="Dissolved Oxygen (DO)"
                    placeholder="100.0"
                    decimalScale={2}
                    value={formData.do || ''}
                    onChange={(val) => setFormData({...formData, do: val})}
                />

                <Group justify="space-between" mt="lg">
                    <Button
                        variant="default"
                        onClick={onClose}
                        leftSection={<ArrowLeft size={18} />}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={loading} leftSection={<Check size={18} />}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default EditSampleModal;