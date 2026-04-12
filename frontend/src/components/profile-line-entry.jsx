import { Box, Flex, Text } from '@mantine/core';

export default function ProfileLineEntry({ title, subtitle, description, dateRange }) {
  return (
    <Box className="profile-line-entry">
      <Flex justify="space-between" align="flex-start" gap="md">
        <Box>
          <Text fw={700} size="md">
            {title}
          </Text>
          <Text size="sm" c="dimmed" fw={600} mt={2}>
            {subtitle}
          </Text>
        </Box>
        <Text size="sm" c="dimmed" fw={600} className="profile-line-entry__range">
          {dateRange}
        </Text>
      </Flex>
      <Text size="sm" c="dimmed" mt="sm" className="profile-line-entry__description">
        {description}
      </Text>
    </Box>
  );
}
