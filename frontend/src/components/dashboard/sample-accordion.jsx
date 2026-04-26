import { Accordion, Divider, Group, Stack, Text, Title } from '@mantine/core';
import { formatSirProfileLabel } from '../../lib/sir-profile';
import './sample-accordion.scss';

export default function SampleAccordion({ samples }) {
    return (
        <Accordion>
            {samples.map((sample) => (
                <Accordion.Item
                    key={sample.sampleID}
                    value={String(sample.sampleID)}
                >
                    <Accordion.Control>
                        {new Date(sample.collection_date).toLocaleDateString(
                            'en-US',
                            {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            },
                        )}
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap='md'>
                            <Section
                                title='Sample Information'
                                fields={[
                                    {
                                        label: 'Sample ID',
                                        value: sample.sampleID,
                                    },
                                    {
                                        label: 'Analysis Type',
                                        value:
                                            sample.sample_analysis_type ||
                                            'N/A',
                                    },
                                    {
                                        label: 'Collected By',
                                        value: sample.collected_by || 'N/A',
                                    },
                                ]}
                            />

                            <Divider style={{ margin: 0 }} />

                            <Section
                                title='Water Properties'
                                fields={[
                                    {
                                        label: 'Water Temperature',
                                        value: sample.water_temperature
                                            ? `${sample.water_temperature}°C`
                                            : 'N/A',
                                    },
                                    {
                                        label: 'pH Level',
                                        value: sample.ph || 'N/A',
                                    },
                                    {
                                        label: 'TDS (Total Dissolved Solids)',
                                        value: sample.tds
                                            ? `${sample.tds} mg/L`
                                            : 'N/A',
                                    },
                                    {
                                        label: 'Dissolved Oxygen',
                                        value: sample.do
                                            ? `${sample.do} mg/L`
                                            : 'N/A',
                                    },
                                ]}
                            />

                            <Divider style={{ margin: 0 }} />

                            <Section
                                title='Collection Details'
                                fields={[
                                    {
                                        label: 'Isolation Source',
                                        value: sample.isolation_source || 'N/A',
                                    },
                                    {
                                        label: 'Predicted SIR Profile',
                                        value: formatSirProfileLabel(
                                            sample.predicted_sir_profile,
                                            'N/A',
                                        ),
                                    },
                                ]}
                            />
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>
            ))}
        </Accordion>
    );
}

function Section({ title, fields }) {
    return (
        <Stack gap='sm'>
            <Title order={5} style={{ marginBottom: '0.5rem' }}>
                {title}
            </Title>
            {fields.map((field, idx) => (
                <Group justify='space-between' key={idx}>
                    <Text size='sm' fw={500} c='dimmed'>
                        {field.label}:
                    </Text>
                    <Text size='sm' fw={600}>
                        {field.value}
                    </Text>
                </Group>
            ))}
        </Stack>
    );
}
