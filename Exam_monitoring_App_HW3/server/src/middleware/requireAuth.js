// ===== file: server/src/middleware/requireAuth.js =====
export function requireAuth(req, res, next) {
  const u = req.session?.user;

  // must be logged in
  if (!u || !(u.userId || u.id || u._id)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const id = u.userId || u.id || u._id;

  // keep it minimal & consistent (what controllers + UI need)
  req.user = {
    _id: id, // ✅ controllers often use req.user._id
    id,      // ✅ backward compatibility
    role: u.role || "",
    username: u.username || "",
    fullName: u.fullName || "",

    // optional fields (if you stored them in session)
    studentId: u.studentId || null,
    assignedRoomId: u.assignedRoomId || null,
  };

  next();
}

export default requireAuth;
