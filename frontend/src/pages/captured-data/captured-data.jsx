import {useState, useEffect} from 'react';
import {Tabs, Button, Group, Title, Container, Stack} from '@mantine/core';
import {Plus, Upload} from 'lucide-react';
import DashboardNavbar from '../../components/dashboard/dashboard-navbar.jsx';
import SamplesTable from '../../components/captured-data-components/samples-table';
import MetagenomicTable from '../../components/captured-data-components/metagenomics-table';
import WgsTable from '../../components/captured-data-components/wgs-table';
import AmrGenesTable from '../../components/captured-data-components/amr-genes-table';
import VirulenceGenesTable from '../../components/captured-data-components/virulence-genes-table';
import AddDataModal from '../../components/captured-data-components/add-data-modal';
import BulkUploadModal from '../../components/captured-data-components/bulk-upload-modal';
import {
    createFullSample,
    fetchAllSamples,
} from '../../api/sample-data-management.js';
import {useAuth} from '../../context/AuthContext.jsx';
import './captured-data.scss';

// Initial dummy data (copied from SamplesTable)
const initialSamples = [
    {
        sampleID: 1001,
        water_temperature: 24.5,
        ph: 7.2,
        tds: 98.5,
        do: 8.2,
        sample_analysis_type: 'Metagenomic',
        isolation_source: 'River water',
        collection_date: '2025-11-15',
        location_name: 'University of Pretoria',
        collected_by: 'Riley Carter',
        predicted_sir_profile: '',
        // Additional fields from modal
        latitude: -25.7479,
        longitude: 28.2293,
    },
    {
        sampleID: 1002,
        water_temperature: 23.8,
        ph: 6.9,
        tds: 105.0,
        do: 7.5,
        sample_analysis_type: 'WGS',
        isolation_source: 'Dam',
        collection_date: '2025-11-16',
        location_name: 'Pretoria River',
        collected_by: 'Harry Smith',
        predicted_sir_profile: '',
        latitude: -25.7479,
        longitude: 28.2293,
    },
    {
        sampleID: 1003,
        water_temperature: 25.1,
        ph: 7.4,
        tds: 87.3,
        do: 9.1,
        sample_analysis_type: 'Metagenomic',
        isolation_source: 'Lake',
        collection_date: '2025-11-17',
        location_name: 'University of Pretoria',
        collected_by: "Henry O'Brian",
        predicted_sir_profile: '',
        latitude: -25.7479,
        longitude: 28.2293,
    },
];

