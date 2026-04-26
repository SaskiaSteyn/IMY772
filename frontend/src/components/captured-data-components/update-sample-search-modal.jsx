import {useState, useMemo} from 'react';
import {Modal, TextInput, Stack, Button, Group, Text} from '@mantine/core';
import {DataTable} from 'mantine-datatable';

const UpdateSampleSearchModal = ({opened, onClose, samples, onSelectSample}) => {
    const [search, setSearch] = useState('');
    const [selectedSample, setSelectedSample] = useState(null);

    // Show all samples when search is empty, otherwise filter by ID
    const filteredSamples = useMemo(() => {
        if (!search.trim()) return samples;
        const lowerSearch = search.toLowerCase();
        return samples.filter(s => s.sampleID.toString().includes(lowerSearch));
    }, [search, samples]);

    const handleRowClick = (sample) => {
        setSelectedSample(sample);
    };

    const handleNext = () => {
        if (selectedSample) {
            onSelectSample(selectedSample.sampleID);
            onClose();
            setSearch('');
            setSelectedSample(null);
        }
    };

    const handleCancel = () => {
        setSearch('');
        setSelectedSample(null);
        onClose();
    };

    const hasNoSamples = samples.length === 0;

    return (
        <Modal opened={opened} onClose={handleCancel} title="Update Existing Sample" size="lg" centered>
            <Stack gap="md">
                <TextInput
                    label="Search by Sample ID"
                    placeholder="Enter sample ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={hasNoSamples}
                />
                {hasNoSamples ? (
                    <Text c="dimmed" ta="center" py="xl">You have no samples to update.</Text>
                ) : (
                    <>
                        <DataTable
                            records={filteredSamples}
                            columns={[
                                {accessor: 'sampleID', title: 'Sample ID'},
                                {accessor: 'sample_analysis_type', title: 'Analysis Type'},
                            ]}
                            onRowClick={({record}) => handleRowClick(record)}
                            highlightOnHover
                            rowStyle={(record) => ({
                                backgroundColor: selectedSample?.sampleID === record.sampleID ? '#e6f7ff' : undefined,
                                cursor: 'pointer',
                            })}
                            minHeight={200}
                            noRecordsText=""
                            noRecordsIcon={<></>}
                        />
                        {filteredSamples.length === 0 && (
                            <Text c="dimmed" ta="center" py="md">No samples match your search.</Text>
                        )}
                    </>
                )}
                <Group justify="space-between" mt="md">
                    <Button variant="default" onClick={handleCancel}>Cancel</Button>
                    <Button onClick={handleNext} disabled={!selectedSample || hasNoSamples}>Next</Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default UpdateSampleSearchModal;