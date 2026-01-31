// ===== file: client/src/components/classroom/SeatActionsModal.jsx =====
import { useEffect, useMemo, useState } from "react";
import { msToMMSS } from "./utils";

function badge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "not_arrived") return "bg-slate-50 border-slate-300 text-slate-700";
  if (s === "present") return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (s === "temp_out") return "bg-amber-50 border-amber-200 text-amber-800";
  if (s === "moving") return "bg-purple-50 border-purple-200 text-purple-800";
  if (s === "finished") return "bg-rose-50 border-rose-50 text-rose-800";
  if (s === "absent") return "bg-slate-100 border-slate-200 text-slate-700";
  return "bg-slate-50 border-slate-200 text-slate-700";
}

function ActionBtn({ label, onClick, disabled, tone = "neutral" }) {
  const toneCls =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800"
      : tone === "purple"
      ? "border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800"
      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-3 rounded-2xl border font-extrabold text-sm disabled:opacity-60 ${toneCls}`}
    >
      {label}
    </button>
  );
}

export default function SeatActionsModal({
  open,
  onClose,
  seat,
  studentFile = null,
  elapsedMs = 0,
  saving = false, // kept for Note textarea only (we don't block status/transfer buttons with it)

  // roles / permissions
  isSupervisor = false,
  canRequestTransfer = false, // lecturer or supervisor

  // attendance permission (Supervisor OR Lecturer/Admin from parent)
  canEditAttendance = false,

  // actions
  onSetStatus,
  onCheatNote,
  onRequestTransfer,

  // cancel transfer action
  onCancelTransfer,

  // transfer target rooms list
  rooms = [],

  // optional global error handler (parent toast/snackbar)
  onActionError,
}) {
  const [note, setNote] = useState("");
  const [toRoom, setToRoom] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const roomNow = String(seat?.roomId || seat?.classroom || seat?.room || "").trim();
  const seatLabel = seat?.seat || "-";
  const rawStatus = String(seat?.status || "").toLowerCase();

  const isTransferPending = Boolean(seat?.transferPending);
  const isMoving = rawStatus === "moving";

  // Locked means: cannot change status / cannot start new transfer
  // but Cancel Transfer should still be possible
  const lockedActions = isTransferPending || isMoving || actionBusy;

  const isPresentNow = rawStatus === "present";
  const isTempOutNow = rawStatus === "temp_out";

  // ✅ IMPORTANT CHANGE:
  // Do NOT disable buttons while waiting for server.
  // saving is NOT part of these permissions anymore.
  const canChangeStatus = canEditAttendance && !lockedActions;
  const canOut = canEditAttendance && isPresentNow && !lockedActions;
  const canTransfer = canRequestTransfer && isPresentNow && !lockedActions;
  const canCancelTransfer = (isSupervisor || canRequestTransfer) && isTransferPending;

  const studentKeyForReset = String(seat?.studentId || seat?.studentNumber || seat?._id || "");

  const transferTargets = useMemo(() => {
    const list = (rooms || [])
      .map((r) => String(r?.id || r?.name || r).trim())
      .filter(Boolean);

    return list.filter((r) => r !== String(roomNow || "").trim());
  }, [rooms, roomNow]);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setToRoom("");
    setLocalErr("");
  }, [open, studentKeyForReset]);

  if (!open || !seat) return null;

  // Helpers: fire-and-forget + close immediately
  function fireAndForget(promiseLike, fallbackErrMsg = "Request failed") {
    Promise.resolve(promiseLike).catch((e) => {
      const msg = e?.message || fallbackErrMsg || String(e);
      // If the modal already closed, localErr won't show; prefer parent toast when possible
      if (typeof onActionError === "function") onActionError(msg);
      else setLocalErr(msg);
    });
  }

  async function setStatus(status, extra = {}) {
  if (!canEditAttendance || lockedActions) return;

  const realStatus = String(status || "").trim();
  if (!realStatus) return;

  setLocalErr("");
  setActionBusy(true);

  try {
    await onSetStatus?.(seat.studentId, { status: realStatus, ...extra });
    onClose?.(); // ✅ close only after success
  } catch (e) {
    const msg = e?.message || String(e);
    setLocalErr(msg);
    if (typeof onActionError === "function") onActionError(msg);
  } finally {
    setActionBusy(false);
  }
}


    async function setPresentOrBackToRoom() {
    if (!canEditAttendance || lockedActions) return;

    setLocalErr("");
    setActionBusy(true);

    const payload = isTempOutNow ? { status: "present", outStartedAt: null } : { status: "present" };

    try {
      await onSetStatus?.(seat.studentId, payload);
      onClose?.(); // ✅ close only after success
    } catch (e) {
      const msg = e?.message || String(e);
      setLocalErr(msg);
      onActionError?.(msg);
    } finally {
      setActionBusy(false);
    }
  }


  // Notes allowed for everyone (as requested)
  async function submitNote() {
    // keeping saving lock for textarea submit only (optional)
    if (saving) return;

    const text = String(note || "").trim();
    if (!text) return;

    setLocalErr("");

    // You may choose to close immediately here as well. We'll keep it immediate for fast UX.
    onClose?.();

    fireAndForget(onCheatNote?.(seat, text), "Failed to save note");
  }

  function submitTransfer() {
    if (!canTransfer) return;

    const target = String(toRoom || "").trim();
    if (!target) return;

    setLocalErr("");
    onClose?.(); // ✅ close immediately

    fireAndForget(onRequestTransfer?.(seat, target), "Failed to request transfer");
  }

  function cancelTransfer() {
    if (!canCancelTransfer) return;

    setLocalErr("");
    onClose?.(); // ✅ close immediately

    fireAndForget(onCancelTransfer?.(seat), "Failed to cancel transfer");
  }

  const toiletCount = Number(studentFile?.toiletCount || 0);
  const totalToiletMs = Number(studentFile?.totalToiletMs || 0);

  const lockReason = isMoving
    ? "Actions are locked because the student is currently moving (transfer in progress)."
    : isTransferPending
    ? "Actions are locked because a transfer request is pending. You can still cancel it."
    : "";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 grid place-items-center p-3 sm:p-4">
      <div className="w-full max-w-[720px] max-h-[85vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">Student</div>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
              {seat.name || "Student"}{" "}
              <span className="text-slate-500 font-bold text-sm">
                ({seat.studentNumber || seat.studentId || "-"})
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full border bg-slate-50 text-slate-700">
                Room <b>{roomNow || "-"}</b>
              </span>
              <span className="px-3 py-1 rounded-full border bg-slate-50 text-slate-700">
                Seat <b>{seatLabel}</b>
              </span>
              <span className={`px-3 py-1 rounded-full border ${badge(seat.status)}`}>
                {String(seat.status || "unknown")}
              </span>

              {isTempOutNow ? (
                <span className="px-3 py-1 rounded-full border bg-amber-50 border-amber-200 text-amber-800">
                  Out: <b>{msToMMSS(elapsedMs)}</b>
                </span>
              ) : null}

              {studentFile ? (
                <span className="px-3 py-1 rounded-full border bg-slate-50 text-slate-700">
                  🚻 Breaks <b>{toiletCount}</b> • Total <b>{msToMMSS(totalToiletMs)}</b>
                </span>
              ) : null}

              {isTransferPending ? (
                <span className="px-3 py-1 rounded-full border bg-purple-50 border-purple-200 text-purple-800 font-extrabold">
                  Transfer Pending
                </span>
              ) : null}

              {isMoving ? (
                <span className="px-3 py-1 rounded-full border bg-purple-50 border-purple-200 text-purple-800 font-extrabold">
                  Moving
                </span>
              ) : null}
            </div>

            {lockedActions ? (
              <div className="mt-2 text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-2xl px-3 py-2">
                {lockReason}
              </div>
            ) : null}

            {/* NOTE: localErr won't show if modal closes immediately.
                It is kept only as a fallback when parent doesn't provide onActionError. */}
            {localErr ? (
              <div className="mt-2 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2">
                {localErr}
              </div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold shrink-0"
          >
            Close
          </button>
        </div>

        {/* body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Quick actions */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-extrabold text-slate-900">Quick actions</div>

            {(() => {
              const st = String(seat?.status || "").toLowerCase();
              const isOutNow = st === "temp_out";
              const isPresentNowLocal = st === "present";

              const canChange = canChangeStatus; // includes canEditAttendance && !lockedActions

              // ✅ When OUT: ONLY "Back to room" + "Absent" enabled
              const enableBack = canChange && isOutNow;
              const enableAbsent = canChange && (isOutNow || !lockedActions);

              const enableOut = canOut && !isOutNow;
              const enableFinished = canChange && isPresentNowLocal && !isOutNow;
              const enableNotArrived = canChange && !isOutNow;

              return (
                <>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <ActionBtn
                      disabled={isOutNow ? !enableBack : !canChange}
                      onClick={setPresentOrBackToRoom}
                      label={isOutNow ? "↩️ Back to room" : "✅ Present"}
                    />

                    <ActionBtn
                      disabled={!enableOut}
                      onClick={() => setStatus("temp_out")}
                      label="🚻 Out"
                    />

                    <ActionBtn
                      disabled={!enableFinished}
                      onClick={() => setStatus("finished")}
                      label="🏁 Finished"
                    />

                    <ActionBtn
                      disabled={!enableAbsent}
                      onClick={() => setStatus("absent")}
                      label="⛔ Absent"
                    />

                    <ActionBtn
                      disabled={!enableNotArrived}
                      onClick={() => setStatus("not_arrived")}
                      label="🕒 Not arrived"
                    />
                  </div>

                  {!canEditAttendance ? (
                    <div className="mt-2 text-xs text-slate-500">
                      View-only: you don’t have permission to change attendance.
                    </div>
                  ) : lockedActions ? (
                    <div className="mt-2 text-xs text-slate-500">
                      🔒 Locked due to transfer. (Cancel is still possible below)
                    </div>
                  ) : isOutNow ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Student is <b>Out</b>: only <b>Back to room</b> and <b>Absent</b> are allowed.
                    </div>
                  ) : !isPresentNow ? (
                    <div className="mt-2 text-xs text-slate-500">
                      🚫 Transfer/Toilet are enabled only when the student is <b>present</b>.
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>

          {/* Transfer */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Transfer student</div>
                <div className="mt-1 text-xs text-slate-600">
                  Student becomes <b className="text-purple-700">purple</b> until the target supervisor
                  approves/rejects.
                </div>
              </div>

              {isTransferPending ? (
                <button
                  onClick={cancelTransfer}
                  disabled={!canCancelTransfer}
                  className="px-4 py-2 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 font-extrabold text-sm hover:bg-rose-100 disabled:opacity-60"
                  title="Cancel pending transfer request"
                >
                  ✖ Cancel Transfer
                </button>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <select
                value={toRoom}
                onChange={(e) => setToRoom(e.target.value)}
                disabled={!canTransfer}
                className="w-full sm:w-[260px] px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-60"
              >
                <option value="">Select target room…</option>
                {transferTargets.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                onClick={submitTransfer}
                disabled={!canTransfer || !String(toRoom || "").trim()}
                className="px-4 py-2 rounded-2xl bg-purple-600 text-white font-extrabold text-sm hover:bg-purple-700 disabled:opacity-60"
              >
                🟣 Send Transfer Request
              </button>
            </div>

            {!canRequestTransfer ? (
              <div className="mt-2 text-xs text-slate-500">Only Lecturer/Supervisor can request transfers.</div>
            ) : isTransferPending ? (
              <div className="mt-2 text-xs text-slate-500">
                Transfer is pending. You can cancel it (and actions will unlock).
              </div>
            ) : lockedActions ? (
              <div className="mt-2 text-xs text-slate-500">Student is currently moving.</div>
            ) : null}
          </div>

          {/* Incident note */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-extrabold text-slate-900">Incident / Cheat note</div>
            <div className="mt-2 text-xs text-slate-600">Saved to report timeline and student file.</div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              disabled={saving}
              placeholder="Write what happened, what you did, time, etc."
              className="mt-3 w-full px-3 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-60"
              maxLength={400}
            />

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">{note.length}/400</div>
              <button
                onClick={submitNote}
                disabled={saving || !String(note || "").trim()}
                className="px-4 py-2 rounded-2xl bg-rose-600 text-white font-extrabold text-sm disabled:opacity-60"
              >
                🧾 Save Note
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Notes can be written by <b>Supervisor</b>, <b>Lecturer</b>, or <b>Admin</b>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
