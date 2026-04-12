import { ActionIcon, Stack, Text, Title } from '@mantine/core';
import { X } from 'lucide-react';
import DissolvedOxygenChart from '../charts/dissolved-oxygen-chart';
import PHLevelChart from '../charts/ph-level-chart';
import SIRProfileChart from '../charts/sir-profile-chart';
import TDSChart from '../charts/tds-chart';
import WaterTemperatureChart from '../charts/water-temperature-chart';
import SampleAccordion from './sample-accordion';
import './sample-panel.scss';

export default function SamplePanel({ locationData, onClose }) {
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
                </Stack>
            </div>
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
