import {
    Button,
    Center,
    Group,
    Modal,
    Stack,
    Text,
    Badge,
    Paper,
    Divider,
} from '@mantine/core';
import {ArrowLeft, ArrowRight, Check} from 'lucide-react';
import {useRef, useState} from 'react';
import {useAuth} from '../../context/auth-context';

// Step components
import MethodSelectionStep from './steps/method-selection-step';
import EntryTypeSelectionStep from './steps/entry-type-selection-step';
import SampleSelectionStep from './steps/sample-selection-step';
import SampleInfoStep from './steps/sample-info-step';
import OptionalDataTypeStep from './steps/optional-data-type-step';
import DataTypeSelectionStep from './steps/data-type-selection-step';
import IsolateFormStep from './steps/isolate-form-step';
import PhenotypeFormStep from './steps/phenotype-form-step';
import AmrFindingFormStep from './steps/amr-finding-form-step';
import VirulenceGenesStep from './steps/virulence-genes-step';
import JsonUploadStep from './steps/json-upload-step';
import ImageUploadStep from './steps/image-upload-step';

// API
import {
    createSample,
    createIsolate,
    createPredictedPhenotype,
    createAmrFinding,
    createVirulenceGene,
} from '../../api/sample-data-management';
import {mapExtractionToFormData} from '../../lib/extraction-mapping';

