// ===== file: client/src/components/classroom/SeatActionsModal.jsx =====
import { useEffect, useMemo, useState } from "react";
import { msToMMSS } from "./utils";

function badge(status) {
  const s = String(status || "").toLowerCase();
  if (s === "not_arrived") return "bg-slate-50 border-slate-300 text-slate-700";
  if (s === "present") return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (s === "temp_out") return "bg-amber-50 border-amber-200 text-amber-800";
  if (s === "moving") return "bg-purple-50 border-purple-200 text-purple-800";
  if (s === "finished") return "bg-rose-50 border-rose-200 text-rose-800";
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
  saving = false,

  // roles / permissions
  isSupervisor = false,
  canRequestTransfer = false,

  canEditAttendance = false,

  onSetStatus,
  onCheatNote,
  onRequestTransfer,
  onCancelTransfer,
  rooms = [],
}) {
  const [note, setNote] = useState("");
  const [toRoom, setToRoom] = useState("");
  const [localErr, setLocalErr] = useState("");

  const roomNow = String(seat?.roomId || seat?.classroom || seat?.room || "").trim();
  const seatLabel = seat?.seat || "-";
  const rawStatus = String(seat?.status || "").toLowerCase();

  const isTransferPending = Boolean(seat?.transferPending);
  const isMoving = rawStatus === "moving";

  const lockedActions = isTransferPending || isMoving;

  const isPresentNow = rawStatus === "present";
  const isTempOutNow = rawStatus === "temp_out";

  const canChangeStatus = canEditAttendance && !saving && !lockedActions;
  const canOut = canEditAttendance && isPresentNow && !saving && !lockedActions;

  const canTransfer = canRequestTransfer && isPresentNow && !saving && !lockedActions;
  const canCancelTransfer = (isSupervisor || canRequestTransfer) && isTransferPending && !saving;

  const studentKeyForReset = String(seat?.studentId || seat?.studentNumber || seat?._id || "");

  const transferTargets = useMemo(() => {
    const list = (rooms || [])
      .map((r) => String(r?.id || r?.name || r).trim())
      .filter(Boolean);
    return list.filter((r) => r !== roomNow);
  }, [rooms, roomNow]);

  useEffect(() => {
    if (!open) return;
    setNote("");
    setToRoom("");
    setLocalErr("");
  }, [open, studentKeyForReset]);

  if (!open || !seat) return null;

  async function setStatus(status) {
    if (!canChangeStatus) return;
    setLocalErr("");
    try {
      await onSetStatus?.(seat.studentId, { status });
      onClose?.();
    } catch (e) {
      setLocalErr(e?.message || String(e));
    }
  }

  async function submitNote() {
    if (saving) return;
    const text = String(note || "").trim();
    if (!text) return;
    setLocalErr("");
    try {
      await onCheatNote?.(seat, text);
      onClose?.();
    } catch (e) {
      setLocalErr(e?.message || String(e));
    }
  }

  async function submitTransfer() {
    if (!canTransfer) return;
    const target = String(toRoom || "").trim();
    if (!target) return;
    setLocalErr("");
    try {
      await onRequestTransfer?.(seat, target);
      onClose?.();
    } catch (e) {
      setLocalErr(e?.message || String(e));
    }
  }

  async function cancelTransfer() {
    if (!canCancelTransfer) return;
    setLocalErr("");
    try {
      await onCancelTransfer?.(seat);
      onClose?.();
    } catch (e) {
      setLocalErr(e?.message || String(e));
    }
  }

  const toiletCount = Number(studentFile?.toiletCount || 0);
  const totalToiletMs = Number(studentFile?.totalToiletMs || 0);

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
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-extrabold"
          >
            Close
          </button>
        </div>

        {/* body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-extrabold text-slate-900">Quick actions</div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* ✅ Dynamic main action */}
              {isTempOutNow ? (
                <ActionBtn
                  disabled={!canChangeStatus}
                  onClick={() => setStatus("present")}
                  label="↩️ Back to Room"
                />
              ) : (
                <ActionBtn
                  disabled={!canChangeStatus}
                  onClick={() => setStatus("present")}
                  label="✅ Present"
                />
              )}

              <ActionBtn disabled={!canOut} onClick={() => setStatus("temp_out")} label="🚻 Out" />
              <ActionBtn
                disabled={!canChangeStatus || !isPresentNow}
                onClick={() => setStatus("finished")}
                label="🏁 Finished"
              />
              <ActionBtn disabled={!canChangeStatus} onClick={() => setStatus("absent")} label="⛔ Absent" />
              <ActionBtn disabled={!canChangeStatus} onClick={() => setStatus("not_arrived")} label="🕒 Not arrived" />
            </div>
          </div>

          {/* Transfer + Notes remain unchanged */}
          {/* ... (rest of the file stays exactly the same as before) */}
        </div>
      </div>
    </div>
  );
}
