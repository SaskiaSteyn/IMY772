import {useState, useRef} from 'react';
import {
    Modal,
    Stepper,
    Button,
    Group,
    Center,
    Text,
    Stack,
} from '@mantine/core';
import {ArrowRight, ArrowLeft} from 'lucide-react';

import MethodSelectionStep from './steps/method-selection-step';
import SampleInfoStep from './steps/sample-info-step';
import MetagenomicStep from './steps/metagenomic-step';
import WgsStep from './steps/wgs-step';
import AmrGenesStep from './steps/amr-genes-step';
import VirulenceGenesStep from './steps/virulence-genes-step';
import JsonUploadStep from './steps/json-upload-step';
import ExpandedDataModal from './expanded-data-modal';

const AddDataModal = ({opened, onClose, onAddEntry}) => {
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
        collected_by: 'Researcher A',
        uploaded_by: '',
        metagenomicRecords: [
            {sequence_name: '', element_type: '', class: '', subclass: ''},
        ],
        wgsRecords: [{isolateID: '', organism: ''}],
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
            collected_by: 'Researcher A',
            uploaded_by: '',
            metagenomicRecords: [
                {sequence_name: '', element_type: '', class: '', subclass: ''},
            ],
            wgsRecords: [{isolateID: '', organism: ''}],
            amrGenes: [''],
            virulenceGenes: [''],
        });
    };

    const sampleInfoRef = useRef();
    const metagenomicRef = useRef();
    const wgsRef = useRef();
    const amrGenesRef = useRef();
    const virulenceGenesRef = useRef();

    const [sampleInfoValid, setSampleInfoValid] = useState(true);
    const [metagenomicValid, setMetagenomicValid] = useState(true);
    const [wgsValid, setWgsValid] = useState(true);
    const [amrGenesValid, setAmrGenesValid] = useState(true);
    const [virulenceGenesValid, setVirulenceGenesValid] = useState(true);

    const [showSampleInfoError, setShowSampleInfoError] = useState(false);
    const [showMetagenomicError, setShowMetagenomicError] = useState(false);
    const [showWgsError, setShowWgsError] = useState(false);
    const [showAmrGenesError, setShowAmrGenesError] = useState(false);
    const [showVirulenceGenesError, setShowVirulenceGenesError] = useState(false);

    const [expandedModalOpen, setExpandedModalOpen] = useState(false);

    const nextStepper = () => {
        // Step 0: Sample Info
        if (stepperIndex === 0 && sampleInfoRef.current) {
            const valid = sampleInfoRef.current.validate();
            setShowSampleInfoError(!valid);
            if (!valid) return;
        }
        // Step 1: Analysis Details (Metagenomic or WGS)
        if (stepperIndex === 1) {
            if (isMetagenomic && metagenomicRef.current) {
                const valid = metagenomicRef.current.validate();
                setShowMetagenomicError(!valid);
                if (!valid) return;
            } else if (!isMetagenomic && wgsRef.current) {
                const valid = wgsRef.current.validate();
                setShowWgsError(!valid);
                if (!valid) return;
            }
        }
        // Step 2: Genes (AMR or Virulence)
        if (stepperIndex === 2) {
            if (isMetagenomic && amrGenesRef.current) {
                const valid = amrGenesRef.current.validate();
                setShowAmrGenesError(!valid);
                if (!valid) return;
            } else if (!isMetagenomic && virulenceGenesRef.current) {
                const valid = virulenceGenesRef.current.validate();
                setShowVirulenceGenesError(!valid);
                if (!valid) return;
            }
        }
        // Clear errors before moving
        setShowSampleInfoError(false);
        setShowMetagenomicError(false);
        setShowWgsError(false);
        setShowAmrGenesError(false);
        setShowVirulenceGenesError(false);
        setStepperIndex((s) => s + 1);
    };

    const prevStepper = () => setStepperIndex((s) => Math.max(s - 1, 0));

    const buildFinalData = () => {
        const base = {
            water_temperature: formData.water_temperature,
            ph: formData.ph,
            tds: formData.tds,
            do: formData.do,
            sample_analysis_type: formData.sample_analysis_type.toLowerCase(),
            isolation_source: formData.isolation_source,
            collection_date: formData.collection_date?.toISOString().split('T')[0],
            location_name: formData.location_name,
            latitude: formData.latitude,
            longitude: formData.longitude,
            collected_by: formData.collected_by,
            uploaded_by: formData.uploaded_by,
        };

        if (isMetagenomic) {
            const amrGenesList = formData.amrGenes.filter((g) => g.trim() !== '');
            const metagenomicRecords = formData.metagenomicRecords.map((record) => ({
                sequence_name: record.sequence_name,
                element_type: record.element_type,
                class: record.class,
                subclass: record.subclass,
                amr_resistance_genes: [...amrGenesList],
            }));
            return {...base, metagenomic: metagenomicRecords};
        } else {
            const virulenceGenesList = formData.virulenceGenes.filter((g) => g.trim() !== '');
            const wgsRecords = formData.wgsRecords
                .map((record) => ({
                    isolateID: record.isolateID ? parseInt(record.isolateID, 10) : null,
                    organism: record.organism,
                    virulence_genes: [...virulenceGenesList],
                }))
                .filter((record) => record.isolateID !== null);
            return {...base, wgs: wgsRecords};
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

    // Preview data for expanded modal (unchanged)
    const previewSample = {...formData, sampleID: 'Preview'};
    const previewMetagenomic = isMetagenomic ? formData.metagenomicRecords.map((rec) => ({...rec, sampleID: 'Preview'})) : [];
    const previewWgs = !isMetagenomic ? formData.wgsRecords.map((rec) => ({...rec, sampleID: 'Preview'})) : [];
    const previewAmrGenes = isMetagenomic ? formData.amrGenes.filter(g => g.trim() !== '').map(g => ({sampleID: 'Preview', geneSymbol: g})) : [];
    const previewVirulenceGenes = !isMetagenomic ? formData.virulenceGenes.filter(g => g.trim() !== '').map(g => ({
        'wgs.sampleID': 'Preview',
        'wgs.isolateID': formData.wgsRecords[0]?.isolateID || '',
        geneSymbol: g,
    })) : [];

    const renderManualForm = () => (
        <Stack gap='lg'>
            <Stepper active={stepperIndex} onStepClick={setStepperIndex}>
                <Stepper.Step label='Sample Info' description='Core sample data'>
                    <SampleInfoStep
                        ref={sampleInfoRef}
                        formData={formData}
                        setFormData={setFormData}
                        analysisType={analysisType}
                        setAnalysisType={setAnalysisType}
                        onValidationChange={setSampleInfoValid}
                    />
                </Stepper.Step>

                <Stepper.Step
                    label='Analysis Details'
                    description={isMetagenomic ? 'Metagenomic Records' : 'WGS Records'}
                >
                    {isMetagenomic ? (
                        <MetagenomicStep
                            ref={metagenomicRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={setMetagenomicValid}
                        />
                    ) : (
                        <WgsStep
                            ref={wgsRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={setWgsValid}
                        />
                    )}
                </Stepper.Step>

                <Stepper.Step
                    label='Genes'
                    description={isMetagenomic ? 'AMR Resistance Genes' : 'Virulence Genes'}
                >
                    {isMetagenomic ? (
                        <AmrGenesStep
                            ref={amrGenesRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={setAmrGenesValid}
                        />
                    ) : (
                        <VirulenceGenesStep
                            ref={virulenceGenesRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={setVirulenceGenesValid}
                        />
                    )}
                </Stepper.Step>

                <Stepper.Completed>
                    <Center py='xl' style={{flexDirection: 'column'}}>
                        <Text size='lg' fw={500} mb='md'>
                            Review your data and click "Add Data"
                        </Text>
                        <Button
                            variant='light'
                            color='blue'
                            onClick={() => setExpandedModalOpen(true)}
                            style={{margin: '0 auto'}}
                        >
                            Expand Recorded Data
                        </Button>
                    </Center>
                </Stepper.Completed>
            </Stepper>

            <Group justify='space-between' mt='lg'>
                <Group>
                    {stepperIndex > 0 && stepperIndex < 3 && (
                        <Button variant='default' onClick={prevStepper} leftSection={<ArrowLeft size={18} />}>
                            Back
                        </Button>
                    )}
                </Group>
                <Group>
                    {/* Step-specific error messages */}
                    {showSampleInfoError && stepperIndex === 0 && (
                        <span style={{color: 'red', fontWeight: 500, marginRight: 12}}>
                            Please fill in all required fields.
                        </span>
                    )}
                    {showMetagenomicError && stepperIndex === 1 && isMetagenomic && (
                        <span style={{color: 'red', fontWeight: 500, marginRight: 12}}>
                            Please fill in all required fields for each record.
                        </span>
                    )}
                    {showWgsError && stepperIndex === 1 && !isMetagenomic && (
                        <span style={{color: 'red', fontWeight: 500, marginRight: 12}}>
                            Please fill in all WGS record fields.
                        </span>
                    )}
                    {showAmrGenesError && stepperIndex === 2 && isMetagenomic && (
                        <span style={{color: 'red', fontWeight: 500, marginRight: 12}}>
                            Please fill in all gene symbols.
                        </span>
                    )}
                    {showVirulenceGenesError && stepperIndex === 2 && !isMetagenomic && (
                        <span style={{color: 'red', fontWeight: 500, marginRight: 12}}>
                            Please fill in all gene symbols.
                        </span>
                    )}

                    {stepperIndex < 3 && (
                        <Button
                            onClick={nextStepper}
                            rightSection={<ArrowRight size={18} />}
                            disabled={
                                (stepperIndex === 0 && !sampleInfoValid) ||
                                (stepperIndex === 1 && isMetagenomic && !metagenomicValid) ||
                                (stepperIndex === 1 && !isMetagenomic && !wgsValid) ||
                                (stepperIndex === 2 && isMetagenomic && !amrGenesValid) ||
                                (stepperIndex === 2 && !isMetagenomic && !virulenceGenesValid)
                            }
                        >
                            Next
                        </Button>
                    )}
                    {stepperIndex === 3 && <Button onClick={handleSubmit}>Add Data</Button>}
                </Group>
            </Group>
        </Stack>
    );

    return (
        <>
            <Modal
                opened={opened}
                onClose={closeModal}
                title='Add New Data Entry'
                size='lg'
                centered
                radius='md'
                styles={{title: {fontWeight: 600, fontSize: 18}}}
            >
                {topStep === 0 && <MethodSelectionStep onSelect={handleModeSelect} />}
                {topStep === 1 && renderManualForm()}
                {topStep === 2 && <JsonUploadStep onSubmit={handleJsonSubmit} onBack={handleJsonBack} />}
            </Modal>
            <ExpandedDataModal
                opened={expandedModalOpen}
                onClose={() => setExpandedModalOpen(false)}
                sample={previewSample}
                metagenomic={previewMetagenomic}
                wgs={previewWgs}
                amrGenes={previewAmrGenes}
                virulenceGenes={previewVirulenceGenes}
            />
        </>
    );
};

export default AddDataModal;