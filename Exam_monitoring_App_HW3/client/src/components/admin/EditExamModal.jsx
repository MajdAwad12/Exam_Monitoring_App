// client/src/components/admin/EditExamModal.jsx
import Modal from "../../pages/admin/ManageExamsPage.jsx";

export default function EditExamModal(props) {
  const { open, saving, notice, setNotice, onClose, onSubmit, onDelete } = props;
  return (
    <Modal open={open} title="Edit Exam" onClose={onClose}>
      {notice ? (
        <div className={`mb-4 rounded-2xl border p-3 ${notice.type === "error"
          ? "bg-rose-50 border-rose-200 text-rose-900"
          : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
          <div className="text-sm font-semibold">{notice.text}</div>
        </div>
      ) : null}
      {props.children}
      <div className="flex justify-between gap-2 mt-4">
        <button onClick={onDelete} disabled={saving}>Delete</button>
        <button onClick={onSubmit} disabled={saving}>Save</button>
      </div>
    </Modal>
  );
}
