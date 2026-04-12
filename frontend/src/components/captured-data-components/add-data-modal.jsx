import { useState } from 'react';
import {
    Modal,
    Stepper,
    Button,
    Group,
    Center,
    Text,
    Stack,
} from '@mantine/core';
import { ArrowRight, ArrowLeft } from 'lucide-react';

import MethodSelectionStep from './steps/method-selection-step';
import SampleInfoStep from './steps/sample-info-step';
import MetagenomicStep from './steps/metagenomic-step';
import WgsStep from './steps/wgs-step';
import AmrGenesStep from './steps/amr-genes-step';
import VirulenceGenesStep from './steps/virulence-genes-step';
import JsonUploadStep from './steps/json-upload-step';

const AddDataModal = ({ opened, onClose, onAddEntry }) => {
    const [topStep, setTopStep] = useState(1);
    const [stepperIndex, setStepperIndex] = useState(0);
    const [analysisType, setAnalysisType] = useState('');

    const [formData, setFormData] = useState({
        water_temperature: 25.0,
        ph: 7.0,
        tds: 100.0,
        do: 100.0,
        sample_analysis_type: '',
        isolation_source: '',
        collection_date: new Date(),
        location_name: '',
        latitude: -25.7479,
        longitude: 28.2293,
        collected_by: '',
        predicted_sir_profile: '',
        metagenomicRecords: [
            { sequence_name: '', element_type: '', class: '', subclass: '' },
        ],
        wgsRecords: [{ isolateID: '', organism: '' }],
        amrGenes: [''],
        virulenceGenes: [''],
    });

    const isMetagenomic = analysisType === 'Metagenomic';

    const handleModeSelect = (selectedMode) => {
        if (selectedMode === 'manual') {
            setTopStep(1);
            setStepperIndex(0);
        } else if (selectedMode === 'json') {
            setTopStep(2);
        }
    };

    const resetModal = () => {
        setTopStep(1);
        setStepperIndex(0);
        setAnalysisType('');
        setFormData({
            water_temperature: 25.0,
            ph: 7.0,
            tds: 100.0,
            do: 100.0,
            sample_analysis_type: '',
            isolation_source: '',
            collection_date: new Date(),
            location_name: '',
            latitude: -25.7479,
            longitude: 28.2293,
            collected_by: '',
            predicted_sir_profile: '',
            metagenomicRecords: [
                {
                    sequence_name: '',
                    element_type: '',
                    class: '',
                    subclass: '',
                },
            ],
            wgsRecords: [{ isolateID: '', organism: '' }],
            amrGenes: [''],
            virulenceGenes: [''],
        });
    };

    const nextStepper = () => setStepperIndex((s) => s + 1);
    const prevStepper = () => setStepperIndex((s) => Math.max(s - 1, 0));

    const buildFinalData = () => {
        // Base sample fields
        const base = {
            water_temperature: formData.water_temperature,
            ph: formData.ph,
            tds: formData.tds,
            do: formData.do,
            sample_analysis_type: formData.sample_analysis_type.toLowerCase(), // "metagenomic" or "wgs"
            isolation_source: formData.isolation_source,
            collection_date: formData.collection_date
                ?.toISOString()
                .split('T')[0],
            location_name: formData.location_name,
            latitude: formData.latitude,
            longitude: formData.longitude,
            collected_by: formData.collected_by,
            predicted_sir_profile: formData.predicted_sir_profile,
        };

        if (isMetagenomic) {
            const amrGenesList = formData.amrGenes.filter(
                (g) => g.trim() !== '',
            );
            const metagenomicRecords = formData.metagenomicRecords.map(
                (record) => ({
                    sequence_name: record.sequence_name,
                    element_type: record.element_type,
                    class: record.class,
                    subclass: record.subclass,
                    amr_resistance_genes: [...amrGenesList], // same genes for every record
                }),
            );
            return {
                ...base,
                metagenomic: metagenomicRecords,
            };
        } else {
            const virulenceGenesList = formData.virulenceGenes.filter(
                (g) => g.trim() !== '',
            );
            const wgsRecords = formData.wgsRecords
                .map((record) => ({
                    isolateID: record.isolateID
                        ? parseInt(record.isolateID, 10)
                        : null,
                    organism: record.organism,
                    virulence_genes: [...virulenceGenesList],
                }))
                .filter((record) => record.isolateID !== null);
            return {
                ...base,
                wgs: wgsRecords,
            };
        }
    };

    const handleSubmit = () => {
        const finalData = buildFinalData();
        console.log('Final data being submitted:', finalData);
        onAddEntry(finalData);
        onClose();
        resetModal();
    };

    const handleJsonSubmit = (parsedData) => {
        onAddEntry(parsedData);
        onClose();
        resetModal();
    };

    const handleJsonBack = () => {
        setTopStep(1);
    };

    const closeModal = () => {
        onClose();
        resetModal();
    };

    const renderManualForm = () => (
        <Stack gap='lg'>
            <Stepper active={stepperIndex} onStepClick={setStepperIndex}>
                <Stepper.Step
                    label='Sample Info'
                    description='Core sample data'
                >
                    <SampleInfoStep
                        formData={formData}
                        setFormData={setFormData}
                        analysisType={analysisType}
                        setAnalysisType={setAnalysisType}
                    />
                </Stepper.Step>

                <Stepper.Step
                    label='Analysis Details'
                    description={
                        isMetagenomic ? 'Metagenomic Records' : 'WGS Records'
                    }
                >
                    {isMetagenomic ? (
                        <MetagenomicStep
                            formData={formData}
                            setFormData={setFormData}
                        />
                    ) : (
                        <WgsStep
                            formData={formData}
                            setFormData={setFormData}
                        />
                    )}
                </Stepper.Step>

                <Stepper.Step
                    label='Genes'
                    description={
                        isMetagenomic
                            ? 'AMR Resistance Genes'
                            : 'Virulence Genes'
                    }
                >
                    {isMetagenomic ? (
                        <AmrGenesStep
                            formData={formData}
                            setFormData={setFormData}
                        />
                    ) : (
                        <VirulenceGenesStep
                            formData={formData}
                            setFormData={setFormData}
                        />
                    )}
                </Stepper.Step>

                <Stepper.Completed>
                    <Center py='xl'>
                        <Text size='lg' fw={500}>
                            Review your data and click "Add Data"
                        </Text>
                    </Center>
                </Stepper.Completed>
            </Stepper>

            <Group justify='space-between' mt='lg'>
                <Group>
                    {stepperIndex > 0 && (
                        <Button
                            variant='default'
                            onClick={prevStepper}
                            leftSection={<ArrowLeft size={18} />}
                        >
                            Back
                        </Button>
                    )}
                </Group>
                {stepperIndex < 3 && (
                    <Button
                        onClick={nextStepper}
                        rightSection={<ArrowRight size={18} />}
                    >
                        Next
                    </Button>
                )}
                {stepperIndex === 3 && (
                    <Button onClick={handleSubmit}>Add Data</Button>
                )}
            </Group>
        </Stack>
    );

    return (
        <Modal
            opened={opened}
            onClose={closeModal}
            title='Add New Data Entry'
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
            {topStep === 0 && (
                <MethodSelectionStep onSelect={handleModeSelect} />
            )}
            {topStep === 1 && renderManualForm()}
            {topStep === 2 && (
                <JsonUploadStep
                    onSubmit={handleJsonSubmit}
                    onBack={handleJsonBack}
                />
            )}
        </Modal>
    );
};

export default AddDataModal;
