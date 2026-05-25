import { Button, Group, Modal, Stack, Text } from '@mantine/core';

export default function LogoutConfirmationModal({
    opened,
    onClose,
    onConfirm,
    isLoading,
}) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title='Confirm Logout'
            centered
            size='sm'
        >
            <Stack gap='lg'>
                <Text c='dimmed'>
                    Are you sure you want to logout? You'll need to log back in
                    to access your account.
                </Text>
                <Group justify='flex-end' gap='sm'>
                    <Button
                        variant='outline'
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button color='red' onClick={onConfirm} loading={isLoading}>
                        Logout
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
