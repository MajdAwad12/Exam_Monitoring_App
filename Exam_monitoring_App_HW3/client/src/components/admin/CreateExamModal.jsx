// client/src/components/admin/CreateExamModal.jsx
import Modal from "../../pages/admin/ManageExamsPage.jsx"; // uses existing Modal implementation

export default function CreateExamModal(props) {
  const { open, saving, draftBusy, notice, setNotice, onClose, onSubmit } = props;
  return (
    <Modal open={open} title="Create New Exam" onClose={onClose}>
      {notice ? (
        <div className={`mb-4 rounded-2xl border p-3 ${notice.type === "error"
          ? "bg-rose-50 border-rose-200 text-rose-900"
          : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
          <div className="text-sm font-semibold">{notice.text}</div>
        </div>
      ) : null}
      {props.children}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} disabled={saving || draftBusy}>Cancel</button>
        <button onClick={onSubmit} disabled={saving || draftBusy}>Create</button>
      </div>
    </Modal>
  );
}
