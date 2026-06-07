import {Stack, Select, Checkbox, Button, Group, Text} from '@mantine/core';
import {forwardRef, useImperativeHandle, useState} from 'react';

const PhenotypeFormStep = forwardRef(({formData, setFormData, onAddMore, onValidationChange}, ref) => {
    const [phenotypeData, setPhenotypeData] = useState({organism: '', antibiotic: '', resistant: false});
    const [touched, setTouched] = useState({});

    const organisms = [
        'Escherichia coli',
        'Staphylococcus aureus',
        'Salmonella enterica',
        'Listeria monocytogenes',
        'Campylobacter jejuni',
        'Vibrio parahaemolyticus',
        'Clostridium difficile',
        'Enterococcus faecalis',
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
    ];

    const handleChange = (field, value) => {
        setPhenotypeData((prev) => ({...prev, [field]: value}));
        setTouched((prev) => ({...prev, [field]: true}));
    };

    const isValid = phenotypeData.organism && phenotypeData.antibiotic;

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
        getData: () => phenotypeData,
        reset: () => {
            setPhenotypeData({organism: '', antibiotic: '', resistant: false});
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
                onChange={(value) => handleChange('organism', value || '')}
                error={touched.organism && !phenotypeData.organism ? 'Organism is required' : ''}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create "${query}"`}
            />

            <Select
                label="Antibiotic"
                placeholder="Select or type antibiotic"
                data={antibiotics}
                value={phenotypeData.antibiotic}
                onChange={(value) => handleChange('antibiotic', value || '')}
                error={touched.antibiotic && !phenotypeData.antibiotic ? 'Antibiotic is required' : ''}
                searchable
                creatable
                getCreateLabel={(query) => `+ Create "${query}"`}
            />

            <Checkbox
                label="Resistant"
                checked={phenotypeData.resistant}
                onChange={(e) => handleChange('resistant', e.currentTarget.checked)}
            />

            {onAddMore && (
                <Group justify="flex-end" mt="lg">
                    <Button
                        variant="light"
                        onClick={() => {
                            if (isValid) {
                                onAddMore(phenotypeData);
                                setPhenotypeData({organism: '', antibiotic: '', resistant: false});
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
