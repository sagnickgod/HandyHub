export const PROFILE_SCORE_ITEMS = [
  { key: 'avatar', label: 'Add a profile photo', points: 10 },
  { key: 'bio', label: 'Write a short bio', points: 10 },
  { key: 'skills', label: 'Add at least 2 skills', points: 10 },
  { key: 'department', label: 'Set your department', points: 10 },
  { key: 'course', label: 'Set your course & year', points: 10 },
  { key: 'first_task_helped', label: 'Help someone for the first time', points: 15 },
  { key: 'first_task_posted', label: 'Post your first task', points: 10 },
  { key: 'first_rating', label: 'Receive your first rating', points: 10 },
  { key: 'skill_verified', label: 'Get a skill verified by a peer', points: 15 },
]

export function calculateProfileScore(profile, stats = {}) {
  const checks = {
    avatar: !!profile?.avatar_url,
    bio: !!profile?.bio && profile.bio.length > 0,
    skills: Array.isArray(profile?.skills) && profile.skills.length >= 2,
    department: !!profile?.department,
    course: !!profile?.course,
    first_task_posted: (stats.tasksPosted || 0) > 0,
    first_task_helped: (stats.tasksHelped || 0) > 0,
    first_rating: (stats.ratingsReceived || 0) > 0,
    skill_verified: (stats.skillsVerified || 0) > 0,
  }

  let completed = 0
  let total = 0
  const incomplete = []

  for (const item of PROFILE_SCORE_ITEMS) {
    total += item.points
    if (checks[item.key]) {
      completed += item.points
    } else {
      incomplete.push(item)
    }
  }

  return {
    score: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
    incomplete,
    isComplete: completed >= total,
  }
}
