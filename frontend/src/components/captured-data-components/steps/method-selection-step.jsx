// steps/MethodSelectionStep.jsx
import {Stack, Text, SimpleGrid, Card, Center} from '@mantine/core';
import {Plus, FileJson} from 'lucide-react';

const MethodSelectionStep = ({onSelect}) => {
    return (
        <Stack align="center" py="xl" gap="lg">
            <Text size="lg" fw={600} ta="center">
                How do you want to add the data?
            </Text>
            <SimpleGrid cols={2} spacing="lg" w="100%" maw={520}>
                <Card
                    shadow="md"
                    padding="xl"
                    radius="md"
                    withBorder
                    style={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '2px solid transparent',
                    }}
                    className="method-card"
                    onClick={() => onSelect('manual')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#7db344';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(125, 179, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    <Center><Plus size={48} strokeWidth={1.5} color="#7db344" /></Center>
                    <Text ta="center" fw={600} mt="md" size="lg">Add Manually</Text>
                    <Text ta="center" size="sm" c="dimmed" mt="xs">Step-by-step form</Text>
                </Card>

                <Card
                    shadow="md"
                    padding="xl"
                    radius="md"
                    withBorder
                    style={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: '2px solid transparent',
                    }}
                    className="method-card"
                    onClick={() => onSelect('json')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#7db344';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(125, 179, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    <Center><FileJson size={48} strokeWidth={1.5} color="#7db344" /></Center>
                    <Text ta="center" fw={600} mt="md" size="lg">Upload JSON</Text>
                    <Text ta="center" size="sm" c="dimmed" mt="xs">Import from file</Text>
                </Card>
            </SimpleGrid>
        </Stack>
    );
}

export default MethodSelectionStep;