import {
    ActionIcon,
    Group,
    Stack,
    Text,
    TextInput,
    Textarea,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { Plus, Trash2 } from 'lucide-react';
import ProfileEntryDivider from './profile-entry-divider.jsx';
import ProfileLineEntry from './profile-line-entry.jsx';
import ProfileSectionCard from './profile-section-card.jsx';

const parseDate = (dateString) => {
    if (!dateString || dateString.trim() === '') return null;
    try {
        // Handle both YYYY-MM-DD format and ISO format
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) {
            console.warn('Invalid date from parseDate:', dateString);
            return null;
        }
        // Return local date to avoid timezone shifts
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    } catch (e) {
        console.error('Error parsing date:', dateString, e);
        return null;
    }
};

const formatDate = (date) => {
    if (!date) {
        console.log('formatDate called with null/undefined');
        return '';
    }
    // Mantine passes a string in YYYY-MM-DD format
    if (typeof date === 'string') {
        console.log('formatDate - date is already a string:', date);
        return date;
    }
    // Handle Date objects
    if (isNaN(date.getTime())) {
        console.warn('Invalid date object passed to formatDate:', date);
        return '';
    }
    try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        console.log('formatDate result:', formattedDate, 'from date:', date);
        return formattedDate;
    } catch (e) {
        console.error('Error formatting date:', date, e);
        return '';
    }
};

export default function ProfileExperienceCard({
    entries,
    isEditing,
    onAddEntry,
    onRemoveEntry,
    onUpdateEntry,
}) {
    return (
        <ProfileSectionCard
            title='Experience'
            action={
                isEditing ? (
                    <ActionIcon
                        variant='subtle'
                        size='sm'
                        onClick={onAddEntry}
                    >
                        <Plus size={16} />
                    </ActionIcon>
                ) : null
            }
        >
            {entries.length === 0 ? (
                <Stack align='center' justify='center' gap='md' py='xl'>
                    <Text size='sm' c='dimmed' ta='center'>
                        No information added yet
                    </Text>
                    {isEditing && (
                        <Text size='xs' c='dimmed'>
                            Click the + button to add an experience entry
                        </Text>
                    )}
                </Stack>
            ) : (
                <Stack gap='sm'>
                    {entries.map(({ entry, originalIndex }, index) => (
                        <div key={`exp-${originalIndex}`}>
                            {isEditing ? (
                                <Stack gap='sm' className='profile-edit-entry'>
                                    <Group
                                        justify='space-between'
                                        align='center'
                                    >
                                        <Text fw={700} size='sm' c='dimmed'>
                                            Experience Entry
                                        </Text>
                                        <ActionIcon
                                            color='red'
                                            variant='subtle'
                                            size='sm'
                                            onClick={() =>
                                                onRemoveEntry(originalIndex)
                                            }
                                        >
                                            <Trash2 size={16} />
                                        </ActionIcon>
                                    </Group>
                                    <TextInput
                                        placeholder='Role Title'
                                        value={entry.role}
                                        onChange={(e) =>
                                            onUpdateEntry(
                                                originalIndex,
                                                'role',
                                                e.currentTarget.value,
                                            )
                                        }
                                    />
                                    <TextInput
                                        placeholder='Organization'
                                        value={entry.organization}
                                        onChange={(e) =>
                                            onUpdateEntry(
                                                originalIndex,
                                                'organization',
                                                e.currentTarget.value,
                                            )
                                        }
                                    />
                                    <Textarea
                                        minRows={3}
                                        placeholder='Description'
                                        value={entry.description}
                                        onChange={(e) =>
                                            onUpdateEntry(
                                                originalIndex,
                                                'description',
                                                e.currentTarget.value,
                                            )
                                        }
                                    />
                                    <Group grow>
                                        <DatePickerInput
                                            label='Start date'
                                            placeholder='Pick start date'
                                            clearable
                                            value={parseDate(entry.startDate)}
                                            onChange={(date) => {
                                                console.log(
                                                    'Start date onChange - received:',
                                                    date,
                                                    'type:',
                                                    typeof date,
                                                );
                                                const formatted =
                                                    formatDate(date);
                                                console.log(
                                                    'Formatted to:',
                                                    formatted,
                                                );
                                                onUpdateEntry(
                                                    originalIndex,
                                                    'startDate',
                                                    formatted,
                                                );
                                            }}
                                        />
                                        <DatePickerInput
                                            label='End date'
                                            placeholder='Pick end date'
                                            clearable
                                            value={parseDate(entry.endDate)}
                                            onChange={(date) => {
                                                console.log(
                                                    'End date onChange - received:',
                                                    date,
                                                    'type:',
                                                    typeof date,
                                                );
                                                const formatted =
                                                    formatDate(date);
                                                console.log(
                                                    'Formatted to:',
                                                    formatted,
                                                );
                                                onUpdateEntry(
                                                    originalIndex,
                                                    'endDate',
                                                    formatted,
                                                );
                                            }}
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
                            <ProfileEntryDivider
                                index={index}
                                total={entries.length}
                            />
                        </div>
                    ))}
                </Stack>
            )}
        </ProfileSectionCard>
    );
}
