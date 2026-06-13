import {useState, useEffect} from 'react';
import {Tabs, Button, Group, Title, Container, Stack, Loader, Center, Select, TextInput, SegmentedControl, SimpleGrid} from '@mantine/core';
import {Plus, Upload, Pencil, Search} from 'lucide-react';
import DashboardNavbar from '../../components/dashboard/dashboard-navbar.jsx';
import SamplesTable from '../../components/captured-data-components/samples-table';
import IsolatesTable from '../../components/captured-data-components/isolates-table';
import PredictedPhenotypesTable from '../../components/captured-data-components/predicted-phenotypes-table';
import AmrFindingsTable from '../../components/captured-data-components/amr-findings-table';
import VirulenceGenesTable from '../../components/captured-data-components/virulence-genes-table';
import AddDataModal from '../../components/captured-data-components/add-data-modal';
import BulkUploadModal from '../../components/captured-data-components/bulk-upload-modal';
import EditSampleModal from '../../components/captured-data-components/edit-sample-modal';
import EditIsolateModal from '../../components/captured-data-components/edit-isolate-modal';
import EditPhenotypeModal from '../../components/captured-data-components/edit-phenotype-modal';
import EditAmrFindingModal from '../../components/captured-data-components/edit-amr-finding-modal';
import EditVirulenceGenesModal from '../../components/captured-data-components/edit-virulence-genes-modal';
import ExpandedDataModal from '../../components/captured-data-components/expanded-data-modal.jsx';
import UpdateSampleSearchModal from '../../components/captured-data-components/update-sample-search-modal';
import UpdateDataModal from '../../components/captured-data-components/update-data-modal';
import {
    fetchAllSamples,
    fetchAllIsolates,
    fetchAllPredictedPhenotypes,
    fetchAllAmrFindings,
    fetchAllVirulenceGenes,
    createSample,
    updateSample,
    updateIsolate,
    updatePredictedPhenotype,
    updateAmrFinding,
    updateVirulenceGene,
} from '../../api/sample-data-management.js';
import {useAuth} from '../../context/auth-context.jsx';
import './captured-data.scss';

