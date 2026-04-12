import { Box, Grid, Stack, Text } from '@mantine/core';
import { Droplets, Leaf, Recycle, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';
import DashboardNavbar from '../components/dashboard-navbar.jsx';
import ProfileActions from '../components/profile-actions.jsx';
import ProfileBioCard from '../components/profile-bio-card.jsx';
import ProfileEducationCard from '../components/profile-education-card.jsx';
import ProfileExperienceCard from '../components/profile-experience-card.jsx';
import ProfileSidebarCard from '../components/profile-sidebar-card.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './profile.scss';

const interests = ['Water Quality', 'Microbiology', 'Bioinformatics', 'Field Work', 'Public Health', 'GIS'];

const contributions = [
  { value: '24', label: 'Samples Logged' },
  { value: '8', label: 'Reports Reviewed' },
  { value: '16', label: 'Sites Monitored' },
  { value: '3', label: 'Studies Supported' },
];

const impactMetrics = [
  { icon: <Droplets size={16} />, label: 'Water tests completed', value: '128' },
  { icon: <Leaf size={16} />, label: 'Healthy ecosystems supported', value: '34' },
  { icon: <Recycle size={16} />, label: 'Samples tracked', value: '216' },
  { icon: <ShieldCheck size={16} />, label: 'Risk flags resolved', value: '12' },
];

const educationEntries = [
  {
    institution: 'University of Pretoria',
    qualification: 'BSc Microbiology',
    description:
      'Focused on microbial ecology, environmental sampling, and laboratory methods for studying waterborne organisms.',
    dateRange: '2019 - 2022',
  },
  {
    institution: 'University of Pretoria',
    qualification: 'Honours in Bioinformatics',
    description:
      'Worked with sequence analysis pipelines, data curation, and applied genomic interpretation for environmental samples.',
    dateRange: '2023 - 2024',
  },
];

const experienceEntries = [
  {
    role: 'Research Assistant',
    organization: 'MicroTrack Lab',
    description:
      'Assisted with sample intake, quality control, metadata validation, and preparation of monitoring reports for field teams.',
    dateRange: '2024 - Present',
  },
  {
    role: 'Field Sampling Intern',
    organization: 'Environmental Monitoring Unit',
    description:
      'Collected water samples, documented location data, and supported the recording of water quality measurements on site.',
    dateRange: '2022 - 2023',
  },
];

function toDateRange(startDate, endDate) {
  if (!startDate && !endDate) return '';
  const startYear = startDate ? startDate.slice(0, 4) : '';
  const endYear = endDate ? endDate.slice(0, 4) : 'Present';
  if (!startYear) return endYear;
  return `${startYear} - ${endYear}`;
}

function parseRangeToDates(rangeText) {
  const [startRaw, endRaw] = String(rangeText || '')
    .split('-')
    .map((v) => v?.trim());
  const startDate = startRaw && /^\d{4}$/.test(startRaw) ? `${startRaw}-01-01` : '';
  const endDate = endRaw && /^\d{4}$/.test(endRaw) ? `${endRaw}-12-31` : '';
  return { startDate, endDate };
}

function buildInitialProfile(user, persistedProfile = null) {
  const safeName = persistedProfile?.name || user?.name || 'Taylor';
  const safeSurname = persistedProfile?.surname || user?.surname || 'Brooks';
  const safeRole =
    persistedProfile?.role || user?.role?.replace(/_/g, ' ') || 'Environmental Researcher';
  const safeEmail = persistedProfile?.email || user?.email || 'taylor.brooks@microtrack.org';

  const educationDefault = educationEntries.map((entry) => ({
    institution: entry.institution,
    qualification: entry.qualification,
    description: entry.description,
    ...parseRangeToDates(entry.dateRange),
  }));

  const experienceDefault = experienceEntries.map((entry) => ({
    role: entry.role,
    organization: entry.organization,
    description: entry.description,
    ...parseRangeToDates(entry.dateRange),
  }));

  const education =
    Array.isArray(persistedProfile?.education) && persistedProfile.education.length > 0
      ? persistedProfile.education.map((entry) => ({
          institution: String(entry?.institution || ''),
          qualification: String(entry?.qualification || ''),
          description: String(entry?.description || ''),
          startDate: String(entry?.startDate || ''),
          endDate: String(entry?.endDate || ''),
        }))
      : educationDefault;

  const experience =
    Array.isArray(persistedProfile?.experience) && persistedProfile.experience.length > 0
      ? persistedProfile.experience.map((entry) => ({
          role: String(entry?.role || ''),
          organization: String(entry?.organization || ''),
          description: String(entry?.description || ''),
          startDate: String(entry?.startDate || ''),
          endDate: String(entry?.endDate || ''),
        }))
      : experienceDefault;

  const interestArray =
    Array.isArray(persistedProfile?.interests) && persistedProfile.interests.length > 0
      ? persistedProfile.interests
      : interests;

  const defaultBio = `${safeName} ${safeSurname} works with MicroTrack to monitor environmental water samples, validate biological metadata, and help transform field data into usable research insights. Their focus sits at the intersection of microbiology, public health, and applied environmental science, with a strong interest in making complex laboratory results easier to interpret for field teams and decision makers.`;

  return {
    name: safeName,
    surname: safeSurname,
    role: safeRole,
    email: safeEmail,
    interestsCsv: interestArray.join(', '),
    bio: persistedProfile?.bio || defaultBio,
    education,
    experience,
  };
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function getDateSortValue(entry) {
  const endDate = String(entry?.endDate || '').trim();
  const startDate = String(entry?.startDate || '').trim();

  // Ongoing entries (no end date) are treated as most recent.
  if (!endDate && startDate) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (endDate) {
    const endValue = new Date(endDate).getTime();
    if (!Number.isNaN(endValue)) {
      return endValue;
    }
  }

  if (startDate) {
    const startValue = new Date(startDate).getTime();
    if (!Number.isNaN(startValue)) {
      return startValue;
    }
  }

  return 0;
}

function sortEntriesWithIndex(entries) {
  return entries
    .map((entry, originalIndex) => ({ entry, originalIndex }))
    .sort((a, b) => {
      const primary = getDateSortValue(b.entry) - getDateSortValue(a.entry);
      if (primary !== 0) {
        return primary;
      }

      const aStart = new Date(a.entry.startDate || 0).getTime();
      const bStart = new Date(b.entry.startDate || 0).getTime();
      const secondary = (Number.isNaN(bStart) ? 0 : bStart) - (Number.isNaN(aStart) ? 0 : aStart);

      if (secondary !== 0) {
        return secondary;
      }

      return a.originalIndex - b.originalIndex;
    });
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(() => buildInitialProfile(user));
  const [draftData, setDraftData] = useState(() => buildInitialProfile(user));
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!user) {
        if (isMounted) {
          setProfileLoading(false);
        }
        return;
      }

      setProfileLoading(true);
      setProfileError('');

      try {
        const data = await authApi.getProfile();
        if (!isMounted) return;
        const next = buildInitialProfile(user, data.profile);
        setProfileData(next);
        setDraftData(next);
        setIsEditing(false);
      } catch (err) {
        if (!isMounted) return;
        const fallback = buildInitialProfile(user);
        setProfileData(fallback);
        setDraftData(fallback);
        setProfileError(err.message || 'Failed to load profile');
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.userID]);

  const activeData = isEditing ? draftData : profileData;
  const fullName = `${activeData.name} ${activeData.surname}`.trim();
  const email = activeData.email;

  const interestItems = useMemo(
    () =>
      activeData.interestsCsv
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [activeData.interestsCsv]
  );

  const sortedEducationEntries = useMemo(
    () =>
      sortEntriesWithIndex(activeData.education).map(({ entry, originalIndex }) => ({
        entry: {
          ...entry,
          dateRange: toDateRange(entry.startDate, entry.endDate),
        },
        originalIndex,
      })),
    [activeData.education]
  );

  const sortedExperienceEntries = useMemo(
    () =>
      sortEntriesWithIndex(activeData.experience).map(({ entry, originalIndex }) => ({
        entry: {
          ...entry,
          dateRange: toDateRange(entry.startDate, entry.endDate),
        },
        originalIndex,
      })),
    [activeData.experience]
  );

  function updateDraftField(field, value) {
    setDraftData((prev) => ({ ...prev, [field]: value }));
  }

  function updateEducation(index, field, value) {
    setDraftData((prev) => {
      const next = cloneData(prev);
      next.education[index][field] = value;
      return next;
    });
  }

  function addEducation() {
    setDraftData((prev) => {
      const next = cloneData(prev);
      next.education.push({
        institution: '',
        qualification: '',
        description: '',
        startDate: '',
        endDate: '',
      });
      return next;
    });
  }

  function removeEducation(index) {
    setDraftData((prev) => {
      const next = cloneData(prev);
      next.education.splice(index, 1);
      return next;
    });
  }

  function updateExperience(index, field, value) {
    setDraftData((prev) => {
      const next = cloneData(prev);
      next.experience[index][field] = value;
      return next;
    });
  }

  function addExperience() {
    setDraftData((prev) => {
      const next = cloneData(prev);
      next.experience.push({
        role: '',
        organization: '',
        description: '',
        startDate: '',
        endDate: '',
      });
      return next;
    });
  }

  function removeExperience(index) {
    setDraftData((prev) => {
      const next = cloneData(prev);
      next.experience.splice(index, 1);
      return next;
    });
  }

  function handleStartEditing() {
    setDraftData(cloneData(profileData));
    setIsEditing(true);
  }

  function handleCancel() {
    setDraftData(cloneData(profileData));
    setIsEditing(false);
  }

  async function handleSave() {
    setIsSaving(true);
    setProfileError('');

    const payload = {
      name: draftData.name,
      surname: draftData.surname,
      role: draftData.role,
      email: draftData.email,
      bio: draftData.bio,
      interests: draftData.interestsCsv
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      education: draftData.education.map((entry) => ({
        institution: entry.institution,
        qualification: entry.qualification,
        description: entry.description,
        startDate: entry.startDate,
        endDate: entry.endDate,
      })),
      experience: draftData.experience.map((entry) => ({
        role: entry.role,
        organization: entry.organization,
        description: entry.description,
        startDate: entry.startDate,
        endDate: entry.endDate,
      })),
    };

    try {
      const data = await authApi.updateProfile(payload);
      const next = buildInitialProfile(data.user || user, data.profile);
      setProfileData(next);
      setDraftData(cloneData(next));
      setIsEditing(false);
      await refreshUser().catch(() => null);
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Box className="profile-page">
      <DashboardNavbar />

      {profileLoading ? (
        <Box px={20} py="xl">
          <Text c="dimmed">Loading profile...</Text>
        </Box>
      ) : null}

      {profileError ? (
        <Box px={20} pt="sm">
          <Text c="red" size="sm">
            {profileError}
          </Text>
        </Box>
      ) : null}

      <Box py="lg" className="profile-page__content">
        <Grid gutter={20} align="flex-start">
          <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
            <ProfileSidebarCard
              fullName={fullName}
              email={email}
              isEditing={isEditing}
              draftData={draftData}
              interestItems={interestItems}
              contributions={contributions}
              impactMetrics={impactMetrics}
              onUpdateField={updateDraftField}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
            <Stack gap={20} h="100%">
              <ProfileBioCard
                bio={profileData.bio}
                isEditing={isEditing}
                draftBio={draftData.bio}
                onUpdateBio={(value) => updateDraftField('bio', value)}
              />

              <ProfileEducationCard
                entries={sortedEducationEntries}
                isEditing={isEditing}
                onAddEntry={addEducation}
                onRemoveEntry={removeEducation}
                onUpdateEntry={updateEducation}
              />

              <ProfileExperienceCard
                entries={sortedExperienceEntries}
                isEditing={isEditing}
                onAddEntry={addExperience}
                onRemoveEntry={removeExperience}
                onUpdateEntry={updateExperience}
              />

              <ProfileActions
                isEditing={isEditing}
                isSaving={isSaving}
                onEdit={handleStartEditing}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            </Stack>
          </Grid.Col>
        </Grid>
      </Box>
    </Box>
  );
}
