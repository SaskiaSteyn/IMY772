import { ActionIcon, Group, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { Plus, Trash2 } from 'lucide-react';
import ProfileEntryDivider from './profile-entry-divider.jsx';
import ProfileLineEntry from './profile-line-entry.jsx';
import ProfileSectionCard from './profile-section-card.jsx';

export default function ProfileExperienceCard({ entries, isEditing, onAddEntry, onRemoveEntry, onUpdateEntry }) {
  return (
    <ProfileSectionCard
      title="Experience"
      action={
        isEditing ? (
          <ActionIcon variant="light" radius="xl" size="sm" onClick={onAddEntry}>
            <Plus size={14} />
          </ActionIcon>
        ) : null
      }
    >
      <Stack gap="sm">
        {entries.map(({ entry, originalIndex }, index) => (
          <div key={`exp-${originalIndex}`}>
            {isEditing ? (
              <Stack gap="sm" className="profile-edit-entry">
                <Group justify="space-between" align="center">
                  <Text fw={700} size="sm" c="dimmed">
                    Experience Entry
                  </Text>
                  <ActionIcon color="red" variant="light" radius="xl" size="sm" onClick={() => onRemoveEntry(originalIndex)}>
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>
                <TextInput
                  placeholder="Role Title"
                  value={entry.role}
                  onChange={(e) => onUpdateEntry(originalIndex, 'role', e.currentTarget.value)}
                />
                <TextInput
                  placeholder="Organization"
                  value={entry.organization}
                  onChange={(e) => onUpdateEntry(originalIndex, 'organization', e.currentTarget.value)}
                />
                <Textarea
                  minRows={3}
                  placeholder="Description"
                  value={entry.description}
                  onChange={(e) => onUpdateEntry(originalIndex, 'description', e.currentTarget.value)}
                />
                <Group grow>
                  <TextInput
                    type="date"
                    placeholder="Start date"
                    value={entry.startDate}
                    onChange={(e) => onUpdateEntry(originalIndex, 'startDate', e.currentTarget.value)}
                  />
                  <TextInput
                    type="date"
                    placeholder="End date"
                    value={entry.endDate}
                    onChange={(e) => onUpdateEntry(originalIndex, 'endDate', e.currentTarget.value)}
                  />
                </Group>
              </Stack>
            ) : (
              <ProfileLineEntry
                title={entry.role}
                subtitle={entry.organization}
                description={entry.description}
                dateRange={entry.dateRange}
              />
            )}
            <ProfileEntryDivider index={index} total={entries.length} />
          </div>
        ))}
      </Stack>
    </ProfileSectionCard>
  );
}
