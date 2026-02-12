// ===== file: client/src/components/dashboard/TransfersPanel.jsx =====
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  approveTransfer,
  rejectTransfer,
  cancelTransfer,
} from "../../services/transfers.service";

function pill(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending")
    return "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/35 dark:border-amber-900/60 dark:text-amber-200";
  if (s === "approved")
    return "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/35 dark:border-emerald-900/60 dark:text-emerald-200";
  if (s === "rejected")
    return "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/35 dark:border-rose-900/60 dark:text-rose-200";
  if (s === "cancelled")
    return "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-200";
  return "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-200";
}


function roleMeta(role, tr) {
  const r = String(role || "").toLowerCase();
  if (r === "supervisor") return { label: tr("roles.supervisor"), dot: "bg-sky-500" };
  if (r === "lecturer") return { label: tr("roles.lecturer"), dot: "bg-indigo-500" };
  if (r === "admin") return { label: tr("roles.admin"), dot: "bg-slate-900" };
  return { label: tr("dashboard.common.user"), dot: "bg-slate-400" };
}

function normStr(x) {
  const v = x == null ? "" : String(x);
  return v.trim();
}

function myUserId(me) {
  return String(me?.id || me?._id || "");
}
function myRoomId(me) {
  return normStr(me?.assignedRoomId || me?.roomId || "");
}

function fmtWho(x) {
  if (!x) return "-";
  if (typeof x === "string") return x;
  return x.name || x.fullName || x.username || "-";
}

// ✅ ALWAYS get a stable id (support _id OR id)
function transferIdOf(item) {
  return String(item?._id || item?.id || "").trim();
}

// ✅ stable row key even if no id
function rowKeyOf(item) {
  const id = transferIdOf(item);
  if (id) return id;
  return `${String(item?.studentId || "x")}-${String(
    item?.createdAt || item?.updatedAt || ""
  )}-${normStr(item?.toClassroom)}-${normStr(item?.fromClassroom)}`;
}

function isLecturerAssigned(me, exam) {
  if (!me || !exam) return false;
  const mid = myUserId(me);
  if (!mid) return false;

  const mainId = String(exam?.lecturer?.id || "");
  if (mainId && mainId === mid) return true;

  const co = Array.isArray(exam?.coLecturers) ? exam.coLecturers : [];
  return co.some((x) => String(x?.id || "") === mid);
}

function isSupervisorAssigned(me, exam) {
  if (!me || !exam) return false;
  const mid = myUserId(me);
  if (!mid) return false;

  const sups = Array.isArray(exam?.supervisors) ? exam.supervisors : [];
  return sups.some((x) => String(x?.id || "") === mid);
}

function canHandle(me, exam, item) {
  if (!me) return false;
  const role = String(me?.role || "").toLowerCase();
  const status = String(item?.status || "").toLowerCase();
  if (status !== "pending") return false;

  if (role === "admin") return true;
  if (role === "lecturer") return isLecturerAssigned(me, exam);

  if (role === "supervisor") {
    if (!isSupervisorAssigned(me, exam)) return false;
    const myRoom = myRoomId(me);
    const toRoom = normStr(item?.toClassroom);
    return Boolean(myRoom && toRoom && myRoom === toRoom);
  }

  return false;
}

function canCancel(me, exam, item) {
  const status = String(item?.status || "").toLowerCase();
  if (status !== "pending") return false;

  const meRole = String(me?.role || "").toLowerCase();
  if (meRole === "admin") return true;

  if (meRole === "lecturer") return isLecturerAssigned(me, exam);

  const mid = myUserId(me);
  const requesterId = String(item?.requestedBy?.id || "");
  if (mid && requesterId && mid === requesterId) return true;

  if (meRole === "supervisor") {
    if (!isSupervisorAssigned(me, exam)) return false;
    const myRoom = myRoomId(me);
    const fromRoom = normStr(item?.fromClassroom);
    if (myRoom && fromRoom && myRoom === fromRoom) return true;
  }

  return false;
}

