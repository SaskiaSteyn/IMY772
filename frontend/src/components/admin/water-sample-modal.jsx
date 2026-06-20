import {
    Alert,
    Button,
    Group,
    Modal,
    NumberInput,
    SimpleGrid,
    Stack,
    TextInput,
    Title,
} from '@mantine/core';
import {useState} from 'react';

const initialForm = {
    sample_id: '',
    sample_name: '',
    collected_by: '',
    collection_date: '',
    location_name: '',
    latitude: '',
    longitude: '',
    isolation_source: '',
    water_temp: '',
    ph: '',
    tds: '',
    do: '',
};

function mapSampleToForm(sample) {
    if (!sample) return {...initialForm};
    return {
        sample_id: sample.sample_id || '',
        sample_name: sample.sample_name || '',
        collected_by: sample.collected_by || '',
        collection_date: sample.collection_date ? String(sample.collection_date).slice(0, 10) : '',
        location_name: sample.location_name || '',
        latitude: sample.latitude ?? '',
        longitude: sample.longitude ?? '',
        isolation_source: sample.isolation_source || '',
        water_temp: sample.water_temp ?? '',
        ph: sample.ph ?? '',
        tds: sample.tds ?? '',
        do: sample.do ?? '',
    };
}

function buildPayload(form) {
    const toNumber = (v) => {
        if (v === '' || v === null || v === undefined) return null;
        const parsed = Number(v);
        return Number.isFinite(parsed) ? parsed : null;
    };
    return {
        sample_name: form.sample_name || null,
        collected_by: form.collected_by || null,
        collection_date: form.collection_date || null,
        location_name: form.location_name || null,
        latitude: toNumber(form.latitude),
        longitude: toNumber(form.longitude),
        isolation_source: form.isolation_source || null,
        water_temp: toNumber(form.water_temp),
        ph: toNumber(form.ph),
        tds: toNumber(form.tds),
        do: toNumber(form.do),
    };
}

export default function WaterSampleModal({
    opened,
    onClose,
    onSubmit,
    loading = false,
    mode = 'create',
    initialData = null,
}) {
    const isEditing = mode === 'edit';
    const [form, setForm] = useState(() => mapSampleToForm(initialData));
    const [error, setError] = useState('');

    function updateField(key, value) {
        setForm(prev => ({...prev, [key]: value}));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!form.latitude || !form.longitude) {
            setError('Latitude and longitude are required.');
            return;
        }
        if (!isEditing && !form.sample_id.trim()) {
            setError('Sample ID is required for new samples.');
            return;
        }
        const payload = buildPayload(form);
        if (!isEditing) {
            payload.sample_id = form.sample_id.trim();
        }
        try {
            setError('');
            await onSubmit(payload);
        } catch (err) {
            setError(err.message || 'Failed to save sample.');
        }
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title order={2} fw={800} lh={1.15}>{isEditing ? 'Edit Water Sample' : 'Create Water Sample'}</Title>}
            centered
            size='lg'
            radius='md'
        >
            <form onSubmit={handleSubmit}>
                <Stack gap='md'>
                    {error && <Alert color='red' variant='light'>{error}</Alert>}

                    <SimpleGrid cols={{base: 1, sm: 2}} spacing='sm'>
                        {!isEditing && (
                            <TextInput
                                label='Sample ID'
                                value={form.sample_id}
                                onChange={e => updateField('sample_id', e.currentTarget.value)}
                                required
                            />
                        )}
                        <TextInput
                            label='Sample Name'
                            value={form.sample_name}
                            onChange={e => updateField('sample_name', e.currentTarget.value)}
                        />
                        <TextInput
                            label='Location Name'
                            value={form.location_name}
                            onChange={e => updateField('location_name', e.currentTarget.value)}
                        />
                        <TextInput
                            label='Collected By'
                            value={form.collected_by}
                            onChange={e => updateField('collected_by', e.currentTarget.value)}
                        />
                        <TextInput
                            label='Collection Date'
                            type='date'
                            value={form.collection_date}
                            onChange={e => updateField('collection_date', e.currentTarget.value)}
                        />
                        <TextInput
                            label='Isolation Source'
                            value={form.isolation_source}
                            onChange={e => updateField('isolation_source', e.currentTarget.value)}
                        />
                        <NumberInput
                            label='Latitude'
                            value={form.latitude}
                            onChange={val => updateField('latitude', val)}
                            required
                            decimalScale={8}
                        />
                        <NumberInput
                            label='Longitude'
                            value={form.longitude}
                            onChange={val => updateField('longitude', val)}
                            required
                            decimalScale={8}
                        />
                        <NumberInput
                            label='Water Temperature (°C)'
                            value={form.water_temp}
                            onChange={val => updateField('water_temp', val)}
                            decimalScale={2}
                        />
                        <NumberInput
                            label='pH'
                            value={form.ph}
                            onChange={val => updateField('ph', val)}
                            decimalScale={2}
                        />
                        <NumberInput
                            label='TDS'
                            value={form.tds}
                            onChange={val => updateField('tds', val)}
                            decimalScale={2}
                        />
                        <NumberInput
                            label='Dissolved Oxygen (DO)'
                            value={form.do}
                            onChange={val => updateField('do', val)}
                            decimalScale={2}
                        />
                    </SimpleGrid>

                    <Group justify='flex-end' mt='sm'>
                        <Button type='button' variant='outline' color='themeColors.6' onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type='submit' color='themeColors.6' loading={loading}>
                            {isEditing ? 'Save Changes' : 'Create Sample'}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}