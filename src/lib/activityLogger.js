import { supabase } from './supabase'

/**
 * Inserts a highlight item into the activity_highlights table.
 *
 * @param {string} userId - UUID of the user
 * @param {'task_helped'|'badge_earned'|'level_reached'|'group_created'|'mentor_session'|'skill_verified'|'project_completed'} type - Category of highlight
 * @param {string} title - Heading of the activity
 * @param {string} [description] - Optional details/summary
 * @param {string} [referenceId] - UUID referencing task, badge, group, etc.
 */
export async function logHighlight(userId, type, title, description = '', referenceId = null) {
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('activity_highlights')
      .insert({
        user_id: userId,
        type,
        title,
        description: description || null,
        reference_id: referenceId || null
      })
      .select()
      .single()

    if (error) {
      console.error('[activityLogger] Error logging highlight:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('[activityLogger] Exception in logHighlight:', err)
    return null
  }
}