const CapturedData = () => {
    const {user} = useAuth();
    const [modalOpened, setModalOpened] = useState(false);
    const [bulkUploadModalOpened, setBulkUploadModalOpened] = useState(false);
    const [activeTab, setActiveTab] = useState('samples');
    const [samples, setSamples] = useState([]);
    const [isolates, setIsolates] = useState([]);
    const [phenotypes, setPhenotypes] = useState([]);
    const [amrFindings, setAmrFindings] = useState([]);
    const [virulenceGenes, setVirulenceGenes] = useState([]);
    const [highlightedSampleIds, setHighlightedSampleIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // Edit modal states
    const [editSampleModalOpened, setEditSampleModalOpened] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState(null);

    const [editIsolateModalOpened, setEditIsolateModalOpened] = useState(false);
    const [isolateToEdit, setIsolateToEdit] = useState(null);

    const [editPhenotypeModalOpened, setEditPhenotypeModalOpened] = useState(false);
    const [phenotypeToEdit, setPhenotypeToEdit] = useState(null);

    const [editAmrFindingModalOpened, setEditAmrFindingModalOpened] = useState(false);
    const [amrFindingToEdit, setAmrFindingToEdit] = useState(null);

    const [editVirulenceGeneModalOpened, setEditVirulenceGeneModalOpened] = useState(false);
    const [virulenceGeneToEdit, setVirulenceGeneToEdit] = useState(null);

    // Expanded modal state
    const [expandedModalOpened, setExpandedModalOpened] = useState(false);
    const [expandedData, setExpandedData] = useState({
        sample: null,
        isolates: [],
        phenotypes: [],
        amrFindings: [],
    });

    const [updateSearchOpened, setUpdateSearchOpened] = useState(false);
    const [selectedUpdateSampleId, setSelectedUpdateSampleId] = useState(null);
    const [updateDataOpened, setUpdateDataOpened] = useState(false);

    // Dual view state
    const [viewMode, setViewMode] = useState('single'); // 'single' or 'dual'
    const [primaryTable, setPrimaryTable] = useState('samples');
    const [secondaryTable, setSecondaryTable] = useState('isolates');
    const [searchQueryPrimary, setSearchQueryPrimary] = useState('');
    const [searchQuerySecondary, setSearchQuerySecondary] = useState('');
    const [searchFieldPrimary, setSearchFieldPrimary] = useState('sample_id');
    const [searchFieldSecondary, setSearchFieldSecondary] = useState('sample_id');

    // Table field mappings for search options
    const tableFieldsMap = {
        samples: [
            {value: 'sample_id', label: 'Sample ID'},
            {value: 'collection_date', label: 'Collection Date'},
            {value: 'location_name', label: 'Location'},
            {value: 'isolation_source', label: 'Isolation Source'},
        ],
        isolates: [
            {value: 'isolate_id', label: 'Isolate ID'},
            {value: 'sample_id', label: 'Sample ID'},
            {value: 'organism', label: 'Organism'},
            {value: 'mlst_type', label: 'MLST Type'},
        ],
        phenotypes: [
            {value: 'phenotype_id', label: 'Phenotype ID'},
            {value: 'sample_id', label: 'Sample ID'},
            {value: 'organism', label: 'Organism'},
            {value: 'antibiotic', label: 'Antibiotic'},
        ],
        amr: [
            {value: 'finding_id', label: 'Finding ID'},
            {value: 'sample_id', label: 'Sample ID'},
            {value: 'gene_symbol', label: 'Gene Symbol'},
            {value: 'amr_class', label: 'AMR Class'},
        ],
        virulence: [
            {value: 'virulence_gene_id', label: 'Gene ID'},
            {value: 'sample_id', label: 'Sample ID'},
            {value: 'gene_symbol', label: 'Gene Symbol'},
            {value: 'element_type', label: 'Element Type'},
        ],
    };

    // Filter records based on field and search value
    const filterRecords = (records, field, query) => {
        if (!query || query.trim() === '') return records;
        const lowerQuery = query.toLowerCase();
        return records.filter((record) => {
            const value = record[field];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(lowerQuery);
        });
    };

    // Load all data (with abort signal for cleanup)
    const loadAllData = async (signal) => {
        try {
            const [samplesData, isolatesData, phenotypesData, amrFindingsData, virulenceGenesData] = await Promise.all([
                fetchAllSamples(signal),
                fetchAllIsolates(signal),
                fetchAllPredictedPhenotypes(signal),
                fetchAllAmrFindings(signal),
                fetchAllVirulenceGenes(signal),
            ]);
            setSamples(samplesData);
            setIsolates(isolatesData);
            setPhenotypes(phenotypesData);
            setAmrFindings(amrFindingsData);
            setVirulenceGenes(virulenceGenesData);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to fetch data:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    // Refetch data when user becomes available (or user changes)
    useEffect(() => {
        const abortController = new AbortController();
        if (user?.userID) {
            setLoading(true);
            loadAllData(abortController.signal);
        } else if (user === null) {
            // No logged in user – clear data and stop loading
            setSamples([]);
            setIsolates([]);
            setPhenotypes([]);
            setAmrFindings([]);
            setVirulenceGenes([]);
            setLoading(false);
        }
        return () => abortController.abort();
    }, [user?.userID]); // Re-run when user ID changes (login/logout)

    // Clear highlight after 2 seconds (or 3 seconds for bulk uploads)
    useEffect(() => {
        if (highlightedSampleIds.size > 0) {
            const timeoutDuration = highlightedSampleIds.size > 1 ? 3000 : 2000;
            const timer = setTimeout(() => {
                setHighlightedSampleIds(new Set());
            }, timeoutDuration);
            return () => clearTimeout(timer);
        }
    }, [highlightedSampleIds]);

    // Filter data for current user
    const userSamples = user?.userID
        ? samples.filter((s) => Number(s.uploaded_by) === Number(user.userID))
        : [];

    const userSampleIds = new Set(userSamples.map((s) => s.sample_id));
    const filteredIsolates = isolates.filter((i) => userSampleIds.has(i.sample_id));
    const filteredPhenotypes = phenotypes.filter((p) => userSampleIds.has(p.sample_id));
    const filteredAmrFindings = amrFindings.filter((a) => userSampleIds.has(a.sample_id));
    const filteredVirulenceGenes = virulenceGenes.filter((v) => userSampleIds.has(v.sample_id));

    const handleAddEntry = async (createdSample) => {
        try {
            const [newSamples, newIsolates, newPhenotypes, newAmr, newVirulenceGenes] = await Promise.all([
                fetchAllSamples(),
                fetchAllIsolates(),
                fetchAllPredictedPhenotypes(),
                fetchAllAmrFindings(),
                fetchAllVirulenceGenes(),
            ]);
            setSamples(newSamples);
            setIsolates(newIsolates);
            setPhenotypes(newPhenotypes);
            setAmrFindings(newAmr);
            setVirulenceGenes(newVirulenceGenes);
            if (createdSample?.sample_id) {
                setHighlightedSampleIds(new Set([createdSample.sample_id]));
            }
            setActiveTab('samples');
            window.scrollTo({top: 0, behavior: 'smooth'});
        } catch (err) {
            console.error('Error refreshing data after add:', err);
        }
    };

    const handleUploadSuccess = async (uploadedIds = []) => {
        try {
            const [newSamples, newIsolates, newPhenotypes, newAmr, newVirulenceGenes] = await Promise.all([
                fetchAllSamples(),
                fetchAllIsolates(),
                fetchAllPredictedPhenotypes(),
                fetchAllAmrFindings(),
                fetchAllVirulenceGenes(),
            ]);
            setSamples(newSamples);
            setIsolates(newIsolates);
            setPhenotypes(newPhenotypes);
            setAmrFindings(newAmr);
            setVirulenceGenes(newVirulenceGenes);
            if (uploadedIds.length > 0) {
                setHighlightedSampleIds(new Set(uploadedIds));
            }
            setActiveTab('samples');
        } catch (error) {
            console.error('Failed to refresh data after bulk upload:', error);
        }
    };

    // Edit handlers
    const handleEditSampleClick = (record) => {
        setRecordToEdit(record);
        setEditSampleModalOpened(true);
    };

    const handleEditSampleSave = async (sampleId, updateData) => {
        try {
            await updateSample(sampleId, updateData);
            const data = await fetchAllSamples();
            setSamples(data);
            setHighlightedSampleIds(new Set([sampleId]));
            setEditSampleModalOpened(false);
        } catch (error) {
            console.error('Error updating sample:', error);
        }
    };

    const handleEditIsolateClick = (record) => {
        setIsolateToEdit(record);
        setEditIsolateModalOpened(true);
    };

    const handleEditIsolateSave = async (isolateId, updateData) => {
        try {
            await updateIsolate(isolateId, updateData);
            const data = await fetchAllIsolates();
            setIsolates(data);
            setEditIsolateModalOpened(false);
        } catch (error) {
            console.error('Error updating isolate:', error);
        }
    };

    const handleEditPhenotypeClick = (record) => {
        setPhenotypeToEdit(record);
        setEditPhenotypeModalOpened(true);
    };

    const handleEditPhenotypeSave = async (phenotypeId, updateData) => {
        try {
            await updatePredictedPhenotype(phenotypeId, updateData);
            const data = await fetchAllPredictedPhenotypes();
            setPhenotypes(data);
            setEditPhenotypeModalOpened(false);
        } catch (error) {
            console.error('Error updating phenotype:', error);
        }
    };

    const handleEditAmrFindingClick = (record) => {
        setAmrFindingToEdit(record);
        setEditAmrFindingModalOpened(true);
    };

    const handleEditAmrFindingSave = async (findingId, updateData) => {
        try {
            await updateAmrFinding(findingId, updateData);
            const data = await fetchAllAmrFindings();
            setAmrFindings(data);
            setEditAmrFindingModalOpened(false);
        } catch (error) {
            console.error('Error updating AMR finding:', error);
        }
    };

    const handleEditVirulenceGeneClick = (record) => {
        setVirulenceGeneToEdit(record);
        setEditVirulenceGeneModalOpened(true);
    };

    const handleEditVirulenceGeneSave = async (geneId, updateData) => {
        try {
            await updateVirulenceGene(geneId, updateData);
            const data = await fetchAllVirulenceGenes();
            setVirulenceGenes(data);
            setEditVirulenceGeneModalOpened(false);
        } catch (error) {
            console.error('Error updating virulence gene:', error);
        }
    };

    const handleExpandClick = (record) => {
        const sampleId = record.sample_id;
        if (!sampleId) return;

        const sample = samples.find(s => s.sample_id === sampleId);
        const sampleIsolates = isolates.filter(i => i.sample_id === sampleId);
        const samplePhenotypes = phenotypes.filter(p => p.sample_id === sampleId);
        const sampleAmrFindings = amrFindings.filter(a => a.sample_id === sampleId);

        setExpandedData({
            sample,
            isolates: sampleIsolates,
            phenotypes: samplePhenotypes,
            amrFindings: sampleAmrFindings,
        });
        setExpandedModalOpened(true);
    };

    const handleSelectSampleForUpdate = (sampleId) => {
        setSelectedUpdateSampleId(sampleId);
        setUpdateDataOpened(true);
    };

    const handleUpdateSuccess = async () => {
        const abortController = new AbortController();
        await loadAllData(abortController.signal);
        setHighlightedSampleIds(new Set([selectedUpdateSampleId]));
        setActiveTab('samples');
    };

    return (
        <div className='captured-data-page'>
            <DashboardNavbar />
            <Container size='xl' py='xl' className='captured-data-container'>
                <Stack gap='lg'>
                    <Group justify='space-between' align='flex-start'>
                        <Stack gap={0}>
                            <Title order={2}>Data</Title>
                        </Stack>
                        <Group gap='md'>
                            <Button
                                leftSection={<Upload size={18} />}
                                variant='outline'
                                onClick={() => setBulkUploadModalOpened(true)}
                            >
                                Upload Bulk Data
                            </Button>
<Button
                                leftSection={<Plus size={18} />}
                                onClick={() => setModalOpened(true)}
                            >
                                Add New Entry
                            </Button>
                        </Group>
                    </Group>

                    {loading ? (
                        <Center py="xl">
                            <Loader size="lg" />
                        </Center>
                    ) : (
                        <Stack gap='md'>
                            {/* View Mode Selector */}
                            <Group justify='space-between' align='center'>
                                <SegmentedControl
                                    value={viewMode}
                                    onChange={setViewMode}
                                    data={[
                                        {label: 'Single Table View', value: 'single'},
                                        {label: 'Dual Table View', value: 'dual'},
                                    ]}
                                />
                            </Group>

                            {/* Single Table View */}
                            {viewMode === 'single' ? (
                                <Tabs value={activeTab} onChange={setActiveTab} className='data-tabs'>
                                    <Tabs.List>
                                        <Tabs.Tab value='samples'>Samples</Tabs.Tab>
                                        <Tabs.Tab value='isolates'>Isolates</Tabs.Tab>
                                        <Tabs.Tab value='phenotypes'>Predicted Phenotypes</Tabs.Tab>
                                        <Tabs.Tab value='amr'>AMR Findings</Tabs.Tab>
                                        <Tabs.Tab value='virulence'>Virulence Genes</Tabs.Tab>
                                    </Tabs.List>

                                    <Tabs.Panel value='samples' pt='md'>
                                        <SamplesTable
                                            records={userSamples}
                                            highlightedSampleIds={highlightedSampleIds}
                                            onEditClick={handleEditSampleClick}
                                            onExpandClick={handleExpandClick}
                                        />
                                    </Tabs.Panel>
                                    <Tabs.Panel value='isolates' pt='md'>
                                        <IsolatesTable
                                            records={filteredIsolates}
                                            highlightedSampleIds={highlightedSampleIds}
                                            onEditClick={handleEditIsolateClick}
                                            onExpandClick={handleExpandClick}
                                        />
                                    </Tabs.Panel>
                                    <Tabs.Panel value='phenotypes' pt='md'>
                                        <PredictedPhenotypesTable
                                            records={filteredPhenotypes}
                                            highlightedSampleIds={highlightedSampleIds}
                                            onEditClick={handleEditPhenotypeClick}
                                            onExpandClick={handleExpandClick}
                                        />
                                    </Tabs.Panel>
                                    <Tabs.Panel value='amr' pt='md'>
                                        <AmrFindingsTable
                                            records={filteredAmrFindings}
                                            highlightedSampleIds={highlightedSampleIds}
                                            onEditClick={handleEditAmrFindingClick}
                                            onExpandClick={handleExpandClick}
                                        />
                                    </Tabs.Panel>
                                    <Tabs.Panel value='virulence' pt='md'>
                                        <VirulenceGenesTable
                                            records={filteredVirulenceGenes}
                                            highlightedSampleIds={highlightedSampleIds}
                                            onEditClick={handleEditVirulenceGeneClick}
                                            onExpandClick={handleExpandClick}
                                        />
                                    </Tabs.Panel>
                                </Tabs>
                            ) : (
                                /* Dual Table View */
                                <Stack gap='md'>
                                    {/* Dual Tables with Independent Controls */}
                                    <SimpleGrid cols={{base: 1, md: 2}} spacing={0}>
                                        {/* Primary Table Section */}
                                        <div style={{paddingRight: '1rem', borderRight: '2px solid #dee2e6'}}>
                                            {/* Primary Table Controls */}
                                            <Stack gap='sm' mb='md'>
                                                <Select
                                                    label='Primary Table'
                                                    placeholder='Select table'
                                                    value={primaryTable}
                                                    onChange={(val) => setPrimaryTable(val)}
                                                    data={[
                                                        {label: 'Samples', value: 'samples'},
                                                        {label: 'Isolates', value: 'isolates'},
                                                        {label: 'Predicted Phenotypes', value: 'phenotypes'},
                                                        {label: 'AMR Findings', value: 'amr'},
                                                        {label: 'Virulence Genes', value: 'virulence'},
                                                    ]}
                                                />
                                                <Select
                                                    label='Search Field'
                                                    placeholder='Select field'
                                                    value={searchFieldPrimary}
                                                    onChange={(val) => setSearchFieldPrimary(val || 'sample_id')}
                                                    data={tableFieldsMap[primaryTable]}
                                                />
                                                <TextInput
                                                    label='Search Value'
                                                    placeholder='Enter search value...'
                                                    value={searchQueryPrimary}
                                                    onChange={(e) => setSearchQueryPrimary(e.currentTarget.value)}
                                                    leftSection={<Search size={16} />}
                                                />
                                            </Stack>
                                            
                                            {/* Primary Table */}
                                            {primaryTable === 'samples' && (
                                                <SamplesTable
                                                    records={filterRecords(userSamples, searchFieldPrimary, searchQueryPrimary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditSampleClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {primaryTable === 'isolates' && (
                                                <IsolatesTable
                                                    records={filterRecords(filteredIsolates, searchFieldPrimary, searchQueryPrimary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditIsolateClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {primaryTable === 'phenotypes' && (
                                                <PredictedPhenotypesTable
                                                    records={filterRecords(filteredPhenotypes, searchFieldPrimary, searchQueryPrimary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditPhenotypeClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {primaryTable === 'amr' && (
                                                <AmrFindingsTable
                                                    records={filterRecords(filteredAmrFindings, searchFieldPrimary, searchQueryPrimary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditAmrFindingClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {primaryTable === 'virulence' && (
                                                <VirulenceGenesTable
                                                    records={filterRecords(filteredVirulenceGenes, searchFieldPrimary, searchQueryPrimary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditVirulenceGeneClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                        </div>

                                        {/* Secondary Table Section */}
                                        <div style={{paddingLeft: '1rem'}}>
                                            {/* Secondary Table Controls */}
                                            <Stack gap='sm' mb='md'>
                                                <Select
                                                    label='Secondary Table'
                                                    placeholder='Select table'
                                                    value={secondaryTable}
                                                    onChange={(val) => setSecondaryTable(val)}
                                                    data={[
                                                        {label: 'Samples', value: 'samples'},
                                                        {label: 'Isolates', value: 'isolates'},
                                                        {label: 'Predicted Phenotypes', value: 'phenotypes'},
                                                        {label: 'AMR Findings', value: 'amr'},
                                                        {label: 'Virulence Genes', value: 'virulence'},
                                                    ]}
                                                />
                                                <Select
                                                    label='Search Field'
                                                    placeholder='Select field'
                                                    value={searchFieldSecondary}
                                                    onChange={(val) => setSearchFieldSecondary(val || 'sample_id')}
                                                    data={tableFieldsMap[secondaryTable]}
                                                />
                                                <TextInput
                                                    label='Search Value'
                                                    placeholder='Enter search value...'
                                                    value={searchQuerySecondary}
                                                    onChange={(e) => setSearchQuerySecondary(e.currentTarget.value)}
                                                    leftSection={<Search size={16} />}
                                                />
                                            </Stack>
                                            
                                            {/* Secondary Table */}
                                            {secondaryTable === 'samples' && (
                                                <SamplesTable
                                                    records={filterRecords(userSamples, searchFieldSecondary, searchQuerySecondary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditSampleClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {secondaryTable === 'isolates' && (
                                                <IsolatesTable
                                                    records={filterRecords(filteredIsolates, searchFieldSecondary, searchQuerySecondary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditIsolateClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {secondaryTable === 'phenotypes' && (
                                                <PredictedPhenotypesTable
                                                    records={filterRecords(filteredPhenotypes, searchFieldSecondary, searchQuerySecondary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditPhenotypeClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {secondaryTable === 'amr' && (
                                                <AmrFindingsTable
                                                    records={filterRecords(filteredAmrFindings, searchFieldSecondary, searchQuerySecondary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditAmrFindingClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                            {secondaryTable === 'virulence' && (
                                                <VirulenceGenesTable
                                                    records={filterRecords(filteredVirulenceGenes, searchFieldSecondary, searchQuerySecondary)}
                                                    highlightedSampleIds={highlightedSampleIds}
                                                    onEditClick={handleEditVirulenceGeneClick}
                                                    onExpandClick={handleExpandClick}
                                                />
                                            )}
                                        </div>
                                    </SimpleGrid>
                                </Stack>
                            )}
                        </Stack>
                    )}</Stack>
            </Container>

            <>
                <AddDataModal opened={modalOpened} onClose={() => setModalOpened(false)} onAddEntry={handleAddEntry} samples={userSamples} />
                <BulkUploadModal isOpen={bulkUploadModalOpened} onClose={() => setBulkUploadModalOpened(false)} onUploadSuccess={handleUploadSuccess} />
                <EditSampleModal opened={editSampleModalOpened} onClose={() => setEditSampleModalOpened(false)} record={recordToEdit} onSave={handleEditSampleSave} />
                <EditIsolateModal opened={editIsolateModalOpened} onClose={() => setEditIsolateModalOpened(false)} record={isolateToEdit} onSave={handleEditIsolateSave} />
                <EditPhenotypeModal opened={editPhenotypeModalOpened} onClose={() => setEditPhenotypeModalOpened(false)} record={phenotypeToEdit} onSave={handleEditPhenotypeSave} />
                <EditAmrFindingModal opened={editAmrFindingModalOpened} onClose={() => setEditAmrFindingModalOpened(false)} record={amrFindingToEdit} onSave={handleEditAmrFindingSave} />
                <EditVirulenceGenesModal opened={editVirulenceGeneModalOpened} onClose={() => setEditVirulenceGeneModalOpened(false)} record={virulenceGeneToEdit} onSave={handleEditVirulenceGeneSave} />

                <ExpandedDataModal
                    opened={expandedModalOpened}
                    onClose={() => setExpandedModalOpened(false)}
                    sample={expandedData.sample}
                    isolates={expandedData.isolates}
                    phenotypes={expandedData.phenotypes}
                    amrFindings={expandedData.amrFindings}
                />

                <UpdateSampleSearchModal
                    opened={updateSearchOpened}
                    onClose={() => setUpdateSearchOpened(false)}
                    samples={userSamples}
                    onSelectSample={handleSelectSampleForUpdate}
                />

                <UpdateDataModal
                    opened={updateDataOpened}
                    onClose={() => setUpdateDataOpened(false)}
                    sampleID={selectedUpdateSampleId}
                    onUpdateSuccess={handleUpdateSuccess}
                />
            </>
        </div>
    );
};

export default CapturedData;