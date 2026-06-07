import {
    ActionIcon,
    Button,
    Group,
    Modal,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { Download, X } from 'lucide-react';
import { useState } from 'react';
import DissolvedOxygenChart from '../charts/dissolved-oxygen-chart';
import PHLevelChart from '../charts/ph-level-chart';
import SIRProfileChart from '../charts/sir-profile-chart';
import TDSChart from '../charts/tds-chart';
import WaterTemperatureChart from '../charts/water-temperature-chart';
import SampleAccordion from './sample-accordion';
import './sample-panel.scss';

export default function SamplePanel({ locationData, onClose }) {
    const [exportModalOpen, setExportModalOpen] = useState(false);

    if (!locationData) return null;

    const { location_name, latitude, longitude, samples } = locationData;
    const sortedSamples = [...samples].sort(
        (a, b) => new Date(a.collection_date) - new Date(b.collection_date),
    );

    return (
        <div className='side-panel'>
            <PanelHeader
                location_name={location_name}
                latitude={latitude}
                longitude={longitude}
                onClose={onClose}
            />

            <div className='side-panel-content'>
                <Stack gap='lg'>
                    <Charts samples={sortedSamples} />
                    <SampleAccordion samples={sortedSamples} />
                    <ExportButton
                        locationData={locationData}
                        onOpen={() => setExportModalOpen(true)}
                    />
                </Stack>
            </div>

            <ExportModal
                opened={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                locationData={locationData}
            />
        </div>
    );
}

function PanelHeader({ location_name, latitude, longitude, onClose }) {
    return (
        <div className='side-panel-header'>
            <Stack gap={4} style={{ flex: 1 }}>
                <Title order={3} style={{ margin: 0 }}>
                    {location_name}
                </Title>
                <Text size='sm' c='dimmed'>
                    {parseFloat(latitude).toFixed(4)},{' '}
                    {parseFloat(longitude).toFixed(4)}
                </Text>
            </Stack>
            <ActionIcon
                variant='subtle'
                color='gray'
                size='lg'
                onClick={onClose}
            >
                <X size={20} />
            </ActionIcon>
        </div>
    );
}

function Charts({ samples }) {
    return (
        <>
            <WaterTemperatureChart samples={samples} />
            <PHLevelChart samples={samples} />
            <TDSChart samples={samples} />
            <DissolvedOxygenChart samples={samples} />
            <SIRProfileChart samples={samples} />
        </>
    );
}

function ExportButton({ onOpen }) {
    return (
        <Button fullWidth leftSection={<Download size={16} />} onClick={onOpen}>
            Export Data
        </Button>
    );
}

function ExportModal({ opened, onClose, locationData }) {
    const handleExportJSON = () => {
        const dataToExport = {
            location_name: locationData.location_name,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            samples: locationData.samples,
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${locationData.location_name}-data.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
    };

    const handleExportCSV = () => {
        if (!locationData.samples || locationData.samples.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = [
            'Location Name',
            'Latitude',
            'Longitude',
            'Collection Date',
            'Water Temperature (°C)',
            'pH Level',
            'TDS (mg/L)',
            'Dissolved Oxygen (mg/L)',
        ];

        const rows = locationData.samples.map((sample) => [
            locationData.location_name,
            locationData.latitude,
            locationData.longitude,
            sample.collection_date || '',
            sample.water_temp || '',
            sample.ph || '',
            sample.tds || '',
            sample.do || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row
                    .map((cell) => {
                        if (typeof cell === 'string' && cell.includes(',')) {
                            return `"${cell}"`;
                        }
                        return cell;
                    })
                    .join(','),
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${locationData.location_name}-data.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title='Export Data' centered>
            <Stack gap='md'>
                <Text size='sm'>Choose a format to export your data:</Text>
                <Group grow>
                    <Button variant='default' onClick={handleExportJSON}>
                        Export as JSON
                    </Button>
                    <Button variant='default' onClick={handleExportCSV}>
                        Export as CSV
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