const AddDataModal = ({opened, onClose, onAddEntry, samples = []}) => {
    const {user} = useAuth();
    const [stepIndex, setStepIndex] = useState(0);
    const [method, setMethod] = useState(''); // 'manual', 'json', or 'image'
    const [entryType, setEntryType] = useState(''); // 'new-sample' or 'add-to-existing'
    const [dataType, setDataType] = useState(''); // 'isolates', 'phenotypes', or 'amr_findings'
    const [isValid, setIsValid] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        sample_id: '',
        sample_name: '',
        collected_by: '',
        collection_date: null,
        location_name: '',
        latitude: '',
        longitude: '',
        isolation_source: '',
        water_temp: 25.0,
        ph: 7.0,
        tds: 100.0,
        do: 100.0,
        selectedRelatedDataTypes: [],
        virulenceGenes: [{gene_symbol: '', method: '', percent_identity: '', coverage_percent: '', element_type: '', accession: '', alignment_length: '', target_length: '', ref_seq_length: '', sequence_name: ''}],
    });

    const [isolates, setIsolates] = useState([]);
    const [phenotypes, setPhenotypes] = useState([]);
    const [amrFindings, setAmrFindings] = useState([]);
    const [virulenceGenesList, setVirulenceGenesList] = useState([]);

    // Refs for step validation
    const sampleSelectionRef = useRef();
    const sampleInfoRef = useRef();
    const optionalDataTypeRef = useRef();
    const isolateFormRef = useRef();
    const phenotypeFormRef = useRef();
    const amrFindingFormRef = useRef();
    const virulenceGenesRef = useRef();
    const jsonUploadRef = useRef();

    // Determine total steps
    const getTotalSteps = () => {
        if (method === 'json') {
            return 3; // Method, JSON upload, Preview
        }
        if (method === 'manual') {
            if (entryType === 'new-sample') {
                // Steps 0-3 (Method, Entry Type, Sample Info, Related Data) + one per selected type
                const selectedTypes = formData.selectedRelatedDataTypes || [];
                return 4 + selectedTypes.length;
            }
            if (entryType === 'add-to-existing') {
                return 5; // Method, Entry Type, Sample Selection, Data Type Selection, Form
            }
        }
        return 2; // At least method and entry type
    };

    // Get current step label
    const getCurrentStepLabel = () => {
        if (!method) return 'Method';
        if (method === 'image' && stepIndex === 1) return 'Capture from Image';
        if (method === 'json') {
            if (stepIndex === 0) return 'Method';
            if (stepIndex === 1) return 'Upload File';
            if (stepIndex === 2) return 'Preview';
        }
        if (method === 'manual' && !entryType) return 'Entry Type';
        if (method === 'manual' && entryType === 'new-sample') {
            if (stepIndex === 1) return 'Entry Type';
            if (stepIndex === 2) return 'Sample Info';
            if (stepIndex === 3) return 'Related Data';
            if (stepIndex >= 4) {
                const selectedTypes = formData.selectedRelatedDataTypes || [];
                const typeAtStep = selectedTypes[stepIndex - 4];
                if (typeAtStep === 'isolates') return 'Add Isolate';
                if (typeAtStep === 'phenotypes') return 'Add Phenotype';
                if (typeAtStep === 'amr_findings') return 'Add AMR Finding';
                if (typeAtStep === 'virulence_genes') return 'Add Virulence Genes';
            }
        }
        if (method === 'manual' && entryType === 'add-to-existing') {
            if (stepIndex === 1) return 'Entry Type';
            if (stepIndex === 2) return 'Select Sample';
            if (stepIndex === 3) return 'Data Type';
            if (stepIndex === 4) return 'Form';
        }
        return 'Unknown';
    };

    const canProceedToNext = () => {
        if (stepIndex === 0) return method !== '';
        if (method === 'json' && stepIndex === 1) return isValid;
        if (stepIndex === 2 && !method) return entryType !== '';
        if (method === 'manual' && entryType === 'new-sample') {
            if (stepIndex === 2) return isValid; // Sample info
            if (stepIndex === 3) return true; // Optional data types are optional
            if (stepIndex >= 4) return isValid; // Dynamic forms
        }
        if (method === 'manual' && entryType === 'add-to-existing') {
            if (stepIndex === 2) return isValid; // Sample selection
            if (stepIndex === 3) return dataType !== '';
            if (stepIndex === 4) return isValid; // Form
        }
        return true;
    };

    const handleNext = async () => {
        if (stepIndex === getTotalSteps() - 1) {
            // Final submission
            handleSubmit();
        } else {
            setStepIndex((prev) => prev + 1);
        }
    };

    const handleValidationChange = (valid) => {
        setIsValid(valid);
    };

    // Image capture: OCR result -> pre-fill the sample form, then drop the user
    // into the standard manual "new sample" flow (step 2) to review/complete it.
    // Sample ID is never read from the image, so the user always supplies it.
    const handleImageExtracted = (result) => {
        const {updates} = mapExtractionToFormData(result);
        setFormData((prev) => ({...prev, ...updates, sample_id: ''}));
        setMethod('manual');
        setEntryType('new-sample');
        setIsValid(false);
        setStepIndex(2);
    };

    const handleAddIsolate = (isolateData) => {
        setIsolates((prev) => [...prev, isolateData]);
    };

    const handleAddPhenotype = (phenotypeData) => {
        setPhenotypes((prev) => [...prev, phenotypeData]);
    };

    const handleAddAmrFinding = (findingData) => {
        setAmrFindings((prev) => [...prev, findingData]);
    };

    const handleAddVirulenceGene = (geneData) => {
        setVirulenceGenesList((prev) => [...prev, geneData]);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            // Flush any unsaved data from the current form step into the arrays
            // (user may click Complete without clicking "+ Add Another")
            const currentIsolates = [...isolates];
            const currentPhenotypes = [...phenotypes];
            const currentAmrFindings = [...amrFindings];
            const currentVirulenceGenes = [...virulenceGenesList];
            if (entryType === 'add-to-existing') {
                if (dataType === 'isolates' && isolateFormRef.current) {
                    const d = isolateFormRef.current.getData();
                    if (d?.organism || d?.mlst_type) currentIsolates.push(d);
                } else if (dataType === 'phenotypes' && phenotypeFormRef.current) {
                    const d = phenotypeFormRef.current.getData();
                    if (d?.organism && d?.antibiotic) currentPhenotypes.push(d);
                } else if (dataType === 'amr_findings' && amrFindingFormRef.current) {
                    const d = amrFindingFormRef.current.getData();
                    if (d?.gene_symbol || d?.amr_class) currentAmrFindings.push(d);
                } else if (dataType === 'virulence_genes' && virulenceGenesRef.current) {
                    const d = virulenceGenesRef.current.getData();
                    if (d?.gene_symbol) currentVirulenceGenes.push(d);
                }
            } else if (entryType === 'new-sample') {
                const selectedTypes = formData.selectedRelatedDataTypes || [];
                const lastType = selectedTypes[selectedTypes.length - 1];
                if (lastType === 'isolates' && isolateFormRef.current) {
                    const d = isolateFormRef.current.getData();
                    if (d?.organism || d?.mlst_type) currentIsolates.push(d);
                } else if (lastType === 'phenotypes' && phenotypeFormRef.current) {
                    const d = phenotypeFormRef.current.getData();
                    if (d?.organism && d?.antibiotic) currentPhenotypes.push(d);
                } else if (lastType === 'amr_findings' && amrFindingFormRef.current) {
                    const d = amrFindingFormRef.current.getData();
                    if (d?.gene_symbol || d?.amr_class) currentAmrFindings.push(d);
                } else if (lastType === 'virulence_genes' && virulenceGenesRef.current) {
                    const d = virulenceGenesRef.current.getData();
                    if (d?.gene_symbol) currentVirulenceGenes.push(d);
                }
            }

            // First, create the sample
            const samplePayload = {
                sample_id: formData.sample_id,
                sample_name: formData.sample_name,
                collected_by: formData.collected_by || undefined,
                collection_date: formData.collection_date,
                location_name: formData.location_name,
                latitude: formData.latitude,
                longitude: formData.longitude,
                isolation_source: formData.isolation_source,
                water_temp: formData.water_temp,
                ph: formData.ph,
                tds: formData.tds,
                do: formData.do,
                uploaded_by: user?.userID,
            };

            let createdSample;
            if (entryType === 'new-sample') {
                createdSample = await createSample(samplePayload);
            } else {
                // For add-to-existing, get the sample_id from formData
                createdSample = {sample_id: formData.sample_id};
            }

            // Create related records (use flushed arrays to include any unsaved current form data)
            for (const isolate of currentIsolates) {
                await createIsolate({...isolate, sample_id: createdSample.sample_id});
            }

            for (const phenotype of currentPhenotypes) {
                await createPredictedPhenotype({...phenotype, sample_id: createdSample.sample_id});
            }

            for (const finding of currentAmrFindings) {
                await createAmrFinding({...finding, sample_id: createdSample.sample_id});
            }

            for (const gene of currentVirulenceGenes) {
                await createVirulenceGene({...gene, sample_id: createdSample.sample_id});
            }

            // Reset and close
            resetModal();
            if (onAddEntry) onAddEntry(createdSample);
            onClose();
        } catch (err) {
            setError(err.message || 'Error creating entry. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMoreItem = async (itemData, type) => {
        if (type === 'isolates') {
            handleAddIsolate(itemData);
        } else if (type === 'phenotypes') {
            handleAddPhenotype(itemData);
        } else if (type === 'amr_findings') {
            handleAddAmrFinding(itemData);
        } else if (type === 'virulence_genes') {
            handleAddVirulenceGene(itemData);
        }

        // Reset the form for next entry
        if (type === 'isolates' && isolateFormRef.current) {
            isolateFormRef.current.reset();
        } else if (type === 'phenotypes' && phenotypeFormRef.current) {
            phenotypeFormRef.current.reset();
        } else if (type === 'amr_findings' && amrFindingFormRef.current) {
            amrFindingFormRef.current.reset();
        } else if (type === 'virulence_genes' && virulenceGenesRef.current) {
            virulenceGenesRef.current.reset();
        }
    };

    const resetModal = () => {
        setStepIndex(0);
        setMethod('');
        setEntryType('');
        setDataType('');
        setIsValid(false);
        setError('');
        setFormData({
            sample_id: '',
            sample_name: '',
            collected_by: '',
            collection_date: null,
            location_name: '',
            latitude: '',
            longitude: '',
            isolation_source: '',
            water_temp: 25.0,
            ph: 7.0,
            tds: 100.0,
            do: 100.0,
            selectedRelatedDataTypes: [],
        });
        setIsolates([]);
        setPhenotypes([]);
        setAmrFindings([]);
        setVirulenceGenesList([]);
    };

    const renderStep = () => {
        // Step 0: Method Selection
        if (stepIndex === 0) {
            return (
                <MethodSelectionStep
                    onSelect={(selectedMethod) => {
                        setMethod(selectedMethod);
                        setStepIndex(1);
                    }}
                />
            );
        }

        // JSON method flow
        if (method === 'json') {
            if (stepIndex === 1) {
                return (
                    <JsonUploadStep
                        ref={jsonUploadRef}
                        onValidationChange={handleValidationChange}
                    />
                );
            }
            if (stepIndex === 2) {
                return <Center py="xl"><Text>Preview: Data loaded</Text></Center>;
            }
        }

        // Image capture flow - Step 1: upload + OCR, then hand off to the
        // manual new-sample flow (handleImageExtracted switches method/step).
        if (method === 'image' && stepIndex === 1) {
            return (
                <ImageUploadStep
                    onExtracted={handleImageExtracted}
                    onBack={() => {
                        setMethod('');
                        setStepIndex(0);
                    }}
                />
            );
        }

        // Manual method flow - Step 1: Entry Type Selection
        if (stepIndex === 1 && method === 'manual') {
            return (
                <EntryTypeSelectionStep
                    onSelect={(selected) => {
                        setEntryType(selected);
                        setStepIndex(2);
                    }}
                />
            );
        }

        // Manual + New Sample flow
        if (method === 'manual' && entryType === 'new-sample') {
            // Step 2: Sample Info
            if (stepIndex === 2) {
                return (
                    <SampleInfoStep
                        ref={sampleInfoRef}
                        formData={formData}
                        setFormData={setFormData}
                        onValidationChange={handleValidationChange}
                    />
                );
            }

            // Step 3: Optional Data Types
            if (stepIndex === 3) {
                return (
                    <OptionalDataTypeStep
                        ref={optionalDataTypeRef}
                        formData={formData}
                        setFormData={setFormData}
                        onValidationChange={handleValidationChange}
                    />
                );
            }

            // Step 4+: Dynamic form steps for each selected type (in selection order)
            const selectedTypes = formData.selectedRelatedDataTypes || [];
            if (selectedTypes.length > 0 && stepIndex >= 4) {
                const typeAtStep = selectedTypes[stepIndex - 4];
                if (typeAtStep === 'isolates') {
                    return (
                        <IsolateFormStep
                            ref={isolateFormRef}
                            formData={formData}
                            setFormData={setFormData}
                            onAddMore={(data) => handleAddMoreItem(data, 'isolates')}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
                if (typeAtStep === 'phenotypes') {
                    return (
                        <PhenotypeFormStep
                            ref={phenotypeFormRef}
                            formData={formData}
                            setFormData={setFormData}
                            onAddMore={(data) => handleAddMoreItem(data, 'phenotypes')}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
                if (typeAtStep === 'amr_findings') {
                    return (
                        <AmrFindingFormStep
                            ref={amrFindingFormRef}
                            formData={formData}
                            setFormData={setFormData}
                            onAddMore={(data) => handleAddMoreItem(data, 'amr_findings')}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
                if (typeAtStep === 'virulence_genes') {
                    return (
                        <VirulenceGenesStep
                            ref={virulenceGenesRef}
                            onAddMore={(data) => handleAddMoreItem(data, 'virulence_genes')}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
            }
        }

        // Manual + Add to Existing flow
        if (method === 'manual' && entryType === 'add-to-existing') {
            // Step 2: Sample Selection
            if (stepIndex === 2) {
                return (
                    <SampleSelectionStep
                        ref={sampleSelectionRef}
                        samples={samples}
                        formData={formData}
                        setFormData={setFormData}
                        onValidationChange={handleValidationChange}
                    />
                );
            }

            // Step 3: Data Type Selection
            if (stepIndex === 3) {
                return (
                    <DataTypeSelectionStep
                        onSelect={(selected) => {
                            setDataType(selected);
                            setStepIndex(4);
                        }}
                    />
                );
            }

            // Step 4: Data Entry Form
            if (stepIndex === 4) {
                if (dataType === 'isolates') {
                    return (
                        <IsolateFormStep
                            ref={isolateFormRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
                if (dataType === 'phenotypes') {
                    return (
                        <PhenotypeFormStep
                            ref={phenotypeFormRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
                if (dataType === 'amr_findings') {
                    return (
                        <AmrFindingFormStep
                            ref={amrFindingFormRef}
                            formData={formData}
                            setFormData={setFormData}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
                if (dataType === 'virulence_genes') {
                    return (
                        <VirulenceGenesStep
                            ref={virulenceGenesRef}
                            onValidationChange={handleValidationChange}
                        />
                    );
                }
            }
        }

        return <Text>Unknown step</Text>;
    };

    const handlePrevious = () => {
        if (stepIndex > 0) {
            setStepIndex((prev) => prev - 1);
        }
    };

    const isLastStep = stepIndex === getTotalSteps() - 1;

    return (
        <Modal
            opened={opened}
            onClose={() => {
                resetModal();
                onClose();
            }}
            title="Add New Entry"
            size="lg"
            centered
            closeOnClickOutside={false}
        >
            <Stack gap="lg">
                {/* Progress indicator */}
                {method && (
                    <Paper p="sm" bg="gray.0" radius="md">
                        <Group justify="space-between" align="center">
                            <Text size="sm" fw={500}>
                                {getCurrentStepLabel()}
                            </Text>
                            <Badge variant="light" size="lg">
                                Step {stepIndex + 1} of {getTotalSteps()}
                            </Badge>
                        </Group>
                    </Paper>
                )}

                {/* Error message */}
                {error && (
                    <Paper p="sm" bg="red.0" c="red.8" radius="md">
                        <Text size="sm">{error}</Text>
                    </Paper>
                )}

                {/* Step content */}
                {renderStep()}

                {/* Summary of added items */}
                {(isolates.length > 0 || phenotypes.length > 0 || amrFindings.length > 0) && (
                    <>
                        <Divider />
                        <Paper p="md" bg="blue.0" radius="md">
                            <Text fw={600} mb="sm">Added Data Summary</Text>
                            <Group gap="xs">
                                {isolates.length > 0 && (
                                    <Badge leftSection={<Check size={12} />} variant="light" color="blue">
                                        {isolates.length} Isolate(s)
                                    </Badge>
                                )}
                                {phenotypes.length > 0 && (
                                    <Badge leftSection={<Check size={12} />} variant="light" color="blue">
                                        {phenotypes.length} Phenotype(s)
                                    </Badge>
                                )}
                                {amrFindings.length > 0 && (
                                    <Badge leftSection={<Check size={12} />} variant="light" color="blue">
                                        {amrFindings.length} AMR Finding(s)
                                    </Badge>
                                )}
                            </Group>
                        </Paper>
                    </>
                )}

                {/* Navigation buttons (hidden during image capture — that step
                    has its own Cancel/Extract controls) */}
                {!(method === 'image' && stepIndex === 1) && (
                    <Group justify="space-between">
                        <Button
                            variant="default"
                            onClick={handlePrevious}
                            disabled={stepIndex === 0}
                            leftSection={<ArrowLeft size={18} />}
                        >
                            Previous
                        </Button>

                        <Button
                            onClick={handleNext}
                            disabled={!canProceedToNext()}
                            loading={loading}
                            rightSection={isLastStep ? <Check size={18} /> : <ArrowRight size={18} />}
                        >
                            {isLastStep ? 'Complete' : 'Next'}
                        </Button>
                    </Group>
                )}
            </Stack>
        </Modal>
    );
};

export default AddDataModal;
