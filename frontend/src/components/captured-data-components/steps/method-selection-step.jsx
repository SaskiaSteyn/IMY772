// steps/MethodSelectionStep.jsx
import {Stack, Text, SimpleGrid, Card, Center} from '@mantine/core';
import {Plus, FileJson} from 'lucide-react';

const MethodSelectionStep = ({onSelect}) => {
    return (
        <Stack align="center" py="xl">
            <Text size="lg" fw={500} ta="center" mb="xl">
                How do you want to add the data?
            </Text>
            <SimpleGrid cols={2} spacing="lg" w="100%" maw={520}>
                <Card
                    shadow="sm"
                    padding="xl"
                    radius="md"
                    withBorder
                    style={{cursor: 'pointer'}}
                    onClick={() => onSelect('manual')}
                >
                    <Center><Plus size={48} strokeWidth={1.5} color="#7db344" /></Center>
                    <Text ta="center" fw={600} mt="md" size="lg">Add Manually</Text>
                    <Text ta="center" size="sm" c="dimmed" mt="xs">Step-by-step form</Text>
                </Card>

                <Card
                    shadow="sm"
                    padding="xl"
                    radius="md"
                    withBorder
                    style={{cursor: 'pointer'}}
                    onClick={() => onSelect('json')}
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