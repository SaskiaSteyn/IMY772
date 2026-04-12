import { Button, Group } from '@mantine/core';

export default function ProfileActions({ isEditing, isSaving, onEdit, onCancel, onSave }) {
  return (
    <Group justify="flex-end" mt={2}>
      {isEditing ? (
        <Group gap="sm">
          <Button radius="xl" size="sm" variant="outline" disabled={isSaving} onClick={onCancel}>
            Cancel
          </Button>
          <Button radius="xl" size="sm" loading={isSaving} disabled={isSaving} onClick={onSave}>
            Save Changes
          </Button>
        </Group>
      ) : (
        <Button radius="xl" size="sm" onClick={onEdit}>
          Edit Profile
        </Button>
      )}
    </Group>
  );
}
