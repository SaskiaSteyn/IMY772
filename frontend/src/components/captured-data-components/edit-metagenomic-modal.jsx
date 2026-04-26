import {useState, useEffect} from 'react';
import {
    Modal,
    Button,
    Group,
    Stack,
    TextInput,
} from '@mantine/core';
import {ArrowLeft} from 'lucide-react';

const EditMetagenomicModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        sequence_name: '',
        element_type: '',
        class: '',
        subclass: '',
    });

    useEffect(() => {
        if (record && opened) {
            setFormData({
                sequence_name: record.sequence_name ?? '',
                element_type: record.element_type ?? '',
                class: record.class ?? '',
                subclass: record.subclass ?? '',
            });
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        const updateData = {
            element_type: formData.element_type,
            class: formData.class,
            subclass: formData.subclass,
        };

        await onSave(record.sampleID, record.sequence_name, updateData);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title='Edit Metagenomic Record'
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
                        label='Sequence Name'
                        placeholder='Enter sequence name'
                        value={formData.sequence_name}
                        disabled
                    />

                    <TextInput
                        label='Element Type'
                        placeholder='Enter element type'
                        value={formData.element_type}
                        onChange={(e) => setFormData({...formData, element_type: e.target.value})}
                    />

                    <TextInput
                        label='Class'
                        placeholder='Enter class'
                        value={formData.class}
                        onChange={(e) => setFormData({...formData, class: e.target.value})}
                    />

                    <TextInput
                        label='Subclass'
                        placeholder='Enter subclass'
                        value={formData.subclass}
                        onChange={(e) => setFormData({...formData, subclass: e.target.value})}
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

export default EditMetagenomicModal;
