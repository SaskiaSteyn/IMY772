import {useEffect} from 'react';
import {SimpleGrid, TextInput, NumberInput, Select, Stack} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';

const SampleInfoStep = ({formData, setFormData, analysisType, setAnalysisType}) => {
    // When analysis type changes, clear the unrelated dynamic records
    useEffect(() => {
        if (analysisType === 'Metagenomic') {
            setFormData(prev => ({...prev, wgsRecords: [{isolateID: '', organism: ''}]}));
        } else if (analysisType === 'WGS') {
            setFormData(prev => ({...prev, metagenomicRecords: [{sequence_name: '', element_type: '', class: '', subclass: ''}]}));
        }
    }, [analysisType, setFormData]);

    return (
        <Stack gap="md">
            <SimpleGrid cols={2} spacing="md">
                <NumberInput
                    label="Water Temperature (°C)"
                    decimalScale={2}
                    value={formData.water_temperature}
                    onChange={(val) => setFormData({...formData, water_temperature: val})}
                />
                <NumberInput
                    label="pH Level"
                    decimalScale={2}
                    value={formData.ph}
                    onChange={(val) => setFormData({...formData, ph: val})}
                />
                <NumberInput
                    label="Total Dissolved Solids (TDS)"
                    value={formData.tds}
                    onChange={(val) => setFormData({...formData, tds: val})}
                />
                <NumberInput
                    label="Dissolved Oxygen (DO)"
                    value={formData.do}
                    onChange={(val) => setFormData({...formData, do: val})}
                />

                <Select
                    label="Sample Analysis Type"
                    placeholder="Select type"
                    data={['Metagenomic', 'WGS']}
                    value={analysisType}
                    onChange={(val) => {
                        setAnalysisType(val || '');
                        setFormData({...formData, sample_analysis_type: val || ''});
                    }}
                    required
                />

                <TextInput
                    label="Isolation Source"
                    value={formData.isolation_source}
                    onChange={(e) => setFormData({...formData, isolation_source: e.target.value})}
                />
            </SimpleGrid>

            <SimpleGrid cols={2} spacing="md">
                <DatePickerInput
                    label="Collection Date"
                    value={formData.collection_date}
                    onChange={(date) => setFormData({...formData, collection_date: date})}
                />

                <TextInput
                    label="Location Name"
                    value={formData.location_name}
                    onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                />
            </SimpleGrid>

            <SimpleGrid cols={2} spacing="md">
                <NumberInput
                    label="Latitude"
                    decimalScale={8}
                    value={formData.latitude}
                    onChange={(val) => setFormData({...formData, latitude: val})}
                />

                <NumberInput
                    label="Longitude"
                    decimalScale={8}
                    value={formData.longitude}
                    onChange={(val) => setFormData({...formData, longitude: val})}
                />
            </SimpleGrid>

            <SimpleGrid cols={2} spacing="md">
                <TextInput
                    label="Collected By"
                    value={formData.collected_by}
                    onChange={(e) => setFormData({...formData, collected_by: e.target.value})}
                />

                <Select
                    label="Predicted SIR Profile"
                    placeholder="Select profile"
                    data={['Susceptible', 'Intermediate', 'Resistant']}
                    value={formData.predicted_sir_profile}
                    onChange={(val) => setFormData({...formData, predicted_sir_profile: val || ''})}
                />
            </SimpleGrid>
        </Stack>
    );
};

export default SampleInfoStep;