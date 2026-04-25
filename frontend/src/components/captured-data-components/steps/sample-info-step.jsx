import {useEffect, useState, useImperativeHandle, forwardRef} from 'react';
import {SimpleGrid, TextInput, NumberInput, Select, Stack} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {useAuth} from '../../../context/AuthContext';
import styles from './sample-info-step.module.scss';

const SampleInfoStep = forwardRef(({formData, setFormData, analysisType, setAnalysisType, onValidationChange}, ref) => {
    const [touched, setTouched] = useState({
        sample_analysis_type: false,
        isolation_source: false,
        location_name: false,
    });
    const [shake, setShake] = useState({
        sample_analysis_type: false,
        isolation_source: false,
        location_name: false,
    });
    const [error, setError] = useState(false);
    const [showError, setShowError] = useState(false);
    // Validation logic
    const requiredFields = {
        sample_analysis_type: analysisType,
        isolation_source: formData.isolation_source,
        location_name: formData.location_name,
    };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, v]) => !v || v === '')
        .map(([k]) => k);
    useEffect(() => {
        setError(missingFields.length > 0);
        if (onValidationChange) onValidationChange(missingFields.length === 0);
        if (missingFields.length === 0 && showError) setShowError(false);
    }, [analysisType, formData.isolation_source, formData.location_name, showError]);

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (missingFields.length > 0) {
                setTouched((prev) => ({...prev, ...Object.fromEntries(missingFields.map(f => [f, true]))}));
                setShake((prev) => {
                    const newShake = {...prev};
                    missingFields.forEach(f => {newShake[f] = true;});
                    setTimeout(() => {
                        setShake((prev2) => ({...prev2, ...Object.fromEntries(missingFields.map(f => [f, false]))}));
                    }, 400);
                    return newShake;
                });
                setShowError(true);
                return false;
            }
            setShowError(false);
            return true;
        }
    }));
    // When analysis type changes, clear the unrelated dynamic records
    useEffect(() => {
        if (analysisType === 'Metagenomic') {
            setFormData(prev => ({...prev, wgsRecords: [{isolateID: '', organism: ''}]}));
        } else if (analysisType === 'WGS') {
            setFormData(prev => ({...prev, metagenomicRecords: [{sequence_name: '', element_type: '', class: '', subclass: ''}]}));
        }
    }, [analysisType, setFormData]);

    const {user} = useAuth();

    // Set default value for collected_by to user.userID if not already set
    useEffect(() => {
        if (user && !formData.collected_by) {
            setFormData(prev => ({...prev, collected_by: user.userID}));
        }
    }, [user, setFormData, formData.collected_by]);

    return (
        <Stack gap="md">
            {/* Error message for required fields */}
            {showError && error && (
                <div style={{color: 'red', marginBottom: 8, fontWeight: 500}}>
                    Please fill in all required fields.
                </div>
            )}
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
                    data={['Metagenomic', 'Whole Genome Sequence (WGS)']}
                    value={analysisType}
                    onChange={(val) => {
                        setAnalysisType(val || '');
                        setFormData({...formData, sample_analysis_type: val || ''});
                        setTouched((prev) => ({...prev, sample_analysis_type: true}));
                    }}
                    required
                    className={shake.sample_analysis_type ? styles.shake : ''}
                    error={touched.sample_analysis_type && !analysisType ? 'Required' : undefined}
                />

                <TextInput
                    label="Isolation Source"
                    value={formData.isolation_source}
                    onChange={(e) => {
                        setFormData({...formData, isolation_source: e.target.value});
                        setTouched((prev) => ({...prev, isolation_source: true}));
                    }}
                    required
                    className={shake.isolation_source ? styles.shake : ''}
                    error={touched.isolation_source && !formData.isolation_source ? 'Required' : undefined}
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
                    onChange={(e) => {
                        setFormData({...formData, location_name: e.target.value});
                        setTouched((prev) => ({...prev, location_name: true}));
                    }}
                    required
                    className={shake.location_name ? styles.shake : ''}
                    error={touched.location_name && !formData.location_name ? 'Required' : undefined}
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
            </SimpleGrid>
        </Stack>
    );
});

export default SampleInfoStep;