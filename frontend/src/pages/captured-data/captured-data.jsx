import {useState} from 'react';
import {Tabs, Button, Group, Title, Container} from '@mantine/core';
import {Plus, Upload} from 'lucide-react';
import DashboardNavbar from '../../components/dashboard-navbar';
import SamplesTable from '../../components/captured-data-components/samples-table';
import MetagenomicTable from '../../components/captured-data-components/metagenomics-table';
import WgsTable from '../../components/captured-data-components/wgs-table';
import AmrGenesTable from '../../components/captured-data-components/amr-genes-table';
import VirulenceGenesTable from '../../components/captured-data-components/virulence-genes-table';
import AddDataModal from '../../components/captured-data-components/add-data-modal';

// Initial dummy data (copied from SamplesTable)
const initialSamples = [
    {
        sampleID: 1001,
        water_temperature: 24.50,
        ph: 7.20,
        tds: 98.50,
        do: 8.20,
        sample_analysis_type: "Metagenomic",
        isolation_source: "River water",
        collection_date: "2025-11-15",
        location_name: "University of Pretoria",
        collected_by: "Riley Carter",
        predicted_sir_profile: "",
        // Additional fields from modal
        latitude: -25.7479,
        longitude: 28.2293,
    },
    {
        sampleID: 1002,
        water_temperature: 23.80,
        ph: 6.90,
        tds: 105.00,
        do: 7.50,
        sample_analysis_type: "WGS",
        isolation_source: "Dam",
        collection_date: "2025-11-16",
        location_name: "Pretoria River",
        collected_by: "Harry Smith",
        predicted_sir_profile: "",
        latitude: -25.7479,
        longitude: 28.2293,
    },
    {
        sampleID: 1003,
        water_temperature: 25.10,
        ph: 7.40,
        tds: 87.30,
        do: 9.10,
        sample_analysis_type: "Metagenomic",
        isolation_source: "Lake",
        collection_date: "2025-11-17",
        location_name: "University of Pretoria",
        collected_by: "Henry O'Brian",
        predicted_sir_profile: "",
        latitude: -25.7479,
        longitude: 28.2293,
    },
];

let nextId = 1004;

const CapturedData = () => {
    const [modalOpened, setModalOpened] = useState(false);
    const [activeTab, setActiveTab] = useState('samples');
    const [samples, setSamples] = useState(initialSamples);

    const handleAddEntry = (newEntry) => {
        const newSample = {
            sampleID: nextId++,
            ...newEntry.sample,
        };
        setSamples(prev => [newSample, ...prev]);
        // TODO: also store metagenomic/wgs/genes separately if needed for detailed tables
        // For now, all tables will filter from the samples array
    };

    // Filter data for each tab
    const metagenomicSamples = samples.filter(s => s.sample_analysis_type === 'Metagenomic');
    const wgsSamples = samples.filter(s => s.sample_analysis_type === 'WGS');
    // AMR genes table shows metagenomic samples, Virulence shows WGS samples
    const amrSamples = metagenomicSamples;
    const virulenceSamples = wgsSamples;

    return (
        <div className='captured-data-page'>
            <DashboardNavbar />
            <div className='captured-data-content'>
                <Container size="xl" className="captured-data-content" py="xl">
                    <Group justify="space-between" mb="xl">
                        <Title order={2}>Captured Data</Title>
                        <Group>
                            <Button
                                leftSection={<Upload size={18} />}
                                variant="outline"
                                onClick={() => alert('Bulk upload coming soon...')}
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

                    <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
                        <Tabs.List>
                            <Tabs.Tab value="samples">Samples</Tabs.Tab>
                            <Tabs.Tab value="metagenomic">Metagenomic</Tabs.Tab>
                            <Tabs.Tab value="wgs">WGS</Tabs.Tab>
                            <Tabs.Tab value="amr">AMR Resistance Genes</Tabs.Tab>
                            <Tabs.Tab value="virulence">Virulence Genes</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="samples" pt="md">
                            <SamplesTable records={samples} />
                        </Tabs.Panel>
                        <Tabs.Panel value="metagenomic" pt="md">
                            <MetagenomicTable records={metagenomicSamples} />
                        </Tabs.Panel>
                        <Tabs.Panel value="wgs" pt="md">
                            <WgsTable records={wgsSamples} />
                        </Tabs.Panel>
                        <Tabs.Panel value="amr" pt="md">
                            <AmrGenesTable records={amrSamples} />
                        </Tabs.Panel>
                        <Tabs.Panel value="virulence" pt="md">
                            <VirulenceGenesTable records={virulenceSamples} />
                        </Tabs.Panel>
                    </Tabs>
                </Container>

                <AddDataModal
                    opened={modalOpened}
                    onClose={() => setModalOpened(false)}
                    onAddEntry={handleAddEntry}
                />
            </div>
        </div>
    );
};

export default CapturedData;