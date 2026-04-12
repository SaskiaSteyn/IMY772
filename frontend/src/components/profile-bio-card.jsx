import { Text, Textarea } from '@mantine/core';
import ProfileSectionCard from './profile-section-card.jsx';

export default function ProfileBioCard({ bio, isEditing, draftBio, onUpdateBio }) {
  return (
    <ProfileSectionCard title="Bio">
      {isEditing ? (
        <Textarea minRows={4} value={draftBio} onChange={(e) => onUpdateBio(e.currentTarget.value)} />
      ) : (
        <Text size="sm" c="dimmed" className="profile-line-entry__description">
          {bio}
        </Text>
      )}
    </ProfileSectionCard>
  );
}