export default function TransfersPanel({
  me,
  exam,
  items = [],
  loading,
  error,
  onChanged,
}) {
  const { t: tr } = useTranslation();
  const [busyKey, setBusyKey] = useState("");
  const [flash, setFlash] = useState("");
  const [flashTone, setFlashTone] = useState("info"); // info | ok | bad

  const meRole = String(me?.role || "").toLowerCase();
  const isSupervisor = meRole === "supervisor";
  const isLecturerOrAdmin = meRole === "lecturer" || meRole === "admin";
  const canAct =
    meRole === "admin" ||
    (meRole === "lecturer" && isLecturerAssigned(me, exam)) ||
    (meRole === "supervisor" && isSupervisorAssigned(me, exam));
  const myRoom = myRoomId(me);

  // ✅ Merge properly and NEVER lose ids
  const { incoming, outgoing, visibleItems } = useMemo(() => {
    const list = Array.isArray(items) ? items : [];

    if (isLecturerOrAdmin) {
      const pendingCount = list.filter(
        (x) => String(x?.status).toLowerCase() === "pending"
      ).length;
      return { incoming: pendingCount, outgoing: 0, visibleItems: list };
    }

    if (isSupervisor) {
      const incomingList = list.filter((x) => normStr(x?.toClassroom) === myRoom);
      const outgoingList = list.filter((x) => normStr(x?.fromClassroom) === myRoom);

      // ✅ unique by stable key
      const map = new Map();
      for (const x of [...incomingList, ...outgoingList]) {
        map.set(rowKeyOf(x), x);
      }
      const merged = Array.from(map.values());

      const incomingPending = incomingList.filter(
        (x) => String(x?.status).toLowerCase() === "pending"
      ).length;
      const outgoingPending = outgoingList.filter(
        (x) => String(x?.status).toLowerCase() === "pending"
      ).length;

      return { incoming: incomingPending, outgoing: outgoingPending, visibleItems: merged };
    }

    return { incoming: 0, outgoing: 0, visibleItems: [] };
  }, [items, isLecturerOrAdmin, isSupervisor, myRoom]);

  const pendingCount = useMemo(
    () => visibleItems.filter((x) => String(x?.status || "").toLowerCase() === "pending").length,
    [visibleItems]
  );

  const headerRole = roleMeta(meRole, tr);
  const showNoRoomWarn = isSupervisor && !myRoom;

  function showFlash(msg, tone = "info") {
    setFlashTone(tone);
    setFlash(msg);
    setTimeout(() => setFlash(""), 4500);
  }

  async function onApprove(item, rowKey) {
    const transferId = transferIdOf(item);
    if (!transferId) return;

    try {
      setBusyKey(rowKey);
      setFlash("");

      const result = await approveTransfer(transferId);

      if (result?.roomFull) {
        // ✅ Room full is NOT an error; it stays pending
        showFlash(tr("dashboard.transfers.flash.cannotApproveRoomFull"), "bad");
      }

      onChanged?.();
    } catch (e) {
      console.error(e);
      showFlash(
        tr("dashboard.transfers.flash.approveFailed", {
          message: e?.message || tr("dashboard.common.unknownError"),
        }),
        "bad"
      );
      onChanged?.();
    } finally {
      setBusyKey("");
    }
  }

  async function onReject(item, rowKey) {
    const transferId = transferIdOf(item);
    if (!transferId) return;

    try {
      setBusyKey(rowKey);
      setFlash("");

      await rejectTransfer(transferId);
      showFlash(tr("dashboard.transfers.flash.rejected"), "ok");
      onChanged?.();
    } catch (e) {
      console.error(e);
      showFlash(
        tr("dashboard.transfers.flash.rejectFailed", {
          message: e?.message || tr("dashboard.common.unknownError"),
        }),
        "bad"
      );
      onChanged?.();
    } finally {
      setBusyKey("");
    }
  }

  async function onCancel(item, rowKey) {
    const transferId = transferIdOf(item);
    if (!transferId) return;

    try {
      setBusyKey(rowKey);
      setFlash("");

      await cancelTransfer(transferId);
      showFlash(tr("dashboard.transfers.flash.cancelled"), "ok");
      onChanged?.();
    } catch (e) {
      console.error(e);
      showFlash(
        tr("dashboard.transfers.flash.cancelFailed", {
          message: e?.message || tr("dashboard.common.unknownError"),
        }),
        "bad"
      );
      onChanged?.();
    } finally {
      setBusyKey("");
    }
  }

  const flashBoxClass =
    flashTone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : flashTone === "bad"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100";

  return (
    <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {tr("dashboard.transfers.header.kicker")}
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${headerRole.dot}`} />
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {tr("dashboard.transfers.header.title")}
              </h4>
            </div>

            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {isSupervisor
                ? tr("dashboard.transfers.header.supervisorHint", {
                    room: myRoom || tr("dashboard.common.na"),
                  })
                : isLecturerOrAdmin && canAct
                ? tr("dashboard.transfers.header.lecturerHint")
                : tr("dashboard.transfers.header.viewOnlyHint")}
            </div>

            {showNoRoomWarn ? (
              <div className="mt-2 text-xs rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 font-bold">
                {tr("dashboard.transfers.header.noRoomWarning")}
              </div>
            ) : null}

            {flash ? (
              <div
                className={`mt-3 text-sm rounded-2xl border px-4 py-3 font-bold ${flashBoxClass}`}
              >
                {flash}
              </div>
            ) : null}
          </div>

          <div className="text-right text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 font-bold">
            <div>
              {tr("dashboard.transfers.stats.pending")}:{" "}
              <span className="text-slate-900 dark:text-slate-100">{pendingCount}</span>
            </div>
            {isSupervisor ? (
              <div className="mt-1">
                {tr("dashboard.transfers.stats.in")}:{" "}
                <span className="text-slate-900 dark:text-slate-100">{incoming}</span> •{" "}
                {tr("dashboard.transfers.stats.out")}:{" "}
                <span className="text-slate-900 dark:text-slate-100">{outgoing}</span>
              </div>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mt-3 text-sm rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
            {error}
          </div>
        ) : null}
      </div>

      <div className="p-5 bg-slate-50 dark:bg-slate-900/40">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm text-slate-600 dark:text-slate-300">
            {tr("dashboard.transfers.loading")}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-sm text-slate-600 dark:text-slate-300">
            {tr("dashboard.transfers.empty")}
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {visibleItems.map((item) => {
              const status = String(item?.status || "unknown").toLowerCase();
              const fromRoom = normStr(item?.fromClassroom);
              const toRoom = normStr(item?.toClassroom);

              const rowKey = rowKeyOf(item);
              const busy = busyKey === rowKey;

              const showActions = canHandle(me, exam, item);
              const showCancel = canCancel(me, exam, item);

              const studentId = item?.studentCode || item?.studentId || "-";
              const studentName = item?.studentName || "Student";

              const fromSeat = item?.fromSeat || "-";
              const toSeat = item?.toSeat || "AUTO";

              const requester = fmtWho(item?.requestedBy);
              const handledBy = fmtWho(item?.handledBy);

              const lastError = String(item?.lastError || "");
              const isRoomFull = status === "pending" && lastError === "ROOM_FULL";

              const approveLabel = isRoomFull
                ? tr("dashboard.transfers.tryApproveAgain")
                : tr("dashboard.transfers.approve");

              return (
                <div key={rowKey} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {studentName}
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-extrabold">
                          {tr("dashboard.common.idLabel")} {studentId}
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-extrabold ${pill(status)}`}>
                          {status.toUpperCase()}
                        </span>

                        {isRoomFull ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-800 font-extrabold">
                            {tr("dashboard.transfers.roomFull")}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {fromRoom || "—"} ({fromSeat}) → {toRoom || "—"} ({toSeat})
                      </div>

                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        {tr("dashboard.transfers.requestedBy")}{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-200">{requester}</span>
                      </div>

                      {status !== "pending" ? (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          {tr("dashboard.transfers.handledBy")}{" "}
                          <span className="font-bold text-slate-700 dark:text-slate-200">{handledBy}</span>
                        </div>
                      ) : null}

                      {isRoomFull ? (
                        <div className="mt-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2 font-bold">
                          {tr("dashboard.transfers.roomFullHint")}
                        </div>
                      ) : null}

                      {item?.note ? (
                        <div className="mt-2 text-xs text-slate-700 dark:text-slate-200 break-words">
                          <span className="font-extrabold">{tr("dashboard.transfers.note")}:</span>{" "}
                          {String(item.note)}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 flex flex-col gap-2 items-end">
                      {showActions ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onApprove(item, rowKey)}
                            disabled={busy || !transferIdOf(item)}
                            className="rounded-2xl bg-emerald-600 text-white px-3 py-2 text-[13px] font-extrabold hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {busy ? tr("dashboard.common.processing") : approveLabel}
                          </button>
                          <button
                            onClick={() => onReject(item, rowKey)}
                            disabled={busy || !transferIdOf(item)}
                            className="rounded-2xl bg-rose-600 text-white px-3 py-2 text-[13px] font-extrabold hover:bg-rose-700 disabled:opacity-60"
                          >
                            {busy ? tr("dashboard.common.processing") : tr("dashboard.transfers.reject")}
                          </button>
                        </div>
                      ) : (
                        <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                          {isSupervisor ? (
                            <div>
                              {status === "pending" && toRoom !== myRoom
                                ? tr("dashboard.transfers.notYourRoom")
                                : tr("dashboard.transfers.viewOnly")}
                            </div>
                          ) : (
                            <div>{tr("dashboard.transfers.view")}</div>
                          )}
                        </div>
                      )}

                      {showCancel ? (
                        <button
                          onClick={() => onCancel(item, rowKey)}
                          disabled={busy || !transferIdOf(item)}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-[13px] font-extrabold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 dark:bg-slate-900/40 disabled:opacity-60"
                        >
                          {busy ? tr("dashboard.common.processing") : tr("dashboard.transfers.cancel")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
