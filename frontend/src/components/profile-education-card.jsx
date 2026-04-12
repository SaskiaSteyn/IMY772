import { ActionIcon, Group, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { Plus, Trash2 } from 'lucide-react';
import ProfileEntryDivider from './profile-entry-divider.jsx';
import ProfileLineEntry from './profile-line-entry.jsx';
import ProfileSectionCard from './profile-section-card.jsx';

export default function ProfileEducationCard({ entries, isEditing, onAddEntry, onRemoveEntry, onUpdateEntry }) {
  return (
    <ProfileSectionCard
      title="Education"
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
          <div key={`edu-${originalIndex}`}>
            {isEditing ? (
              <Stack gap="sm" className="profile-edit-entry">
                <Group justify="space-between" align="center">
                  <Text fw={700} size="sm" c="dimmed">
                    Education Entry
                  </Text>
                  <ActionIcon color="red" variant="light" radius="xl" size="sm" onClick={() => onRemoveEntry(originalIndex)}>
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>
                <TextInput
                  placeholder="Institution"
                  value={entry.institution}
                  onChange={(e) => onUpdateEntry(originalIndex, 'institution', e.currentTarget.value)}
                />
                <TextInput
                  placeholder="Qualification"
                  value={entry.qualification}
                  onChange={(e) => onUpdateEntry(originalIndex, 'qualification', e.currentTarget.value)}
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
                title={entry.institution}
                subtitle={entry.qualification}
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
