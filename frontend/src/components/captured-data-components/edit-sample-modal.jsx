import {useState, useEffect} from 'react';
import {
    Modal,
    Button,
    Group,
    Stack,
    NumberInput,
    TextInput,
    Select,
} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {ArrowLeft} from 'lucide-react';

const EditSampleModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        water_temperature: '',
        ph: '',
        tds: '',
        do: '',
        sample_analysis_type: '',
        isolation_source: '',
        collection_date: null,
        location_name: '',
        latitude: '',
        longitude: '',
        collected_by: '',
        predicted_sir_profile: '',
    });

    useEffect(() => {
        if (record && opened) {
            setFormData((prev) => ({
                water_temperature: record.water_temperature ?? '',
                ph: record.ph ?? '',
                tds: record.tds ?? '',
                do: record.do ?? '',
                sample_analysis_type: record.sample_analysis_type ?? '',
                isolation_source: record.isolation_source ?? '',
                collection_date: record.collection_date ? new Date(record.collection_date) : null,
                location_name: record.location_name ?? '',
                latitude: record.latitude ?? '',
                longitude: record.longitude ?? '',
                collected_by: record.collected_by ?? '',
                predicted_sir_profile: record.predicted_sir_profile ?? '',
            }));
        }
    }, [record?.sampleID, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        const updateData = {};

        if (formData.water_temperature !== '') updateData.water_temperature = parseFloat(formData.water_temperature);
        if (formData.ph !== '') updateData.ph = parseFloat(formData.ph);
        if (formData.tds !== '') updateData.tds = parseFloat(formData.tds);
        if (formData.do !== '') updateData.do = parseFloat(formData.do);
        if (formData.sample_analysis_type) updateData.sample_analysis_type = formData.sample_analysis_type;
        if (formData.isolation_source) updateData.isolation_source = formData.isolation_source;
        if (formData.collection_date) updateData.collection_date = formData.collection_date.toISOString().split('T')[0];
        if (formData.location_name) updateData.location_name = formData.location_name;
        if (formData.latitude !== '') updateData.latitude = parseFloat(formData.latitude);
        if (formData.longitude !== '') updateData.longitude = parseFloat(formData.longitude);
        if (formData.collected_by) updateData.collected_by = formData.collected_by;
        if (formData.predicted_sir_profile) updateData.predicted_sir_profile = formData.predicted_sir_profile;

        await onSave(record.sampleID, updateData);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title='Edit Sample'
            size='lg'
            centered
            radius='md'
            styles={{
                title: {
                    fontWeight: 600,
                    fontSize: 18,
                },
            }}
        >
            <Stack gap='md'>
                <Stack gap='md'>
                    <NumberInput
                        label='Water Temperature (°C)'
                        placeholder='Enter temperature'
                        value={formData.water_temperature || ''}
                        onChange={(val) => setFormData({...formData, water_temperature: val})}
                        decimalScale={2}
                    />

                    <NumberInput
                        label='pH'
                        placeholder='Enter pH value'
                        value={formData.ph || ''}
                        onChange={(val) => setFormData({...formData, ph: val})}
                        decimalScale={2}
                    />

                    <NumberInput
                        label='TDS (Total Dissolved Solids)'
                        placeholder='Enter TDS value'
                        value={formData.tds || ''}
                        onChange={(val) => setFormData({...formData, tds: val})}
                        decimalScale={2}
                    />

                    <NumberInput
                        label='DO (Dissolved Oxygen)'
                        placeholder='Enter DO value'
                        value={formData.do || ''}
                        onChange={(val) => setFormData({...formData, do: val})}
                        decimalScale={2}
                    />

                    <Select
                        label='Sample Analysis Type'
                        placeholder='Select analysis type'
                        value={formData.sample_analysis_type}
                        onChange={(val) => setFormData({...formData, sample_analysis_type: val})}
                        data={['Metagenomic', 'WGS']}
                    />

                    <TextInput
                        label='Isolation Source'
                        placeholder='Enter isolation source'
                        value={formData.isolation_source}
                        onChange={(e) => setFormData({...formData, isolation_source: e.target.value})}
                    />

                    <DatePickerInput
                        label='Collection Date'
                        placeholder='Select date'
                        value={formData.collection_date}
                        onChange={(date) => setFormData({...formData, collection_date: date})}
                    />

                    <TextInput
                        label='Location Name'
                        placeholder='Enter location name'
                        value={formData.location_name}
                        onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                    />

                    <NumberInput
                        label='Latitude'
                        placeholder='Enter latitude'
                        value={formData.latitude || ''}
                        onChange={(val) => setFormData({...formData, latitude: val})}
                        decimalScale={4}
                    />

                    <NumberInput
                        label='Longitude'
                        placeholder='Enter longitude'
                        value={formData.longitude || ''}
                        onChange={(val) => setFormData({...formData, longitude: val})}
                        decimalScale={4}
                    />

                    <TextInput
                        label='Collected By'
                        placeholder='Enter collector name'
                        value={formData.collected_by}
                        onChange={(e) => setFormData({...formData, collected_by: e.target.value})}
                    />

                    <Select
                        label='Predicted SIR Profile'
                        placeholder='Select profile'
                        value={formData.predicted_sir_profile}
                        onChange={(val) => setFormData({...formData, predicted_sir_profile: val || ''})}
                        data={['', 'Susceptible', 'Intermediate', 'Resistant']}
                    />
                </Stack>

                <Group justify='space-between' mt='lg'>
                    <Button
                        variant='default'
                        onClick={onClose}
                        leftSection={<ArrowLeft size={18} />}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default EditSampleModal;
