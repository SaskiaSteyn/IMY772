import {useState, useEffect} from 'react';
import {Tabs, Button, Group, Title, Container, Stack, Loader, Center} from '@mantine/core';
import {Plus, Upload, Pencil, ScanLine} from 'lucide-react';
import DashboardNavbar from '../../components/dashboard/dashboard-navbar.jsx';
import SamplesTable from '../../components/captured-data-components/samples-table';
import MetagenomicTable from '../../components/captured-data-components/metagenomics-table';
import WgsTable from '../../components/captured-data-components/wgs-table';
import AmrGenesTable from '../../components/captured-data-components/amr-genes-table';
import VirulenceGenesTable from '../../components/captured-data-components/virulence-genes-table';
import AddDataModal from '../../components/captured-data-components/add-data-modal';
import BulkUploadModal from '../../components/captured-data-components/bulk-upload-modal';
import EditSampleModal from '../../components/captured-data-components/edit-sample-modal';
import EditMetagenomicModal from '../../components/captured-data-components/edit-metagenomic-modal';
import EditWgsModal from '../../components/captured-data-components/edit-wgs-modal';
import EditAmrGenesModal from '../../components/captured-data-components/edit-amr-genes-modal';
import EditVirulenceGenesModal from '../../components/captured-data-components/edit-virulence-genes-modal';
import ExpandedDataModal from '../../components/captured-data-components/expanded-data-modal.jsx';
import UpdateSampleSearchModal from '../../components/captured-data-components/update-sample-search-modal';
import UpdateDataModal from '../../components/captured-data-components/update-data-modal';
import {
    createFullSample,
    fetchAllSamples,
    fetchAllMetagenomic,
    fetchAllWgs,
    fetchAllAmrGenes,
    fetchAllVirulenceGenes,
    updateSample,
    updateMetagenomic,
    updateWgs,
    updateAmrGene,
    updateVirulenceGene,
} from '../../api/sample-data-management.js';
import {useAuth} from '../../context/auth-context.jsx';
import './captured-data.scss';

