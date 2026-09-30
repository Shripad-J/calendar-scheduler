import { useEffect } from "react";

function EventDetails({
  event,
  onBack,
  onEdit,
}) {
  useEffect(() => {
    const handleKeyDown = (keyboardEvent) => {
      if (keyboardEvent.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onBack]);

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The requested event could not be found.
          </p>

          <button
            type="button"
            onClick={onBack}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* HEADER */}

        <div className="mb-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={() => onEdit(event)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Edit
          </button>
        </div>

        {/* EVENT CARD */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Event details
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {event.title}
              </h1>
            </div>

            {event.isOccurrence && (
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                Repeating
              </span>
            )}

            {event.isException && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                Exception
              </span>
            )}
          </div>

          {/* DATE */}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Date
            </p>

            <p className="mt-1 text-sm text-slate-800">
              {event.date}
            </p>
          </div>

          {/* TIME */}

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Time
            </p>

            <p className="mt-1 text-sm text-slate-800">
              {event.allDay
                ? "All day"
                : `${event.startTime} - ${event.endTime}`}
            </p>
          </div>

          {/* DESCRIPTION */}

          {event.description && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Description
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-700">
                {event.description}
              </p>
            </div>
          )}

          {/* ORGANIZER */}

          {event.organizerId && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Organizer
              </p>

              <p className="mt-1 text-sm text-slate-800">
                User #{event.organizerId}
              </p>
            </div>
          )}

          {/* ATTENDEES */}

          {Array.isArray(event.attendees) &&
            event.attendees.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Attendees
                </p>

                <div className="mt-2 space-y-1">
                  {event.attendees.map(
                    (attendee) => (
                      <div
                        key={
                          typeof attendee ===
                          "object"
                            ? attendee.id
                            : attendee
                        }
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        {typeof attendee ===
                        "object"
                          ? `${attendee.firstName || ""} ${
                              attendee.lastName || ""
                            }`.trim() ||
                            attendee.email ||
                            `User #${attendee.id}`
                          : `User #${attendee}`}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* RECURRENCE */}

          {event.recurrence &&
            event.recurrence.frequency &&
            event.recurrence.frequency !==
              "none" && (
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Recurrence
                </p>

                <p className="mt-1 text-sm capitalize text-slate-800">
                  {event.recurrence.frequency}
                </p>

                {event.recurrence.endType ===
                  "until" &&
                  event.recurrence.until && (
                    <p className="mt-1 text-xs text-slate-500">
                      Until{" "}
                      {event.recurrence.until}
                    </p>
                  )}

                {event.recurrence.endType ===
                  "count" &&
                  event.recurrence.count && (
                    <p className="mt-1 text-xs text-slate-500">
                      {event.recurrence.count}{" "}
                      occurrences
                    </p>
                  )}
              </div>
            )}

          {/* REMINDER */}

          {event.reminder && (
            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Reminder
              </p>

              <p className="mt-1 text-sm text-slate-800">
                {event.reminder}
              </p>
            </div>
          )}

          {/* EVENT ID */}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Event ID
            </p>

            <p className="mt-1 break-all font-mono text-xs text-slate-500">
              {event.id}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default EventDetails;