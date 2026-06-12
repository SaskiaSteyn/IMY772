import {Stack, Select, TextInput, Button, Group, Text, Loader, Badge} from '@mantine/core';
import {forwardRef, useImperativeHandle, useState, useEffect, useRef} from 'react';
import {predictPhenotype} from '../../../api/sample-data-management';

const PhenotypeFormStep = forwardRef(({formData, setFormData, onAddMore, onValidationChange}, ref) => {
    const [phenotypeData, setPhenotypeData] = useState({organism: '', antibiotic: '', predicted_sir_profile: null});
    const [touched, setTouched] = useState({});
    const [customOrganism, setCustomOrganism] = useState('');
    const [customAntibiotic, setCustomAntibiotic] = useState('');
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [predictionError, setPredictionError] = useState('');
    const [aiPrediction, setAiPrediction] = useState(null);
    const abortRef = useRef(null);

    const organisms = [
        'Escherichia coli',
        'Staphylococcus aureus',
        'Salmonella enterica',
        'Listeria monocytogenes',
        'Campylobacter jejuni',
        'Vibrio parahaemolyticus',
        'Clostridium difficile',
        'Enterococcus faecalis',
        'Other',
    ];

    const antibiotics = [
        'Ampicillin',
        'Amoxicillin',
        'Cephalexin',
        'Ciprofloxacin',
        'Tetracycline',
        'Gentamicin',
        'Chloramphenicol',
        'Trimethoprim-Sulfamethoxazole',
        'Vancomycin',
        'Ceftriaxone',
        'Azithromycin',
        'Fluoroquinolone',
        'Other',
    ];

    const handleChange = (field, value) => {
        setPhenotypeData((prev) => ({...prev, [field]: value}));
        setTouched((prev) => ({...prev, [field]: true}));
    };

    const effectiveOrganism = phenotypeData.organism === 'Other' ? customOrganism : phenotypeData.organism;
    const effectiveAntibiotic = phenotypeData.antibiotic === 'Other' ? customAntibiotic : phenotypeData.antibiotic;

    // Trigger AI prediction whenever organism + antibiotic are both set
    useEffect(() => {
        if (!effectiveOrganism || !effectiveAntibiotic) {
            setAiPrediction(null);
            setPredictionError('');
            return;
        }

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setPredictionLoading(true);
        setPredictionError('');

        const payload = {
            organism: effectiveOrganism,
            antibiotic: effectiveAntibiotic,
            latitude: formData?.latitude ?? 0,
            longitude: formData?.longitude ?? 0,
            water_temp: formData?.water_temp ?? null,
            ph: formData?.ph ?? null,
            tds: formData?.tds ?? null,
            do: formData?.do ?? null,
            isolation_source: formData?.isolation_source ?? null,
        };

        predictPhenotype(payload, controller.signal)
            .then((prediction) => {
                if (!controller.signal.aborted) {
                    const predicted = prediction?.predicted_sir_profile ?? null;
                    setAiPrediction(predicted);
                    setPhenotypeData((prev) => ({
                        ...prev,
                        predicted_sir_profile: predicted,
                    }));
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) setPredictionError('AI prediction unavailable');
            })
            .finally(() => {
                if (!controller.signal.aborted) setPredictionLoading(false);
            });

        return () => controller.abort();
    }, [effectiveOrganism, effectiveAntibiotic]);

    const isValid = effectiveOrganism.trim() !== '' && effectiveAntibiotic.trim() !== '';

    const getEffectiveData = () => ({
        ...phenotypeData,
        organism: effectiveOrganism,
        antibiotic: effectiveAntibiotic,
    });

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!isValid) {
                setTouched({organism: true, antibiotic: true});
                if (onValidationChange) onValidationChange(false);
                return false;
            }
            if (onValidationChange) onValidationChange(true);
            return true;
        },
        getData: getEffectiveData,
        reset: () => {
            setPhenotypeData({organism: '', antibiotic: '', predicted_sir_profile: null});
            setCustomOrganism('');
            setCustomAntibiotic('');
            setAiPrediction(null);
            setPredictionError('');
            setTouched({});
        },
    }));

    return (
        <Stack gap="md" py="md">
            <div>
                <Text fw={600} mb="sm">Add Predicted Phenotype</Text>
                <Text size="sm" c="dimmed" mb="md">Enter phenotype information</Text>
            </div>

            <Select
                label="Organism"
                placeholder="Select or type organism"
                data={organisms}
                value={phenotypeData.organism}
                onChange={(value) => {
                    handleChange('organism', value || '');
                    if (value !== 'Other') setCustomOrganism('');
                }}
                error={touched.organism && !effectiveOrganism ? 'Organism is required' : ''}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create "${query}"`}
            />

            {phenotypeData.organism === 'Other' && (
                <TextInput
                    label="Specify organism"
                    placeholder="Enter organism name"
                    value={customOrganism}
                    onChange={(e) => setCustomOrganism(e.currentTarget.value)}
                    error={touched.organism && !customOrganism.trim() ? 'Please specify the organism' : ''}
                    autoFocus
                />
            )}

            <Select
                label="Antibiotic"
                placeholder="Select or type antibiotic"
                data={antibiotics}
                value={phenotypeData.antibiotic}
                onChange={(value) => {
                    handleChange('antibiotic', value || '');
                    if (value !== 'Other') setCustomAntibiotic('');
                }}
                error={touched.antibiotic && !effectiveAntibiotic ? 'Antibiotic is required' : ''}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create "${query}"`}
            />

            {phenotypeData.antibiotic === 'Other' && (
                <TextInput
                    label="Specify antibiotic"
                    placeholder="Enter antibiotic name"
                    value={customAntibiotic}
                    onChange={(e) => setCustomAntibiotic(e.currentTarget.value)}
                    error={touched.antibiotic && !customAntibiotic.trim() ? 'Please specify the antibiotic' : ''}
                    autoFocus
                />
            )}

            {/* AI prediction result */}
            {(predictionLoading || aiPrediction || predictionError) && (
                <Group gap="xs" align="center">
                    <Text size="sm" fw={500}>AI Prediction:</Text>
                    {predictionLoading && <Loader size="xs" />}
                    {!predictionLoading && aiPrediction && (
                        <Badge color={aiPrediction === 'Resistant' ? 'red' : aiPrediction === 'Susceptible' ? 'green' : 'orange'}>
                            {aiPrediction}
                        </Badge>
                    )}
                    {!predictionLoading && predictionError && (
                        <Text size="xs" c="dimmed">{predictionError}</Text>
                    )}
                </Group>
            )}

            <Select
                label="Resistance Status"
                description={aiPrediction ? 'Pre-filled by AI — override if needed' : 'Select resistance status'}
                placeholder="Select status"
                data={['Susceptible', 'Intermediate', 'Resistant']}
                value={phenotypeData.predicted_sir_profile}
                onChange={(value) => handleChange('predicted_sir_profile', value)}
            />

            {onAddMore && (
                <Group justify="flex-end" mt="lg">
                    <Button
                        variant="light"
                        onClick={() => {
                            if (isValid) {
                                onAddMore(getEffectiveData());
                                setPhenotypeData({organism: '', antibiotic: '', predicted_sir_profile: null});
                                setCustomOrganism('');
                                setCustomAntibiotic('');
                                setAiPrediction(null);
                                setPredictionError('');
                                setTouched({});
                            } else {
                                setTouched({organism: true, antibiotic: true});
                            }
                        }}
                    >
                        + Add Another Phenotype
                    </Button>
                </Group>
            )}
        </Stack>
    );
});

PhenotypeFormStep.displayName = 'PhenotypeFormStep';
export default PhenotypeFormStep;
