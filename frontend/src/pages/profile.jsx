import {Box, Grid, Stack, Text} from '@mantine/core';
import {TrendingUp, TrendingDown, Minus, MapPin, FlaskConical, Calendar, Activity} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {authApi} from '../api/auth.js';
import DashboardNavbar from '../components/dashboard/dashboard-navbar.jsx';
import ProfileActions from '../components/profile-actions.jsx';
import ProfileBioCard from '../components/profile-bio-card.jsx';
import ProfileEducationCard from '../components/profile-education-card.jsx';
import ProfileExperienceCard from '../components/profile-experience-card.jsx';
import ProfileSidebarCard from '../components/profile-sidebar-card.jsx';
import {useAuth} from '../context/auth-context.jsx';
import './profile.scss';
import {fetchSamplesByUser, fetchAllIsolates, fetchAllAmrFindings, fetchAllPredictedPhenotypes} from '../api/sample-data-management.js';

// Default interests (restored from commented block)
const defaultInterests = [
    'Water Quality',
    'Microbiology',
    'Bioinformatics',
    'Field Work',
    'Public Health',
    'GIS',
];

const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// const educationEntries = [
//     {
//         institution: 'University of Pretoria',
//         qualification: 'BSc Microbiology',
//         description: 'Focused on microbial ecology, environmental sampling, and laboratory methods for studying waterborne organisms.',
//         dateRange: '2019 - 2022',
//     },
//     {
//         institution: 'University of Pretoria',
//         qualification: 'Honours in Bioinformatics',
//         description: 'Worked with sequence analysis pipelines, data curation, and applied genomic interpretation for environmental samples.',
//         dateRange: '2023 - 2024',
//     },
// ];

// const experienceEntries = [
//     {
//         role: 'Research Assistant',
//         organization: 'MicroTrack Lab',
//         description: 'Assisted with sample intake, quality control, metadata validation, and preparation of monitoring reports for field teams.',
//         dateRange: '2024 - Present',
//     },
//     {
//         role: 'Field Sampling Intern',
//         organization: 'Environmental Monitoring Unit',
//         description: 'Collected water samples, documented location data, and supported the recording of water quality measurements on site.',
//         dateRange: '2022 - 2023',
//     },
// ];

function toDateRange(startDate, endDate) {
    if (!startDate && !endDate) return '';
    const startYear = startDate ? startDate.slice(0, 4) : '';
    const endYear = endDate ? endDate.slice(0, 4) : 'Present';
    if (!startYear) return endYear;
    return `${startYear} - ${endYear}`;
}

// function parseRangeToDates(rangeText) {
//     const [startRaw, endRaw] = String(rangeText || '')
//         .split('-')
//         .map((v) => v?.trim());
//     const startDate = startRaw && /^\d{4}$/.test(startRaw) ? `${startRaw}-01-01` : '';
//     const endDate = endRaw && /^\d{4}$/.test(endRaw) ? `${endRaw}-12-31` : '';
//     return {startDate, endDate};
// }

function buildInitialProfile(user, persistedProfile = null) {
    const safeName = persistedProfile?.name || user?.name || 'Taylor';
    const safeSurname = persistedProfile?.surname || user?.surname || 'Brooks';
    const safeRole = persistedProfile?.role || user?.role?.replace(/_/g, ' ') || 'Environmental Researcher';
    const safeEmail = persistedProfile?.email || user?.email || 'taylor.brooks@microtrack.org';

    const educationDefault = [];
    const experienceDefault = [];

    const education = Array.isArray(persistedProfile?.education) && persistedProfile.education.length > 0
        ? persistedProfile.education.map((entry) => ({
            institution: String(entry?.institution || ''),
            qualification: String(entry?.qualification || ''),
            description: String(entry?.description || ''),
            startDate: String(entry?.startDate || ''),
            endDate: String(entry?.endDate || ''),
        }))
        : educationDefault;

    const experience = Array.isArray(persistedProfile?.experience) && persistedProfile.experience.length > 0
        ? persistedProfile.experience.map((entry) => ({
            role: String(entry?.role || ''),
            organization: String(entry?.organization || ''),
            description: String(entry?.description || ''),
            startDate: String(entry?.startDate || ''),
            endDate: String(entry?.endDate || ''),
        }))
        : experienceDefault;

    const interestArray = Array.isArray(persistedProfile?.interests) && persistedProfile.interests.length > 0
        ? persistedProfile.interests
        : defaultInterests;

    const profileImage = typeof persistedProfile?.profileImage === 'string' && persistedProfile.profileImage.trim().length > 0
        ? persistedProfile.profileImage
        : null;

    return {
        name: safeName,
        surname: safeSurname,
        role: safeRole,
        email: safeEmail,
        interestsCsv: interestArray.join(', '),
        bio: persistedProfile?.bio || '',
        education,
        experience,
        profileImage,
    };
}

