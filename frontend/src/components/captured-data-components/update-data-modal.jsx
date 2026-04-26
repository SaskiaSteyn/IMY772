import {useState, useEffect, useRef} from 'react';
import {Modal, Stepper, Button, Group, Stack, Text, Center} from '@mantine/core';
import {ArrowRight, ArrowLeft} from 'lucide-react';
import SampleInfoStep from './steps/sample-info-step';
import MetagenomicStep from './steps/metagenomic-step';
import WgsStep from './steps/wgs-step';
import AmrGenesStep from './steps/amr-genes-step';
import VirulenceGenesStep from './steps/virulence-genes-step';
import ExpandedDataModal from './expanded-data-modal';
import {
    fetchSampleById,
    fetchMetagenomicBySample,
    fetchWgsBySample,
    fetchAmrBySample,
    fetchVirulenceBySample,
    updateFullSample,
} from '../../api/sample-data-management';

const UpdateDataModal = ({opened, onClose, sampleID, onUpdateSuccess}) => {
    const [loading, setLoading] = useState(true);
    const [stepperIndex, setStepperIndex] = useState(0);
    const [analysisType, setAnalysisType] = useState('');
    const [formData, setFormData] = useState(null);
    const [expandedModalOpen, setExpandedModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Refs for validation
    const sampleInfoRef = useRef();
    const metagenomicRef = useRef();
    const wgsRef = useRef();
    const amrGenesRef = useRef();
    const virulenceGenesRef = useRef();

    // Validation states
    const [sampleInfoValid, setSampleInfoValid] = useState(true);
    const [metagenomicValid, setMetagenomicValid] = useState(true);
    const [wgsValid, setWgsValid] = useState(true);
    const [amrGenesValid, setAmrGenesValid] = useState(true);
    const [virulenceGenesValid, setVirulenceGenesValid] = useState(true);

    // Reset all internal state when modal closes
    const resetModal = () => {
        setStepperIndex(0);
        setAnalysisType('');
        setFormData(null);
        setErrorMessage('');
        setExpandedModalOpen(false);
        setLoading(true);
        setSampleInfoValid(true);
        setMetagenomicValid(true);
        setWgsValid(true);
        setAmrGenesValid(true);
        setVirulenceGenesValid(true);
    };

    const handleModalClose = () => {
        resetModal();
        onClose();
    };

    // Load existing data
    useEffect(() => {
        if (!opened || !sampleID) return;
        const loadData = async () => {
            setLoading(true);
            try {
                const [sample, metagenomic, wgs, amr, virulence] = await Promise.all([
                    fetchSampleById(sampleID),
                    fetchMetagenomicBySample(sampleID),
                    fetchWgsBySample(sampleID),
                    fetchAmrBySample(sampleID),
                    fetchVirulenceBySample(sampleID),
                ]);

                // Determine analysis type
                const type = sample.sample_analysis_type === 'metagenomic' ? 'Metagenomic' : 'WGS';
                setAnalysisType(type);

                // Build form data structure
                const isMetagenomic = type === 'Metagenomic';
                setFormData({
                    water_temperature: sample.water_temperature ?? 25.0,
                    ph: sample.ph ?? 7.0,
                    tds: sample.tds ?? 100.0,
                    do: sample.do ?? 100.0,
                    sample_analysis_type: sample.sample_analysis_type,
                    isolation_source: sample.isolation_source || '',
                    collection_date: sample.collection_date ? new Date(sample.collection_date) : new Date(),
                    location_name: sample.location_name || '',
                    latitude: sample.latitude ?? -25.7479,
                    longitude: sample.longitude ?? 28.2293,
                    collected_by: sample.collected_by || '',
                    // Dynamic records
                    metagenomicRecords: isMetagenomic && metagenomic.length ? metagenomic : [{sequence_name: '', element_type: '', class: '', subclass: ''}],
                    wgsRecords: !isMetagenomic && wgs.length ? wgs : [{isolateID: '', organism: ''}],
                    amrGenes: isMetagenomic && amr.length ? amr.map(a => a.geneSymbol) : [''],
                    virulenceGenes: !isMetagenomic && virulence.length ? virulence.map(v => v.geneSymbol) : [''],
                });
            } catch (err) {
                console.error('Failed to load sample data:', err);
                setErrorMessage('Could not load sample data.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [opened, sampleID]);

    const isMetagenomic = analysisType === 'Metagenomic';

    const nextStepper = () => {
        if (stepperIndex === 0 && sampleInfoRef.current) {
            if (!sampleInfoRef.current.validate()) return;
        }
        if (stepperIndex === 1) {
            if (isMetagenomic && metagenomicRef.current) {
                if (!metagenomicRef.current.validate()) return;
            } else if (!isMetagenomic && wgsRef.current) {
                if (!wgsRef.current.validate()) return;
            }
        }
        if (stepperIndex === 2) {
            if (isMetagenomic && amrGenesRef.current) {
                if (!amrGenesRef.current.validate()) return;
            } else if (!isMetagenomic && virulenceGenesRef.current) {
                if (!virulenceGenesRef.current.validate()) return;
            }
        }
        setStepperIndex(s => s + 1);
    };

    const prevStepper = () => setStepperIndex(s => Math.max(s - 1, 0));

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
        };

        if (isMetagenomic) {
            const amrGenesList = formData.amrGenes.filter(g => g.trim() !== '');
            const metagenomicRecords = formData.metagenomicRecords.map(record => ({
                sequence_name: record.sequence_name,
                element_type: record.element_type,
                class: record.class,
                subclass: record.subclass,
                amr_resistance_genes: [...amrGenesList],
            }));
            return {...base, metagenomic: metagenomicRecords, amrGenes: amrGenesList};
        } else {
            const virulenceGenesList = formData.virulenceGenes.filter(g => g.trim() !== '');
            const wgsRecords = formData.wgsRecords
                .map(record => ({
                    isolateID: record.isolateID ? parseInt(record.isolateID, 10) : null,
                    organism: record.organism,
                }))
                .filter(record => record.isolateID !== null);
            // Build virulence array with isolateID
            const virulenceGenesWithIsolate = [];
            if (wgsRecords.length > 0) {
                const firstIsolateID = wgsRecords[0].isolateID;
                virulenceGenesList.forEach(gene => {
                    virulenceGenesWithIsolate.push({isolateID: firstIsolateID, geneSymbol: gene});
                });
            }
            return {...base, wgs: wgsRecords, virulenceGenes: virulenceGenesWithIsolate};
        }
    };

    const handleSubmit = async () => {
        const finalData = buildFinalData();
        try {
            await updateFullSample(sampleID, finalData);
            onUpdateSuccess();
            handleModalClose();
        } catch (err) {
            console.error('Update failed:', err);
            setErrorMessage('Update failed. Please try again.');
        }
    };

    // Preview data for expanded modal
    const previewSample = formData ? {...formData, sampleID} : null;
    const previewMetagenomic = isMetagenomic && formData ? formData.metagenomicRecords.map(rec => ({...rec, sampleID})) : [];
    const previewWgs = !isMetagenomic && formData ? formData.wgsRecords.map(rec => ({...rec, sampleID})) : [];
    const previewAmrGenes = isMetagenomic && formData ? formData.amrGenes.filter(g => g.trim() !== '').map(g => ({sampleID, geneSymbol: g})) : [];
    const previewVirulenceGenes = !isMetagenomic && formData ? formData.virulenceGenes.filter(g => g.trim() !== '').map(g => ({'wgs.sampleID': sampleID, geneSymbol: g})) : [];

    if (loading) {
        return <Modal opened={opened} onClose={handleModalClose} title="Loading Sample..." centered><Text>Loading data...</Text></Modal>;
    }

    if (!formData) return null;

    return (
        <>
            <Modal opened={opened} onClose={handleModalClose} title={`Update Sample ${sampleID}`} size="lg" centered>
                <Stack gap="lg">
                    {errorMessage && <Text c="red">{errorMessage}</Text>}
                    <Stepper active={stepperIndex}>
                        <Stepper.Step label="Sample Info" description="Edit core data">
                            <SampleInfoStep
                                ref={sampleInfoRef}
                                formData={formData}
                                setFormData={setFormData}
                                analysisType={analysisType}
                                setAnalysisType={setAnalysisType}
                                onValidationChange={setSampleInfoValid}
                            />
                        </Stepper.Step>
                        <Stepper.Step label="Analysis Details" description={isMetagenomic ? 'Metagenomic Records' : 'WGS Records'}>
                            {isMetagenomic ? (
                                <MetagenomicStep ref={metagenomicRef} formData={formData} setFormData={setFormData} onValidationChange={setMetagenomicValid} />
                            ) : (
                                <WgsStep ref={wgsRef} formData={formData} setFormData={setFormData} onValidationChange={setWgsValid} />
                            )}
                        </Stepper.Step>
                        <Stepper.Step label="Genes" description={isMetagenomic ? 'AMR Genes' : 'Virulence Genes'}>
                            {isMetagenomic ? (
                                <AmrGenesStep ref={amrGenesRef} formData={formData} setFormData={setFormData} onValidationChange={setAmrGenesValid} />
                            ) : (
                                <VirulenceGenesStep ref={virulenceGenesRef} formData={formData} setFormData={setFormData} onValidationChange={setVirulenceGenesValid} />
                            )}
                        </Stepper.Step>
                        <Stepper.Completed>
                            <Center py="xl" style={{flexDirection: 'column'}}>
                                <Text size="lg" fw={500} mb="md">Review your changes</Text>
                                <Button variant="light" color="blue" onClick={() => setExpandedModalOpen(true)}>Expand Recorded Data</Button>
                            </Center>
                        </Stepper.Completed>
                    </Stepper>

                    <Group justify="space-between" mt="lg">
                        <Group>
                            {stepperIndex > 0 && stepperIndex < 3 && (
                                <Button variant="default" onClick={prevStepper} leftSection={<ArrowLeft size={18} />}>Back</Button>
                            )}
                        </Group>
                        <Group>
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
                            {stepperIndex === 3 && (
                                <>
                                    <Button variant="default" onClick={handleModalClose}>Cancel</Button>
                                    <Button onClick={handleSubmit}>Confirm Update</Button>
                                </>
                            )}
                        </Group>
                    </Group>
                </Stack>
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

export default UpdateDataModal;