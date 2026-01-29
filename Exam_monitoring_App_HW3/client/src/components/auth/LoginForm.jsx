// client/src/components/auth/LoginForm.jsx
export default function LoginForm({
  username,
  password,
  setUsername,
  setPassword,
  isLoading,
  onSubmit,

  usernameLabel = "Username",
  usernamePlaceholder = "Enter your username",
}) {
  return (
    <form className="space-y-4" autoComplete="off" onSubmit={onSubmit}>
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          {usernameLabel}
        </label>
        <input
          type="text"
          placeholder={usernamePlaceholder}
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                     focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
          required
          disabled={isLoading}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Password
        </label>
        <input
          type="password"
          placeholder="Enter your password"
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white
                     focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition"
          required
          disabled={isLoading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-indigo-600 text-white py-3 font-extrabold
                   hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition
                   disabled:opacity-60"
      >
        {isLoading ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}