const CapturedData = () => {
    const {user} = useAuth();
    const [modalOpened, setModalOpened] = useState(false);
    const [addMode, setAddMode] = useState('manual');
    const [bulkUploadModalOpened, setBulkUploadModalOpened] = useState(false);
    const [activeTab, setActiveTab] = useState('samples');
    const [samples, setSamples] = useState([]);
    const [metageonomicData, setMetageonomicData] = useState([]);
    const [wgsData, setWgsData] = useState([]);
    const [amrGenesData, setAmrGenesData] = useState([]);
    const [virulenceGenesData, setVirulenceGenesData] = useState([]);
    const [highlightedSampleIds, setHighlightedSampleIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // Edit modal states
    const [editSampleModalOpened, setEditSampleModalOpened] = useState(false);
    const [editMetagenomicModalOpened, setEditMetagenomicModalOpened] = useState(false);
    const [editWgsModalOpened, setEditWgsModalOpened] = useState(false);
    const [editAmrGenesModalOpened, setEditAmrGenesModalOpened] = useState(false);
    const [editVirulenceGenesModalOpened, setEditVirulenceGenesModalOpened] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState(null);

    // Expanded modal state
    const [expandedModalOpened, setExpandedModalOpened] = useState(false);
    const [expandedData, setExpandedData] = useState({
        sample: null,
        metagenomic: [],
        wgs: [],
        amrGenes: [],
        virulenceGenes: [],
    });

    const [updateSearchOpened, setUpdateSearchOpened] = useState(false);
    const [selectedUpdateSampleId, setSelectedUpdateSampleId] = useState(null);
    const [updateDataOpened, setUpdateDataOpened] = useState(false);

    // Load all data (with abort signal for cleanup)
    const loadAllData = async (signal) => {
        try {
            const [samplesData, metaData, wgsDataResult, amrData, virulenceData] = await Promise.all([
                fetchAllSamples(signal),
                fetchAllMetagenomic(signal),
                fetchAllWgs(signal),
                fetchAllAmrGenes(signal),
                fetchAllVirulenceGenes(signal),
            ]);
            setSamples(samplesData);
            setMetageonomicData(metaData);
            setWgsData(wgsDataResult);
            setAmrGenesData(amrData);
            setVirulenceGenesData(virulenceData);
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
            setMetageonomicData([]);
            setWgsData([]);
            setAmrGenesData([]);
            setVirulenceGenesData([]);
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

    // Filter data for current user (convert uploaded_by to number for comparison)
    // const userSamples = user?.userID
    //     ? samples
    //     : [];
    const userSamples = user?.userID
        ? samples.filter((s) => Number(s.uploaded_by) === Number(user.userID))
        : [];

    const userSampleIds = new Set(userSamples.map((s) => s.sampleID));
    const filteredMetagenomic = metageonomicData.filter((m) => userSampleIds.has(m.sampleID));
    const filteredWgs = wgsData.filter((w) => userSampleIds.has(w.sampleID));
    const filteredAmrGenes = amrGenesData.filter((a) => userSampleIds.has(a.sampleID));
    const userIsolateIds = new Set(filteredWgs.map((w) => w.isolateID));
    const filteredVirulenceGenes = virulenceGenesData.filter((v) => userIsolateIds.has(v.isolateID));

    const handleAddEntry = async (newEntry) => {
        try {
            const createdSample = await createFullSample(newEntry);
            setSamples((prev) => [createdSample, ...prev]);
            setHighlightedSampleIds(new Set([createdSample.sampleID]));
            setActiveTab('samples');
            window.scrollTo({top: 0, behavior: 'smooth'});
        } catch (err) {
            console.error('Error creating sample:', err);
        }
    };

    const handleUploadSuccess = async () => {
        try {
            const data = await fetchAllSamples();
            setSamples(data);
            setActiveTab('samples');
        } catch (error) {
            console.error('Failed to refresh samples:', error);
        }
    };

    // Edit handlers
    const handleEditSampleClick = (record) => {
        setRecordToEdit(record);
        setEditSampleModalOpened(true);
    };

    const handleEditSampleSave = async (sampleID, updateData) => {
        try {
            await updateSample(sampleID, updateData);
            const data = await fetchAllSamples();
            setSamples(data);
            setHighlightedSampleIds(new Set([sampleID]));
            setEditSampleModalOpened(false);
        } catch (error) {
            console.error('Error updating sample:', error);
        }
    };

    const handleEditMetagenomicClick = (record) => {
        setRecordToEdit(record);
        setEditMetagenomicModalOpened(true);
    };

    const handleEditMetagenomicSave = async (sampleID, sequenceName, updateData) => {
        try {
            await updateMetagenomic(sampleID, sequenceName, updateData);
            const data = await fetchAllMetagenomic();
            setMetageonomicData(data);
            setHighlightedSampleIds(new Set([sampleID]));
            setEditMetagenomicModalOpened(false);
        } catch (error) {
            console.error('Error updating metagenomic:', error);
        }
    };

    const handleEditWgsClick = (record) => {
        setRecordToEdit(record);
        setEditWgsModalOpened(true);
    };

    const handleEditWgsSave = async (sampleID, isolateID, updateData) => {
        try {
            await updateWgs(sampleID, isolateID, updateData);
            const data = await fetchAllWgs();
            setWgsData(data);
            setEditWgsModalOpened(false);
        } catch (error) {
            console.error('Error updating WGS:', error);
        }
    };

    const handleEditAmrGenesClick = (record) => {
        setRecordToEdit(record);
        setEditAmrGenesModalOpened(true);
    };

    const handleEditAmrGenesSave = async (sampleID, geneSymbol, updateData) => {
        try {
            await updateAmrGene(sampleID, geneSymbol, updateData);
            const data = await fetchAllAmrGenes();
            setAmrGenesData(data);
            setHighlightedSampleIds(new Set([sampleID]));
            setEditAmrGenesModalOpened(false);
        } catch (error) {
            console.error('Error updating AMR gene:', error);
        }
    };

    const handleEditVirulenceGenesClick = (record) => {
        setRecordToEdit(record);
        setEditVirulenceGenesModalOpened(true);
    };

    const handleEditVirulenceGenesSave = async (isolateID, geneSymbol, updateData) => {
        try {
            await updateVirulenceGene(isolateID, geneSymbol, updateData);
            const data = await fetchAllVirulenceGenes();
            setVirulenceGenesData(data);
            setEditVirulenceGenesModalOpened(false);
        } catch (error) {
            console.error('Error updating virulence gene:', error);
        }
    };

    const handleExpandClick = (record) => {
        let sampleID = record.sampleID;
        if (!sampleID && record.wgs) sampleID = record.wgs.sampleID;
        if (!sampleID) return;

        const sample = samples.find(s => s.sampleID === sampleID);
        const metagenomic = metageonomicData.filter(m => m.sampleID === sampleID);
        const wgs = wgsData.filter(w => w.sampleID === sampleID);
        const amrGenes = amrGenesData.filter(a => a.sampleID === sampleID);
        const wgsForSample = wgsData.filter(w => w.sampleID === sampleID);
        const isolateIds = new Set(wgsForSample.map(w => w.isolateID));
        const virulenceGenes = virulenceGenesData.filter(v => isolateIds.has(v.isolateID));

        setExpandedData({sample, metagenomic, wgs, amrGenes, virulenceGenes});
        setExpandedModalOpened(true);
    };

    const handleSelectSampleForUpdate = (sampleID) => {
        setSelectedUpdateSampleId(sampleID);
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
                                leftSection={<Pencil size={18} />}
                                variant='outline'
                                onClick={() => setUpdateSearchOpened(true)}
                            >
                                Update Existing Sample
                            </Button>
                            <Button
                                leftSection={<ScanLine size={18} />}
                                variant='outline'
                                onClick={() => {
                                    setAddMode('image');
                                    setModalOpened(true);
                                }}
                            >
                                Capture from Image
                            </Button>
                            <Button
                                leftSection={<Plus size={18} />}
                                onClick={() => {
                                    setAddMode('manual');
                                    setModalOpened(true);
                                }}
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
                        <Tabs value={activeTab} onChange={setActiveTab} className='data-tabs'>
                            <Tabs.List>
                                <Tabs.Tab value='samples'>Samples</Tabs.Tab>
                                <Tabs.Tab value='metagenomic'>Metagenomic</Tabs.Tab>
                                <Tabs.Tab value='wgs'>WGS</Tabs.Tab>
                                <Tabs.Tab value='amr'>AMR Genes</Tabs.Tab>
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
                            <Tabs.Panel value='metagenomic' pt='md'>
                                <MetagenomicTable
                                    records={filteredMetagenomic}
                                    highlightedSampleIds={highlightedSampleIds}
                                    onEditClick={handleEditMetagenomicClick}
                                    onExpandClick={handleExpandClick}
                                />
                            </Tabs.Panel>
                            <Tabs.Panel value='wgs' pt='md'>
                                <WgsTable
                                    records={filteredWgs}
                                    highlightedSampleIds={highlightedSampleIds}
                                    onEditClick={handleEditWgsClick}
                                    onExpandClick={handleExpandClick}
                                />
                            </Tabs.Panel>
                            <Tabs.Panel value='amr' pt='md'>
                                <AmrGenesTable
                                    records={filteredAmrGenes}
                                    highlightedSampleIds={highlightedSampleIds}
                                    onEditClick={handleEditAmrGenesClick}
                                    onExpandClick={handleExpandClick}
                                />
                            </Tabs.Panel>
                            <Tabs.Panel value='virulence' pt='md'>
                                <VirulenceGenesTable
                                    records={filteredVirulenceGenes}
                                    highlightedSampleIds={highlightedSampleIds}
                                    onEditClick={handleEditVirulenceGenesClick}
                                    onExpandClick={handleExpandClick}
                                />
                            </Tabs.Panel>
                        </Tabs>
                    )}
                </Stack>
            </Container>

            <AddDataModal opened={modalOpened} onClose={() => setModalOpened(false)} onAddEntry={handleAddEntry} initialMode={addMode} />
            <BulkUploadModal isOpen={bulkUploadModalOpened} onClose={() => setBulkUploadModalOpened(false)} onUploadSuccess={handleUploadSuccess} />
            <EditSampleModal opened={editSampleModalOpened} onClose={() => setEditSampleModalOpened(false)} record={recordToEdit} onSave={handleEditSampleSave} />
            <EditMetagenomicModal opened={editMetagenomicModalOpened} onClose={() => setEditMetagenomicModalOpened(false)} record={recordToEdit} onSave={handleEditMetagenomicSave} />
            <EditWgsModal opened={editWgsModalOpened} onClose={() => setEditWgsModalOpened(false)} record={recordToEdit} onSave={handleEditWgsSave} />
            <EditAmrGenesModal opened={editAmrGenesModalOpened} onClose={() => setEditAmrGenesModalOpened(false)} record={recordToEdit} onSave={handleEditAmrGenesSave} />
            <EditVirulenceGenesModal opened={editVirulenceGenesModalOpened} onClose={() => setEditVirulenceGenesModalOpened(false)} record={recordToEdit} onSave={handleEditVirulenceGenesSave} />

            <ExpandedDataModal
                opened={expandedModalOpened}
                onClose={() => setExpandedModalOpened(false)}
                sample={expandedData.sample}
                metagenomic={expandedData.metagenomic}
                wgs={expandedData.wgs}
                amrGenes={expandedData.amrGenes}
                virulenceGenes={expandedData.virulenceGenes}
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
        </div>
    );
};

export default CapturedData;