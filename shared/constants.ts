export const ITEM_STATUS = {
  AVAILABLE: 'available',
  REQUESTED: 'requested',
  SCHEDULING: 'scheduling',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed'
} as const;

export const REQUEST_STATUS = {
  PENDING: 'pending',
  READY_FOR_DRAWING: 'ready_for_drawing',
  AWAITING_PICKUP_CONFIRMATION: 'awaiting_pickup_confirmation',
  ACCEPTED: 'accepted',
  BACKUP: 'backup',
  CANCELED: 'canceled'
} as const;
