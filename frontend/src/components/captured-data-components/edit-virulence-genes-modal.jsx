import {useState, useEffect} from 'react';
import {
    Modal,
    Button,
    Group,
    Stack,
    TextInput,
} from '@mantine/core';
import {ArrowLeft} from 'lucide-react';

const EditVirulenceGenesModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        geneSymbol: '',
    });

    useEffect(() => {
        if (record && opened) {
            setFormData({
                geneSymbol: record.geneSymbol ?? '',
            });
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        const updateData = {
            geneSymbol: formData.geneSymbol,
        };

        await onSave(record.isolateID, record.geneSymbol, updateData);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title='Edit Virulence Gene'
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
                    <TextInput
                        label='Gene Symbol'
                        placeholder='Enter gene symbol'
                        value={formData.geneSymbol}
                        onChange={(e) => setFormData({...formData, geneSymbol: e.target.value})}
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

export default EditVirulenceGenesModal;
