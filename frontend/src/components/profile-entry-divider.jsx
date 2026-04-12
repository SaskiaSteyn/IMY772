import { Divider } from '@mantine/core';

export default function ProfileEntryDivider({ index, total }) {
  if (index === total - 1) {
    return null;
  }

  return <Divider className="profile-divider" />;
}