const CapturedData = () => {
    const {user} = useAuth();
    const [modalOpened, setModalOpened] = useState(false);
    const [bulkUploadModalOpened, setBulkUploadModalOpened] = useState(false);
    const [activeTab, setActiveTab] = useState('samples');
    const [samples, setSamples] = useState(initialSamples);
    const [highlightedSampleIds, setHighlightedSampleIds] = useState(new Set());

    const userFullName = user ? `${user.userID}` : null;

    // Clear highlight after 2 seconds (or 3 seconds for bulk uploads)
    useEffect(() => {
        if (highlightedSampleIds.size > 0) {
            // Longer timeout for bulk uploads (multiple highlights)
            const timeoutDuration = highlightedSampleIds.size > 1 ? 3000 : 2000;
            const timer = setTimeout(() => {
                setHighlightedSampleIds(new Set());
            }, timeoutDuration);
            return () => clearTimeout(timer);
        }
    }, [highlightedSampleIds]);

    // Fetch samples from API on component mount
    useEffect(() => {
        const loadSamples = async () => {
            try {
                const data = await fetchAllSamples();
                setSamples(data);
            } catch (error) {
                console.error('Failed to fetch samples:', error);
                // Fall back to initial samples if fetch fails
                setSamples(initialSamples);
            }
        };

        loadSamples();
    }, []);

    const handleAddEntry = async (newEntry) => {
        try {
            const createdSample = await createFullSample(newEntry);
            setSamples((prev) => [createdSample, ...prev]);
            console.log('Sample created successfully:', createdSample);

            // Highlight the new sample and switch to samples tab
            setHighlightedSampleIds(new Set([createdSample.sampleID]));
            setActiveTab('samples');

            // Scroll to the top where the new sample appears
            window.scrollTo({top: 0, behavior: 'smooth'});
        } catch (err) {
            console.error('Error creating sample:', err);
            // Optionally show a notification to the user
        }
    };

    const handleUploadSuccess = async (uploadedSampleIds) => {
        console.log(
            'handleUploadSuccess called with sampleIds:',
            uploadedSampleIds,
        );
        // Refetch samples after successful upload
        try {
            console.log('Fetching all samples...');
            const data = await fetchAllSamples();
            console.log('Fetched samples:', data);
            if (data && data.length > 0) {
                setSamples(data);
                setActiveTab('samples');
                console.log('Updated samples, total count:', data.length);
            }
        } catch (error) {
            console.error('Failed to refresh samples:', error);
        }
    };

    // Filter data for current user
    const userSamples = userFullName
        ? samples.filter((s) => s.collected_by === userFullName)
        : [];

    // Filter data for each tab
    const metagenomicSamples = userSamples.filter(
        (s) => s.sample_analysis_type === 'Metagenomic',
    );
    const wgsSamples = userSamples.filter((s) => s.sample_analysis_type === 'WGS');
    // AMR genes table shows metagenomic samples, Virulence shows WGS samples
    const amrSamples = metagenomicSamples;
    const virulenceSamples = wgsSamples;

    return (
        <div className='captured-data-page'>
            <DashboardNavbar />
            <Container size='xl' py='xl' className='captured-data-container'>
                <Stack gap='lg'>
                    <Group justify='space-between' align='flex-start'>
                        <Stack gap={0}>
                            <Title order={2}>Captured Data</Title>
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

                    <Tabs
                        value={activeTab}
                        onChange={setActiveTab}
                        className='data-tabs'
                    >
                        <Tabs.List>
                            <Tabs.Tab value='samples'>Samples</Tabs.Tab>
                            <Tabs.Tab value='metagenomic'>Metagenomic</Tabs.Tab>
                            <Tabs.Tab value='wgs'>WGS</Tabs.Tab>
                            <Tabs.Tab value='amr'>AMR Genes</Tabs.Tab>
                            <Tabs.Tab value='virulence'>
                                Virulence Genes
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value='samples' pt='md'>
                            <SamplesTable
                                records={userSamples}
                                highlightedSampleIds={highlightedSampleIds}
                            />
                        </Tabs.Panel>
                        <Tabs.Panel value='metagenomic' pt='md'>
                            <MetagenomicTable
                                records={metagenomicSamples}
                                highlightedSampleIds={highlightedSampleIds}
                            />
                        </Tabs.Panel>
                        <Tabs.Panel value='wgs' pt='md'>
                            <WgsTable
                                records={wgsSamples}
                                highlightedSampleIds={highlightedSampleIds}
                            />
                        </Tabs.Panel>
                        <Tabs.Panel value='amr' pt='md'>
                            <AmrGenesTable
                                records={amrSamples}
                                highlightedSampleIds={highlightedSampleIds}
                            />
                        </Tabs.Panel>
                        <Tabs.Panel value='virulence' pt='md'>
                            <VirulenceGenesTable
                                records={virulenceSamples}
                                highlightedSampleIds={highlightedSampleIds}
                            />
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Container>

            <AddDataModal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                onAddEntry={handleAddEntry}
            />
            <BulkUploadModal
                isOpen={bulkUploadModalOpened}
                onClose={() => setBulkUploadModalOpened(false)}
                onUploadSuccess={handleUploadSuccess}
            />
        </div>
    );
};

export default CapturedData;
