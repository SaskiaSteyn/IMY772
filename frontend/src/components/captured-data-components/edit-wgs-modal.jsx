import {useState, useEffect} from 'react';
import {
    Modal,
    Button,
    Group,
    Stack,
    NumberInput,
    TextInput,
} from '@mantine/core';
import {ArrowLeft} from 'lucide-react';

const EditWgsModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        isolateID: '',
        organism: '',
    });

    useEffect(() => {
        if (record && opened) {
            setFormData({
                isolateID: record.isolateID ?? '',
                organism: record.organism ?? '',
            });
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        const updateData = {
            organism: formData.organism,
        };

        await onSave(record.sampleID, record.isolateID, updateData);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title='Edit WGS Record'
            size='lg'
            centered
            radius='md'
            styles={{
                title: {
                    fontWeight: 600,
                    fontSize: 18,
                },
            }}
        >
            <Stack gap='md'>
                <Stack gap='md'>
                    <NumberInput
                        label='Isolate ID'
                        placeholder='Enter isolate ID'
                        value={formData.isolateID || ''}
                        disabled
                    />

                    <TextInput
                        label='Organism'
                        placeholder='Enter organism name'
                        value={formData.organism}
                        onChange={(e) => setFormData({...formData, organism: e.target.value})}
                    />
                </Stack>

                <Group justify='space-between' mt='lg'>
                    <Button
                        variant='default'
                        onClick={onClose}
                        leftSection={<ArrowLeft size={18} />}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default EditWgsModal;
