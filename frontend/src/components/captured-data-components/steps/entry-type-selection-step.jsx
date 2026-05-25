import {Stack, Text, SimpleGrid, Card, Center} from '@mantine/core';
import {Plus, Link2} from 'lucide-react';

const EntryTypeSelectionStep = ({onSelect}) => {
    return (
        <Stack align="center" py="xl" gap="lg">
            <Text size="lg" fw={600} ta="center">
                What do you want to add?
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
                    onClick={() => onSelect('new-sample')}
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
                    <Text ta="center" fw={600} mt="md" size="lg">New Sample</Text>
                    <Text ta="center" size="sm" c="dimmed" mt="xs">Create a new sample with optional related data</Text>
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
                    onClick={() => onSelect('add-to-existing')}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#7db344';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(125, 179, 68, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    <Center><Link2 size={48} strokeWidth={1.5} color="#7db344" /></Center>
                    <Text ta="center" fw={600} mt="md" size="lg">Add to Existing</Text>
                    <Text ta="center" size="sm" c="dimmed" mt="xs">Add related data to an existing sample</Text>
                </Card>
            </SimpleGrid>
        </Stack>
    );
}

export default EntryTypeSelectionStep;
