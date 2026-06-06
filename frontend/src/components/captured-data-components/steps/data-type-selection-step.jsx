import {Stack, Text, SimpleGrid, Card, Center} from '@mantine/core';
import {Microscope, Beaker, Dna} from 'lucide-react';

const DataTypeSelectionStep = ({onSelect}) => {
    const dataTypes = [
        {id: 'isolates', label: 'Isolate', icon: Microscope, description: 'Add a microbial isolate'},
        {id: 'phenotypes', label: 'Phenotype', icon: Beaker, description: 'Add a predicted phenotype'},
        {id: 'amr_findings', label: 'AMR Finding', icon: Dna, description: 'Add an AMR gene finding'},
    ];

    return (
        <Stack align="center" py="xl" gap="lg">
            <Text size="lg" fw={600} ta="center">
                What type of data do you want to add?
            </Text>
            <SimpleGrid cols={{base: 1, sm: 3}} spacing="lg" w="100%" maw={600}>
                {dataTypes.map(({id, label, icon: Icon, description}) => (
                    <Card
                        key={id}
                        shadow="md"
                        padding="xl"
                        radius="md"
                        withBorder
                        style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '2px solid transparent',
                        }}
                        onClick={() => onSelect(id)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#7db344';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(125, 179, 68, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                    >
                        <Center><Icon size={48} strokeWidth={1.5} color="#7db344" /></Center>
                        <Text ta="center" fw={600} mt="md" size="lg">{label}</Text>
                        <Text ta="center" size="sm" c="dimmed" mt="xs">{description}</Text>
                    </Card>
                ))}
            </SimpleGrid>
        </Stack>
    );
}

export default DataTypeSelectionStep;
