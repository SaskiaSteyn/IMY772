import { Card, Group, Title } from '@mantine/core';

export default function ProfileSectionCard({ title, children, action }) {
  return (
    <Card radius="md" withBorder padding="lg" className="profile-card">
      <Group justify="space-between" align="flex-start" mb="md">
        <Title order={3} className="profile-section-title">
          {title}
        </Title>
        {action}
      </Group>
      {children}
    </Card>
  );
}
