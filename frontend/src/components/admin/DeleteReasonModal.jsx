import { useState } from 'react'
import {
    Alert,
    Button,
    Group,
    Modal,
    Stack,
    Text,
    Textarea,
} from '@mantine/core'

export default function DeleteReasonModal({
    opened,
    onClose,
    onConfirm,
    loading = false,
    title = 'Why are you deleting this data?',
    description = 'Supply a short reason why this entry should be deleted.',
    confirmLabel = 'Delete Entry',
}) {
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')

    function handleClose() {
        setReason('')
        setError('')
        onClose()
    }

    async function handleConfirm() {
        const normalized = reason.trim()
        if (normalized.length < 3) {
            setError('Please provide a short reason (minimum 3 characters).')
            return
        }

        setError('')
        await onConfirm(normalized)
    }

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={title}
            centered
            radius='md'
            size='md'
        >
            <Stack gap='sm'>
                <Text size='sm'>{description}</Text>
                {error && (
                    <Alert color='red' variant='light'>
                        {error}
                    </Alert>
                )}
                <Textarea
                    minRows={4}
                    autosize
                    placeholder='Enter your reason here'
                    value={reason}
                    onChange={(event) => setReason(event.currentTarget.value)}
                />
                <Group justify='flex-end' mt='sm'>
                    <Button
                        variant='outline'
                        color='gray'
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button color='red' onClick={handleConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    )
}
