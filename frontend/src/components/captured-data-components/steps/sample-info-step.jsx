import {Stack, SimpleGrid, NumberInput, TextInput, Text, Group, Loader} from '@mantine/core';
import {DatePickerInput} from '@mantine/dates';
import {forwardRef, useImperativeHandle, useState, useEffect, useRef} from 'react';
import {fetchSampleById} from '../../../api/sample-data-management';

const SampleInfoStep = forwardRef(({formData, setFormData, onValidationChange}, ref) => {
    const [touched, setTouched] = useState({});
    const [sampleIdTaken, setSampleIdTaken] = useState(false);
    const [sampleIdChecking, setSampleIdChecking] = useState(false);
    const checkAbortRef = useRef(null);

    const requiredFields = {
        sample_id: formData.sample_id,
        collection_date: formData.collection_date,
        location_name: formData.location_name,
        latitude: formData.latitude,
        longitude: formData.longitude,
        isolation_source: formData.isolation_source,
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([, v]) => !v || v === '')
        .map(([k]) => k);

    const isValid = missingFields.length === 0 && !sampleIdTaken && !sampleIdChecking;

    useEffect(() => {
        if (onValidationChange) {
            onValidationChange(isValid);
        }
    }, [isValid, onValidationChange]);

    // Check sample_id uniqueness when it changes (debounced)
    useEffect(() => {
        const id = formData.sample_id?.trim();
        if (!id) {
            setSampleIdTaken(false);
            return;
        }

        setSampleIdChecking(true);
        if (checkAbortRef.current) checkAbortRef.current.abort();
        const controller = new AbortController();
        checkAbortRef.current = controller;

        const timer = setTimeout(() => {
            fetchSampleById(id, controller.signal)
                .then(() => {
                    if (!controller.signal.aborted) setSampleIdTaken(true);
                })
                .catch(() => {
                    if (!controller.signal.aborted) setSampleIdTaken(false);
                })
                .finally(() => {
                    if (!controller.signal.aborted) setSampleIdChecking(false);
                });
        }, 400);

        return () => {
            clearTimeout(timer);
            controller.abort();
            setSampleIdChecking(false);
        };
    }, [formData.sample_id]);

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (missingFields.length > 0 || sampleIdTaken) {
                const newTouched = {};
                missingFields.forEach((f) => { newTouched[f] = true; });
                setTouched((prev) => ({...prev, ...newTouched}));
                if (onValidationChange) onValidationChange(false);
                return false;
            }
            if (onValidationChange) onValidationChange(true);
            return true;
        },
    }));

    const handleChange = (field, value) => {
        setFormData((prev) => ({...prev, [field]: value}));
        setTouched((prev) => ({...prev, [field]: true}));
    };

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Sample Information</Text>
                <Text size="sm" c="dimmed" mb="md">Enter basic sample details</Text>
            </div>

            {/* Sample ID and Collection Date */}
            <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
                <TextInput
                    label="Sample ID"
                    placeholder="e.g., SA-2026-001"
                    value={formData.sample_id || ''}
                    onChange={(e) => handleChange('sample_id', e.currentTarget.value)}
                    error={
                        (touched.sample_id && !formData.sample_id)
                            ? 'Sample ID is required'
                            : sampleIdTaken
                            ? 'This Sample ID already exists — please choose a different one'
                            : ''
                    }
                    rightSection={sampleIdChecking ? <Loader size="xs" /> : null}
                    required
                />

                <DatePickerInput
                    label="Collection Date"
                    placeholder="Select date"
                    value={formData.collection_date}
                    onChange={(date) => handleChange('collection_date', date)}
                    error={touched.collection_date && !formData.collection_date ? 'Collection date is required' : ''}
                    required
                />
            </SimpleGrid>

            {/* Location and Coordinates */}
            <div>
                <Text fw={600} mb="sm">Location</Text>
            </div>
            <TextInput
                label="Location Name"
                placeholder="e.g., Vaal Dam, Pretoria"
                value={formData.location_name || ''}
                onChange={(e) => handleChange('location_name', e.currentTarget.value)}
                error={touched.location_name && !formData.location_name ? 'Location name is required' : ''}
                required
            />

            <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
                <NumberInput
                    label="Latitude"
                    placeholder="-25.7479"
                    decimalScale={6}
                    value={formData.latitude}
                    onChange={(val) => handleChange('latitude', val)}
                    error={touched.latitude && !formData.latitude ? 'Latitude is required' : ''}
                    required
                />

                <NumberInput
                    label="Longitude"
                    placeholder="28.2293"
                    decimalScale={6}
                    value={formData.longitude}
                    onChange={(val) => handleChange('longitude', val)}
                    error={touched.longitude && !formData.longitude ? 'Longitude is required' : ''}
                    required
                />
            </SimpleGrid>

            {/* Isolation Source */}
            <TextInput
                label="Isolation Source"
                placeholder="e.g., water, soil, clinical sample"
                value={formData.isolation_source || ''}
                onChange={(e) => handleChange('isolation_source', e.currentTarget.value)}
                error={touched.isolation_source && !formData.isolation_source ? 'Isolation source is required' : ''}
                required
            />

            {/* Water Quality Parameters */}
            <div>
                <Text fw={600} mb="sm">Water Quality Parameters</Text>
            </div>
            <SimpleGrid cols={{base: 1, sm: 2}} spacing="md">
                <NumberInput
                    label="Water Temperature (°C)"
                    placeholder="25.0"
                    decimalScale={2}
                    value={formData.water_temp}
                    onChange={(val) => handleChange('water_temp', val)}
                />

                <NumberInput
                    label="pH Level"
                    placeholder="7.0"
                    decimalScale={2}
                    value={formData.ph}
                    onChange={(val) => handleChange('ph', val)}
                />

                <NumberInput
                    label="Total Dissolved Solids (TDS)"
                    placeholder="100.0"
                    decimalScale={2}
                    value={formData.tds}
                    onChange={(val) => handleChange('tds', val)}
                />

                <NumberInput
                    label="Dissolved Oxygen (DO)"
                    placeholder="100.0"
                    decimalScale={2}
                    value={formData.do}
                    onChange={(val) => handleChange('do', val)}
                />
            </SimpleGrid>
        </Stack>
    );
});

