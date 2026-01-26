import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function RouteError() {
  const err = useRouteError();

  let title = "Unexpected error";
  let message = "Something went wrong.";
  let details = "";

  if (isRouteErrorResponse(err)) {
    title = `${err.status} ${err.statusText}`;
    message = err.data?.message || "Route error.";
  } else if (err instanceof Error) {
    message = err.message;
    details = err.stack || "";
  } else if (typeof err === "string") {
    message = err;
  }

  return (
    <div className="min-h-[70vh] grid place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs text-slate-500 font-bold">Exam Monitoring App</div>

        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-slate-700 font-semibold">
          {message}
        </p>

        {details ? (
          <pre className="mt-4 max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {details}
          </pre>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-sky-600 px-4 py-2 font-extrabold text-white hover:bg-sky-700"
          >
            Reload
          </button>

          <button
            onClick={() => window.history.back()}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-extrabold hover:bg-slate-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
