// server/src/websocket/websocketEventNames.js
// Central list of WebSocket event names used across the whole system.
// Keeping them here prevents typos and makes the protocol explicit.

export const WEBSOCKET_EVENTS = Object.freeze({
  SYSTEM_DATA_CHANGED: "SYSTEM_DATA_CHANGED",

  // Exams / seats / attendance
  EXAM_UPDATED: "EXAM_UPDATED",
  SEAT_STATUS_UPDATED: "SEAT_STATUS_UPDATED",
  ATTENDANCE_UPDATED: "ATTENDANCE_UPDATED",

  // Transfers
  TRANSFER_REQUEST_UPDATED: "TRANSFER_REQUEST_UPDATED",

  // Incidents / events feed
  INCIDENT_CREATED: "INCIDENT_CREATED",

  // Messages / inbox
  MESSAGE_UPDATED: "MESSAGE_UPDATED",
});