SampleInfoStep.displayName = 'SampleInfoStep';
export default SampleInfoStep;

// OLD COMMENTED CODE BELOW - ARCHIVE
// const SampleInfoStepOld = forwardRef(
//     (
//         {
//             formData,
//             setFormData,
//             analysisType,
//             setAnalysisType,
//             onValidationChange,
//         },
//         ref,
//     ) => {
//         const [touched, setTouched] = useState({
//             sample_analysis_type: false,
//             isolation_source: false,
//             location_name: false,
//         });
//         const [shake, setShake] = useState({
//             sample_analysis_type: false,
//             isolation_source: false,
//             location_name: false,
//         });
//         const [error, setError] = useState(false);
//         const [showError, setShowError] = useState(false);
//         const [predictionError, setPredictionError] = useState('');
//         const [predictionLoading, setPredictionLoading] = useState(false);
//         const [predictionMeta, setPredictionMeta] = useState(null);
//         // Validation logic
//         const requiredFields = {
//             sample_analysis_type: analysisType,
//             isolation_source: formData.isolation_source,
//             location_name: formData.location_name,
//         };
//         const missingFields = Object.entries(requiredFields)
//             .filter(([, v]) => !v || v === '')
//             .map(([k]) => k);
//         useEffect(() => {
//             setError(missingFields.length > 0);
//             if (onValidationChange)
//                 onValidationChange(missingFields.length === 0);
//             if (missingFields.length === 0 && showError) setShowError(false);
//         }, [missingFields.length, onValidationChange, showError]);

//         useImperativeHandle(ref, () => ({
//             validate: () => {
//                 if (missingFields.length > 0) {
//                     setTouched((prev) => ({
//                         ...prev,
//                         ...Object.fromEntries(
//                             missingFields.map((f) => [f, true]),
//                         ),
//                     }));
//                     setShake((prev) => {
//                         const newShake = { ...prev };
//                         missingFields.forEach((f) => {
//                             newShake[f] = true;
//                         });
//                         setTimeout(() => {
//                             setShake((prev2) => ({
//                                 ...prev2,
//                                 ...Object.fromEntries(
//                                     missingFields.map((f) => [f, false]),
//                                 ),
//                             }));
//                         }, 400);
//                         return newShake;
//                     });
//                     setShowError(true);
//                     return false;
//                 }
//                 setShowError(false);
//                 return true;
//             },
//         }));
//         // When analysis type changes, clear the unrelated dynamic records
//         useEffect(() => {
//             if (analysisType === 'Metagenomic') {
//                 setFormData((prev) => ({
//                     ...prev,
//                     wgsRecords: [{ isolateID: '', organism: '' }],
//                 }));
//             } else if (analysisType === 'WGS') {
//                 setFormData((prev) => ({
//                     ...prev,
//                     metagenomicRecords: [
//                         {
//                             sequence_name: '',
//                             element_type: '',
//                             class: '',
//                             subclass: '',
//                         },
//                     ],
//                 }));
//             }
//         }, [analysisType, setFormData]);

