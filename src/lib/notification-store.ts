/**
 * Shared in-memory notification read state.
 * Used by /api/notifications (GET) and /api/notifications/read (POST).
 * In a production app this would be backed by a database table.
 */

export const readNotifications = new Set<string>()