function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}

function getDateSortValue(entry) {
    const endDate = String(entry?.endDate || '').trim();
    const startDate = String(entry?.startDate || '').trim();

    if (!endDate && startDate) {
        return Number.MAX_SAFE_INTEGER;
    }
    if (endDate) {
        const endValue = new Date(endDate).getTime();
        if (!Number.isNaN(endValue)) return endValue;
    }
    if (startDate) {
        const startValue = new Date(startDate).getTime();
        if (!Number.isNaN(startValue)) return startValue;
    }
    return 0;
}

function sortEntriesWithIndex(entries) {
    return entries
        .map((entry, originalIndex) => ({entry, originalIndex}))
        .sort((a, b) => {
            const primary = getDateSortValue(b.entry) - getDateSortValue(a.entry);
            if (primary !== 0) return primary;
            const aStart = new Date(a.entry.startDate || 0).getTime();
            const bStart = new Date(b.entry.startDate || 0).getTime();
            const secondary = (Number.isNaN(bStart) ? 0 : bStart) - (Number.isNaN(aStart) ? 0 : aStart);
            if (secondary !== 0) return secondary;
            return a.originalIndex - b.originalIndex;
        });
}

export default function Profile() {
    const {user, refreshUser} = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState(() => buildInitialProfile(user));
    const [draftData, setDraftData] = useState(() => buildInitialProfile(user));
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [pendingProfileImageFile, setPendingProfileImageFile] = useState(null);
    const [pendingProfileImagePreview, setPendingProfileImagePreview] = useState('');
    const [removeProfileImage, setRemoveProfileImage] = useState(false);
    const [profileImageInputKey, setProfileImageInputKey] = useState(0);
    const [samplesCount, setSamplesCount] = useState(0);
    const [sitesCount, setSitesCount] = useState(0);
    const [samplesLoading, setSamplesLoading] = useState(true);
    const [isolatesCount, setIsolatesCount] = useState(0);
    const [isolatesLoading, setIsolatesLoading] = useState(true);
    const [amrGeneCount, setAmrGeneCount] = useState(0);
    const [amrLoading, setAmrLoading] = useState(true);
    const [impactMetrics, setImpactMetrics] = useState([]);

    // Load user profile
    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
            if (!user) {
                if (isMounted) setProfileLoading(false);
                return;
            }
            setProfileLoading(true);
            setProfileError('');
            try {
                const data = await authApi.getProfile();
                if (!isMounted) return;
                const next = buildInitialProfile(user, data.profile);
                setProfileData(next);
                setDraftData(cloneData(next));
                setIsEditing(false);
                setPendingProfileImageFile(null);
                setPendingProfileImagePreview('');
                setRemoveProfileImage(false);
                setProfileImageInputKey((prev) => prev + 1);
            } catch (err) {
                if (!isMounted) return;
                const fallback = buildInitialProfile(user);
                setProfileData(fallback);
                setDraftData(cloneData(fallback));
                setPendingProfileImageFile(null);
                setPendingProfileImagePreview('');
                setRemoveProfileImage(false);
                setProfileImageInputKey((prev) => prev + 1);
                setProfileError(err.message || 'Failed to load profile');
            } finally {
                if (isMounted) setProfileLoading(false);
            }
        }
        loadProfile();
        return () => {isMounted = false;};
    }, [user]);

    useEffect(() => {
        return () => {
            if (pendingProfileImagePreview) URL.revokeObjectURL(pendingProfileImagePreview);
        };
    }, [pendingProfileImagePreview]);

    const activeData = isEditing ? draftData : profileData;
    const fullName = `${activeData.name} ${activeData.surname}`.trim();
    const email = activeData.email;

    const interestItems = useMemo(
        () => activeData.interestsCsv.split(',').map((item) => item.trim()).filter(Boolean),
        [activeData.interestsCsv]
    );

    const sortedEducationEntries = useMemo(
        () => sortEntriesWithIndex(activeData.education).map(({entry, originalIndex}) => ({
            entry: {...entry, dateRange: toDateRange(entry.startDate, entry.endDate)},
            originalIndex,
        })),
        [activeData.education]
    );

    const sortedExperienceEntries = useMemo(
        () => sortEntriesWithIndex(activeData.experience).map(({entry, originalIndex}) => ({
            entry: {...entry, dateRange: toDateRange(entry.startDate, entry.endDate)},
            originalIndex,
        })),
        [activeData.experience]
    );

    const sidebarAvatarSrc = useMemo(() => {
        if (!isEditing) return profileData.profileImage || null;
        if (pendingProfileImagePreview) return pendingProfileImagePreview;
        if (removeProfileImage) return null;
        return draftData.profileImage || null;
    }, [draftData.profileImage, isEditing, pendingProfileImagePreview, profileData.profileImage, removeProfileImage]);

    const canRemoveProfileImage = useMemo(() => {
        if (removeProfileImage) return false;
        return Boolean(pendingProfileImageFile || draftData.profileImage);
    }, [draftData.profileImage, pendingProfileImageFile, removeProfileImage]);

    // Fetch contributions and impact metrics
    useEffect(() => {
        if (!user?.userID) {
            setSamplesLoading(false);
            setIsolatesLoading(false);
            setAmrLoading(false);
            return;
        }

        let isMounted = true;

        async function fetchUserStats() {
            try {
                setSamplesLoading(true);
                setIsolatesLoading(true);
                setAmrLoading(true);

                // 1. Fetch user's samples
                const samples = await fetchSamplesByUser(user.userID);
                if (!isMounted) return;

                const totalSamples = samples.length;
                const uniqueSites = new Set(samples.map(s => s.location_name).filter(loc => loc && loc.trim() !== ''));
                setSamplesCount(totalSamples);
                setSitesCount(uniqueSites.size);
                const userSampleIds = new Set(samples.map(s => s.sample_id));

                // 2. Isolates count
                const allIsolates = await fetchAllIsolates();
                if (!isMounted) return;
                const isolatesCountForUser = allIsolates.filter(isolate => userSampleIds.has(isolate.sample_id)).length;
                setIsolatesCount(isolatesCountForUser);
                setIsolatesLoading(false);

                // 3. AMR genes
                const allAmrFindings = await fetchAllAmrFindings();
                if (!isMounted) return;
                const uniqueGenes = new Set();
                allAmrFindings.forEach(finding => {
                    if (userSampleIds.has(finding.sample_id) && finding.gene_symbol) {
                        uniqueGenes.add(finding.gene_symbol);
                    }
                });
                setAmrGeneCount(uniqueGenes.size);
                setAmrLoading(false);

                // 4. Predicted phenotypes
                const allPredictedPhenotypes = await fetchAllPredictedPhenotypes();
                if (!isMounted) return;

                // --- Sites with resistance detected ---
                const locationHasResistance = new Map();
                allAmrFindings.forEach(finding => {
                    if (userSampleIds.has(finding.sample_id)) {
                        const sample = samples.find(s => s.sample_id === finding.sample_id);
                        if (sample?.location_name) locationHasResistance.set(sample.location_name, true);
                    }
                });
                allPredictedPhenotypes.forEach(pp => {
                    if (userSampleIds.has(pp.sample_id) && pp.resistant === true) {
                        const sample = samples.find(s => s.sample_id === pp.sample_id);
                        if (sample?.location_name) locationHasResistance.set(sample.location_name, true);
                    }
                });
                const sitesWithResistance = locationHasResistance.size;

                // --- MDR samples (≥3 antibiotic classes) ---
                const getAntibioticClass = (antibiotic) => {
                    const mapping = {
                        'Amoxicillin': 'Penicillin', 'Ampicillin': 'Penicillin',
                        'Ciprofloxacin': 'Fluoroquinolone', 'Levofloxacin': 'Fluoroquinolone',
                        'Tetracycline': 'Tetracycline', 'Doxycycline': 'Tetracycline',
                        'Erythromycin': 'Macrolide', 'Azithromycin': 'Macrolide',
                        'Gentamicin': 'Aminoglycoside', 'Amikacin': 'Aminoglycoside',
                        'Meropenem': 'Carbapenem', 'Imipenem': 'Carbapenem',
                        'Vancomycin': 'Glycopeptide', 'Ceftriaxone': 'Cephalosporin', 'Cefotaxime': 'Cephalosporin',
                    };
                    return mapping[antibiotic] || antibiotic;
                };
                const sampleAntibioticClasses = new Map();
                allPredictedPhenotypes.forEach(pp => {
                    if (userSampleIds.has(pp.sample_id) && pp.resistant === true && pp.antibiotic) {
                        const abClass = getAntibioticClass(pp.antibiotic);
                        if (!sampleAntibioticClasses.has(pp.sample_id)) {
                            sampleAntibioticClasses.set(pp.sample_id, new Set());
                        }
                        sampleAntibioticClasses.get(pp.sample_id).add(abClass);
                    }
                });
                let mdrSamplesCount = 0;
                sampleAntibioticClasses.forEach((classes) => {
                    if (classes.size >= 3) mdrSamplesCount++;
                });

                // --- Longest active monitoring site (days) ---
                let maxDays = 0;
                const locationDateRanges = new Map();
                samples.forEach(sample => {
                    if (!sample.location_name || !sample.collection_date) return;
                    const date = new Date(sample.collection_date);
                    if (isNaN(date)) return;
                    const existing = locationDateRanges.get(sample.location_name);
                    if (!existing) {
                        locationDateRanges.set(sample.location_name, {first: date, last: date});
                    } else {
                        if (date < existing.first) existing.first = date;
                        if (date > existing.last) existing.last = date;
                    }
                });
                locationDateRanges.forEach(({first, last}) => {
                    const days = Math.ceil((last - first) / (1000 * 60 * 60 * 24));
                    if (days > maxDays) maxDays = days;
                });
                const longestActive = maxDays > 0 ? `${maxDays} days` : 'N/A';

                // --- Resistance trend flag ---
                const sortedSamples = [...samples].sort((a, b) => new Date(a.collection_date) - new Date(b.collection_date));
                const sampleOrder = new Map();
                sortedSamples.forEach((s, idx) => sampleOrder.set(s.sample_id, idx));
                const sampleResistant = new Map();
                allPredictedPhenotypes.forEach(pp => {
                    if (userSampleIds.has(pp.sample_id) && pp.resistant === true) {
                        sampleResistant.set(pp.sample_id, true);
                    }
                });

                let trendIcon = <Minus size={16} />;
                let trendDisplayValue = 'Insufficient data';
                if (sortedSamples.length >= 2) {
                    const last5Indices = new Set(sortedSamples.slice(-5).map(s => sampleOrder.get(s.sample_id)));
                    let recentResistant = 0, recentTotal = 0;
                    let priorResistant = 0, priorTotal = 0;
                    sortedSamples.forEach((sample, idx) => {
                        const isResistant = sampleResistant.get(sample.sample_id) === true;
                        if (last5Indices.has(idx)) {
                            recentTotal++;
                            if (isResistant) recentResistant++;
                        } else {
                            priorTotal++;
                            if (isResistant) priorResistant++;
                        }
                    });
                    const recentPercent = recentTotal === 0 ? 0 : recentResistant / recentTotal;
                    const priorPercent = priorTotal === 0 ? 0 : priorResistant / priorTotal;
                    const trend = recentPercent - priorPercent;
                    if (trend > 0.05) trendIcon = <TrendingUp size={16} />;
                    else if (trend < -0.05) trendIcon = <TrendingDown size={16} />;
                    else trendIcon = <Minus size={16} />;
                    const recentPercentFormatted = (recentPercent * 100).toFixed(0);
                    const priorPercentFormatted = (priorPercent * 100).toFixed(0);
                    trendDisplayValue = `${recentPercentFormatted}% vs ${priorPercentFormatted}%`;
                }

                const newImpactMetrics = [
                    {icon: <MapPin size={16} />, label: 'Sites with resistance detected', value: String(sitesWithResistance)},
                    {icon: <FlaskConical size={16} />, label: 'Multi-drug resistant samples', value: String(mdrSamplesCount)},
                    {icon: <Calendar size={16} />, label: 'Longest active monitoring site', value: longestActive},
                    {icon: trendIcon, label: 'Resistance trend', value: trendDisplayValue},
                ];
                setImpactMetrics(newImpactMetrics);

            } catch (err) {
                console.error('Failed to fetch user stats:', err);
                if (!isMounted) return;
                setSamplesCount(0);
                setSitesCount(0);
                setIsolatesCount(0);
                setAmrGeneCount(0);
                setIsolatesLoading(false);
                setAmrLoading(false);
            } finally {
                if (isMounted) setSamplesLoading(false);
            }
        }

        fetchUserStats();
        return () => {isMounted = false;};
    }, [user?.userID]);

    const contributions = useMemo(() => [
        {value: samplesLoading ? '...' : String(samplesCount), label: 'Samples Logged'},
        {value: isolatesLoading ? '...' : String(isolatesCount), label: 'Isolates characterized'},
        {value: samplesLoading ? '...' : String(sitesCount), label: 'Sites Monitored'},
        {value: amrLoading ? '...' : String(amrGeneCount), label: 'AMR genes detected'},
    ], [samplesCount, sitesCount, samplesLoading, isolatesCount, isolatesLoading, amrGeneCount, amrLoading]);

    // Reset functions
    function resetPendingProfileImageDraft() {
        setPendingProfileImageFile(null);
        setPendingProfileImagePreview('');
        setRemoveProfileImage(false);
        setProfileImageInputKey((prev) => prev + 1);
    }

    function handleProfileImageSelection(file) {
        if (!file) return;
        if (!PROFILE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
            setProfileError('Only JPEG and PNG images are allowed for profile images.');
            setProfileImageInputKey((prev) => prev + 1);
            return;
        }
        if (file.size > PROFILE_IMAGE_MAX_BYTES) {
            setProfileError('Profile image must be 2MB or smaller.');
            setProfileImageInputKey((prev) => prev + 1);
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setPendingProfileImageFile(file);
        setPendingProfileImagePreview(previewUrl);
        setRemoveProfileImage(false);
        setProfileError('');
    }

    function handleRemoveProfileImage() {
        setPendingProfileImageFile(null);
        setPendingProfileImagePreview('');
        setRemoveProfileImage(true);
        setProfileImageInputKey((prev) => prev + 1);
        setProfileError('');
    }

    function updateDraftField(field, value) {
        setDraftData((prev) => ({...prev, [field]: value}));
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
            next.education.push({institution: '', qualification: '', description: '', startDate: '', endDate: ''});
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
            next.experience.push({role: '', organization: '', description: '', startDate: '', endDate: ''});
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
        resetPendingProfileImageDraft();
        setIsEditing(true);
    }

    function handleCancel() {
        setDraftData(cloneData(profileData));
        resetPendingProfileImageDraft();
        setIsEditing(false);
    }

    async function handleSave() {
        setIsSaving(true);
        setProfileError('');
        const payload = {
            name: draftData.name,
            surname: draftData.surname,
            email: draftData.email,
            bio: draftData.bio,
            interests: draftData.interestsCsv.split(',').map(entry => entry.trim()).filter(Boolean),
            education: draftData.education.map(entry => ({
                institution: entry.institution,
                qualification: entry.qualification,
                description: entry.description,
                startDate: entry.startDate,
                endDate: entry.endDate,
            })),
            experience: draftData.experience.map(entry => ({
                role: entry.role,
                organization: entry.organization,
                description: entry.description,
                startDate: entry.startDate,
                endDate: entry.endDate,
            })),
        };
        try {
            await authApi.updateProfile(payload);
        } catch (err) {
            setProfileError(err.message || 'Failed to save profile');
            setIsSaving(false);
            return;
        }
        let imageError = '';
        try {
            if (removeProfileImage) {
                await authApi.removeProfileImage();
            } else if (pendingProfileImageFile) {
                await authApi.uploadProfileImage(pendingProfileImageFile);
            }
        } catch (err) {
            imageError = err.message || 'Failed to update profile image';
        }
        try {
            const latestProfile = await authApi.getProfile();
            const next = buildInitialProfile(user, latestProfile.profile);
            setProfileData(next);
            setDraftData(cloneData(next));
            setIsEditing(false);
            resetPendingProfileImageDraft();
            await refreshUser().catch(() => null);
            if (imageError) {
                setProfileError(`Profile details were saved, but profile image update failed: ${imageError}`);
            }
        } catch (err) {
            if (imageError) {
                setProfileError(`Profile details were saved, but profile image update failed: ${imageError}`);
            } else {
                setProfileError(err.message || 'Profile was saved, but refreshing the latest data failed');
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Box className='profile-page'>
            <DashboardNavbar />
            {profileLoading ? (
                <Box px={20} py='xl'><Text c='dimmed'>Loading profile...</Text></Box>
            ) : null}
            {profileError ? (
                <Box px={20} pt='sm'><Text c='red' size='sm'>{profileError}</Text></Box>
            ) : null}
            <Box py='lg' className='profile-page__content'>
                <Grid gutter={20} align='flex-start'>
                    <Grid.Col span={{base: 12, md: 4, lg: 3}}>
                        <ProfileSidebarCard
                            avatarSrc={sidebarAvatarSrc}
                            fullName={fullName}
                            email={email}
                            isEditing={isEditing}
                            draftData={draftData}
                            interestItems={interestItems}
                            contributions={contributions}
                            impactMetrics={impactMetrics}
                            profileImageInputKey={profileImageInputKey}
                            canRemoveProfileImage={canRemoveProfileImage}
                            isProfileImageMarkedForRemoval={removeProfileImage}
                            onSelectProfileImage={handleProfileImageSelection}
                            onRemoveProfileImage={handleRemoveProfileImage}
                            onUpdateField={updateDraftField}
                        />
                    </Grid.Col>
                    <Grid.Col span={{base: 12, md: 8, lg: 9}}>
                        <Stack gap={20} h='100%'>
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