//         const { user } = useAuth();

//         // Set default value for uploaded_by to user.userID when component mounts
//         useEffect(() => {
//             if (user?.userID && !formData.uploaded_by) {
//                 setFormData((prev) => ({ ...prev, uploaded_by: user.userID }));
//             }
//         }, [user?.userID, formData.uploaded_by, setFormData]);

//         const hasValidCoordinates =
//             Number.isFinite(Number(formData.latitude)) &&
//             Number.isFinite(Number(formData.longitude));

//         const runPrediction = useCallback(
//             async (signal) => {
//                 if (!hasValidCoordinates) {
//                     return;
//                 }

//                 setPredictionLoading(true);
//                 setPredictionError('');

//                 try {
//                     const prediction = await predictSirProfile(
//                         {
//                             latitude: formData.latitude,
//                             longitude: formData.longitude,
//                             water_temperature: formData.water_temperature,
//                             ph: formData.ph,
//                             tds: formData.tds,
//                             do: formData.do,
//                             sample_analysis_type: analysisType || null,
//                             isolation_source: formData.isolation_source || null,
//                         },
//                         signal,
//                     );
//                     const predictedValue =
//                         prediction?.predicted_sir_profile || '';

//                     setFormData((prev) => ({
//                         ...prev,
//                         predicted_sir_profile: predictedValue,
//                     }));
//                     setPredictionMeta(prediction || null);
//                 } catch (err) {
//                     if (err?.name === 'AbortError') {
//                         return;
//                     }

//                     setPredictionError(
//                         'Unable to generate SIR prediction right now.',
//                     );
//                     setPredictionMeta(null);
//                 } finally {
//                     setPredictionLoading(false);
//                 }
//             },
//             [
//                 analysisType,
//                 formData.latitude,
//                 formData.longitude,
//                 formData.water_temperature,
//                 formData.ph,
//                 formData.tds,
//                 formData.do,
//                 formData.isolation_source,
//                 hasValidCoordinates,
//                 setFormData,
//             ],
//         );

//         useEffect(() => {
//             if (!hasValidCoordinates) {
//                 setPredictionMeta(null);
//                 setPredictionError('');
//                 setFormData((prev) => ({ ...prev, predicted_sir_profile: '' }));
//                 return;
//             }

//             const controller = new AbortController();
//             const timeout = setTimeout(() => {
//                 runPrediction(controller.signal);
//             }, 700);

//             return () => {
//                 clearTimeout(timeout);
//                 controller.abort();
//             };
//         }, [hasValidCoordinates, runPrediction, setFormData]);

//         return (
//             <Stack gap='md'>
//                 {/* Error message for required fields */}
//                 {showError && error && (
//                     <div
//                         style={{
//                             color: 'red',
//                             marginBottom: 8,
//                             fontWeight: 500,
//                         }}
//                     >
//                         Please fill in all required fields.
//                     </div>
//                 )}
//                 <SimpleGrid cols={2} spacing='md'>
//                     <NumberInput
//                         label='Water Temperature (°C)'
//                         decimalScale={2}
//                         value={formData.water_temperature}
//                         onChange={(val) =>
//                             setFormData({ ...formData, water_temperature: val })
//                         }
//                     />
//                     <NumberInput
//                         label='pH Level'
//                         decimalScale={2}
//                         value={formData.ph}
//                         onChange={(val) =>
//                             setFormData({ ...formData, ph: val })
//                         }
//                     />
//                     <NumberInput
//                         label='Total Dissolved Solids (TDS)'
//                         value={formData.tds}
//                         onChange={(val) =>
//                             setFormData({ ...formData, tds: val })
//                         }
//                     />
//                     <NumberInput
//                         label='Dissolved Oxygen (DO)'
//                         value={formData.do}
//                         onChange={(val) =>
//                             setFormData({ ...formData, do: val })
//                         }
//                     />

