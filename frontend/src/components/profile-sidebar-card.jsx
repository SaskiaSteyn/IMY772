import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  FileInput,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

export default function ProfileSidebarCard({
  avatarSrc,
  fullName,
  email,
  isEditing,
  draftData,
  interestItems,
  contributions,
  impactMetrics,
  profileImageInputKey,
  canRemoveProfileImage,
  isProfileImageMarkedForRemoval,
  onSelectProfileImage,
  onRemoveProfileImage,
  onUpdateField,
}) {
  const fallbackAvatarSrc = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName || email || 'User')}`;

  return (
    <Card radius="md" withBorder padding="md" className="profile-card">
      <Stack gap="lg" align="stretch">
        <Stack align="center" gap="md" pt="xs">
          <Avatar
            src={avatarSrc || fallbackAvatarSrc}
            radius="999px"
            size={164}
            className="profile-avatar"
            alt="User avatar"
          >
            {fullName
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </Avatar>

          {isEditing ? (
            <Stack gap="sm" w="100%" mt={2}>
              <TextInput label="Name" value={draftData.name} onChange={(e) => onUpdateField('name', e.currentTarget.value)} />
              <TextInput
                label="Surname"
                value={draftData.surname}
                onChange={(e) => onUpdateField('surname', e.currentTarget.value)}
              />
              <Box>
                <Text size="xs" c="dimmed" fw={600} mb={4}>
                  Role
                </Text>
                <Text size="sm">{draftData.role}</Text>
              </Box>
              <TextInput label="Email" value={draftData.email} onChange={(e) => onUpdateField('email', e.currentTarget.value)} />
              <FileInput
                key={profileImageInputKey}
                label="Profile Image"
                placeholder="Upload a JPEG or PNG"
                accept="image/jpeg,image/png"
                onChange={onSelectProfileImage}
              />
              <Group justify="space-between" align="center" gap="xs">
                <Text size="xs" c="dimmed">
                  JPEG/PNG up to 2MB. Image is resized automatically.
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={onRemoveProfileImage}
                  disabled={!canRemoveProfileImage}
                >
                  Remove image
                </Button>
              </Group>
              {isProfileImageMarkedForRemoval ? (
                <Text size="xs" c="dimmed">
                  Profile image will be removed when you save changes.
                </Text>
              ) : null}
            </Stack>
          ) : (
            <Box ta="center" mt={2}>
              <Title order={2} className="profile-name">
                {fullName}
              </Title>
              <Text size="xs" className="profile-email" mt={8} fw={600}>
                {email}
              </Text>
            </Box>
          )}
        </Stack>

        <Box>
          <Text fw={800} size="md" c="dimmed" mb="md">
            Interests
          </Text>
          {isEditing ? (
            <TextInput
              placeholder="Comma separated interests"
              value={draftData.interestsCsv}
              onChange={(e) => onUpdateField('interestsCsv', e.currentTarget.value)}
            />
          ) : (
            <Group gap={8}>
              {interestItems.map((interest) => (
                <Badge key={interest} radius="sm" size="md" variant="light" className="profile-interest-badge">
                  {interest}
                </Badge>
              ))}
            </Group>
          )}
        </Box>

        <Box>
          <Text fw={800} size="md" c="dimmed" mb="md">
            Contributions
          </Text>
          <SimpleGrid cols={2} spacing={10} verticalSpacing={10}>
            {contributions.map((item) => (
              <Card key={item.label} withBorder radius="sm" padding="md" className="profile-stat-card">
                <Text fw={800} className="profile-stat-card__value" lh={1}>
                  {item.value}
                </Text>
                <Text size="xs" c="dimmed" mt={7}>
                  {item.label}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Box>

        <Box>
          <Text fw={800} size="md" c="dimmed" mb="md">
            Environmental Impact
          </Text>
          <Stack gap={5}>
            {impactMetrics.map((item) => (
              <Group key={item.label} justify="space-between" align="center" py={7} wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <Box className="profile-icon-pill">{item.icon}</Box>
                  <Text size="sm" fw={600}>
                    {item.label}
                  </Text>
                </Group>
                <Text size="md" fw={800} className="profile-impact-value">
                  {item.value}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Card>
  );
}
