import {useState, useEffect} from 'react';
import {
    Modal,
    Button,
    Group,
    Stack,
    TextInput,
    NumberInput,
    Text,
} from '@mantine/core';
import {ArrowLeft, Check} from 'lucide-react';

const EditVirulenceGenesModal = ({opened, onClose, record, onSave}) => {
    const [formData, setFormData] = useState({
        gene_symbol: '',
        method: '',
        percent_identity: '',
        coverage_percent: '',
        alignment_length: '',
        target_length: '',
        ref_seq_length: '',
        accession: '',
        sequence_name: '',
        element_type: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (record && opened) {
            setFormData({
                gene_symbol: record.gene_symbol ?? '',
                method: record.method ?? '',
                percent_identity: record.percent_identity ?? '',
                coverage_percent: record.coverage_percent ?? '',
                alignment_length: record.alignment_length ?? '',
                target_length: record.target_length ?? '',
                ref_seq_length: record.ref_seq_length ?? '',
                accession: record.accession ?? '',
                sequence_name: record.sequence_name ?? '',
                element_type: record.element_type ?? '',
            });
            setError('');
        }
    }, [record, opened]);

    const handleSubmit = async () => {
        if (!record) return;

        if (!formData.gene_symbol) {
            setError('Gene symbol is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const updateData = {
                gene_symbol: formData.gene_symbol,
            };
            if (formData.method) updateData.method = formData.method;
            if (formData.percent_identity !== '') updateData.percent_identity = parseFloat(formData.percent_identity);
            if (formData.coverage_percent !== '') updateData.coverage_percent = parseFloat(formData.coverage_percent);
            if (formData.alignment_length !== '') updateData.alignment_length = parseInt(formData.alignment_length, 10);
            if (formData.target_length !== '') updateData.target_length = parseInt(formData.target_length, 10);
            if (formData.ref_seq_length !== '') updateData.ref_seq_length = parseInt(formData.ref_seq_length, 10);
            if (formData.accession) updateData.accession = formData.accession;
            if (formData.sequence_name) updateData.sequence_name = formData.sequence_name;
            if (formData.element_type) updateData.element_type = formData.element_type;

            await onSave(record.virulence_gene_id, updateData);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save virulence gene');
        } finally {
            setLoading(false);
        }
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
                <div>
                    <Text fw={600} mb='xs'>Gene ID: {record?.virulence_gene_id}</Text>
                    <Text size='sm' c='dimmed'>Update virulence gene information</Text>
                </div>

                {error && (
                    <div style={{color: 'red', padding: '8px', backgroundColor: '#ffe0e0', borderRadius: '4px'}}>
                        {error}
                    </div>
                )}

                <TextInput
                    label='Gene Symbol'
                    placeholder='e.g., invA, spi1'
                    value={formData.gene_symbol}
                    onChange={(e) => setFormData({...formData, gene_symbol: e.currentTarget.value})}
                    required
                />

                <TextInput
                    label='Method'
                    placeholder='e.g., BLAST'
                    value={formData.method}
                    onChange={(e) => setFormData({...formData, method: e.currentTarget.value})}
                />

                <NumberInput
                    label='Percent Identity (%)'
                    placeholder='0-100'
                    value={formData.percent_identity !== '' ? parseFloat(formData.percent_identity) : ''}
                    onChange={(value) => setFormData({...formData, percent_identity: value?.toString() || ''})}
                    min={0}
                    max={100}
                    step={0.1}
                />

                <NumberInput
                    label='Coverage (%)'
                    placeholder='0-100'
                    value={formData.coverage_percent !== '' ? parseFloat(formData.coverage_percent) : ''}
                    onChange={(value) => setFormData({...formData, coverage_percent: value?.toString() || ''})}
                    min={0}
                    max={100}
                    step={0.1}
                />

                <NumberInput
                    label='Alignment Length'
                    placeholder='e.g., 792'
                    value={formData.alignment_length !== '' ? parseInt(formData.alignment_length, 10) : ''}
                    onChange={(value) => setFormData({...formData, alignment_length: value?.toString() || ''})}
                    min={0}
                />

                <NumberInput
                    label='Target Length'
                    placeholder='e.g., 792'
                    value={formData.target_length !== '' ? parseInt(formData.target_length, 10) : ''}
                    onChange={(value) => setFormData({...formData, target_length: value?.toString() || ''})}
                    min={0}
                />

                <NumberInput
                    label='Reference Sequence Length'
                    placeholder='e.g., 792'
                    value={formData.ref_seq_length !== '' ? parseInt(formData.ref_seq_length, 10) : ''}
                    onChange={(value) => setFormData({...formData, ref_seq_length: value?.toString() || ''})}
                    min={0}
                />

                <TextInput
                    label='Accession'
                    placeholder='e.g., AF000000'
                    value={formData.accession}
                    onChange={(e) => setFormData({...formData, accession: e.currentTarget.value})}
                />

                <TextInput
                    label='Sequence Name'
                    placeholder='Enter sequence name'
                    value={formData.sequence_name}
                    onChange={(e) => setFormData({...formData, sequence_name: e.currentTarget.value})}
                />

                <TextInput
                    label='Element Type'
                    placeholder='e.g., virulence_factor'
                    value={formData.element_type}
                    onChange={(e) => setFormData({...formData, element_type: e.currentTarget.value})}
                />

                <Group justify='space-between' mt='lg'>
                    <Button
                        variant='default'
                        onClick={onClose}
                        leftSection={<ArrowLeft size={18} />}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={loading} leftSection={<Check size={18} />}>
                        Save Changes
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default EditVirulenceGenesModal;