//                     <Select
//                         label='Sample Analysis Type'
//                         placeholder='Select type'
//                         data={['Metagenomic', 'Whole Genome Sequence (WGS)']}
//                         value={analysisType}
//                         onChange={(val) => {
//                             setAnalysisType(val || '');
//                             setFormData({
//                                 ...formData,
//                                 sample_analysis_type: val || '',
//                             });
//                             setTouched((prev) => ({
//                                 ...prev,
//                                 sample_analysis_type: true,
//                             }));
//                         }}
//                         required
//                         className={
//                             shake.sample_analysis_type ? styles.shake : ''
//                         }
//                         error={
//                             touched.sample_analysis_type && !analysisType
//                                 ? 'Required'
//                                 : undefined
//                         }
//                     />

//                     <TextInput
//                         label='Isolation Source'
//                         value={formData.isolation_source}
//                         onChange={(e) => {
//                             setFormData({
//                                 ...formData,
//                                 isolation_source: e.target.value,
//                             });
//                             setTouched((prev) => ({
//                                 ...prev,
//                                 isolation_source: true,
//                             }));
//                         }}
//                         required
//                         className={shake.isolation_source ? styles.shake : ''}
//                         error={
//                             touched.isolation_source &&
//                             !formData.isolation_source
//                                 ? 'Required'
//                                 : undefined
//                         }
//                     />
//                 </SimpleGrid>

//                 <SimpleGrid cols={2} spacing='md'>
//                     <DatePickerInput
//                         label='Collection Date'
//                         value={formData.collection_date}
//                         onChange={(date) =>
//                             setFormData({ ...formData, collection_date: date })
//                         }
//                     />

//                     <TextInput
//                         label='Location Name'
//                         value={formData.location_name}
//                         onChange={(e) => {
//                             setFormData({
//                                 ...formData,
//                                 location_name: e.target.value,
//                             });
//                             setTouched((prev) => ({
//                                 ...prev,
//                                 location_name: true,
//                             }));
//                         }}
//                         required
//                         className={shake.location_name ? styles.shake : ''}
//                         error={
//                             touched.location_name && !formData.location_name
//                                 ? 'Required'
//                                 : undefined
//                         }
//                     />
//                 </SimpleGrid>

//                 <SimpleGrid cols={2} spacing='md'>
//                     <NumberInput
//                         label='Latitude'
//                         decimalScale={8}
//                         value={formData.latitude}
//                         onChange={(val) =>
//                             setFormData({ ...formData, latitude: val })
//                         }
//                     />

//                     <NumberInput
//                         label='Longitude'
//                         decimalScale={8}
//                         value={formData.longitude}
//                         onChange={(val) =>
//                             setFormData({ ...formData, longitude: val })
//                         }
//                     />
//                 </SimpleGrid>

//                 <SimpleGrid cols={1} spacing='md'>
//                     <TextInput
//                         label='Collected By'
//                         value={formData.collected_by}
//                         onChange={(e) =>
//                             setFormData({
//                                 ...formData,
//                                 collected_by: e.target.value,
//                             })
//                         }
//                     />
//                     <TextInput
//                         label='AI Predicted SIR Profile'
//                         value={formatSirProfileLabel(
//                             formData.predicted_sir_profile,
//                             '',
//                         )}
//                         readOnly
//                         description='Auto-generated from nearby coordinates and previous labeled samples.'
//                     />
//                 </SimpleGrid>

//                 <Stack gap={6}>
//                     <Button
//                         type='button'
//                         variant='light'
//                         loading={predictionLoading}
//                         onClick={() => runPrediction()}
//                         disabled={!hasValidCoordinates}
//                     >
//                         Regenerate AI Prediction
//                     </Button>

//                     {predictionMeta?.confidence !== undefined && (
//                         <Text size='xs' c='dimmed'>
//                             Confidence:{' '}
//                             {Math.round(
//                                 Number(predictionMeta.confidence) * 100,
//                             )}
//                             %{' '}
//                             {predictionMeta?.usedOpenAI
//                                 ? '(OpenAI)'
//                                 : '(Fallback model)'}
//                         </Text>
//                     )}

//                     {predictionError && (
//                         <Text size='xs' c='red'>
//                             {predictionError}
//                         </Text>
//                     )}
//                 </Stack>
//             </Stack>
//         );
//     },
// );

// export default SampleInfoStep;
