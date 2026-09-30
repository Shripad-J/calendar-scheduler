import {
  useEffect,
  useState,
} from "react";

import {
  createEvent,
  updateEvent,
} from "../services/calendarService";

import {
  fakeSync,
} from "../services/syncService";

import {
  getUsers,
} from "../services/userService";

function getMinutes(time) {
  if (!time) {
    return 0;
  }

  const [hours, minutes] =
    time.split(":").map(Number);

  return (
    hours * 60 +
    minutes
  );
}

function EventForm({
  event,
  initialEvent,
  onEventCreated,
  onEventUpdated,
  onClose,
  events = [],
}) {
  const isEditMode =
    Boolean(event);

  const sourceEvent =
    event || initialEvent;

  const isRecurringOccurrence =
    Boolean(
      sourceEvent?.isOccurrence
    );

  const isRecurringEvent =
    Boolean(
      sourceEvent?.recurrence &&
        sourceEvent.recurrence.frequency &&
        sourceEvent.recurrence.frequency !==
          "none"
    );

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [date, setDate] =
    useState("");

  const [startTime, setStartTime] =
    useState("09:00");

  const [endTime, setEndTime] =
    useState("10:00");

  const [allDay, setAllDay] =
    useState(false);

  const [attendees, setAttendees] =
    useState([]);

  const [
    recurrenceFrequency,
    setRecurrenceFrequency,
  ] = useState("none");

  const [
    recurrenceInterval,
    setRecurrenceInterval,
  ] = useState(1);

  const [
    recurrenceEndType,
    setRecurrenceEndType,
  ] = useState("never");

  const [
    recurrenceUntil,
    setRecurrenceUntil,
  ] = useState("");

  const [
    recurrenceCount,
    setRecurrenceCount,
  ] = useState(1);

  const [weeklyDays, setWeeklyDays] =
    useState([]);

  const [
    monthlyMode,
    setMonthlyMode,
  ] = useState("dayOfMonth");

  const [
    monthlyDayOfMonth,
    setMonthlyDayOfMonth,
  ] = useState(1);

  const [
    monthlyWeekOfMonth,
    setMonthlyWeekOfMonth,
  ] = useState(1);

  const [
    monthlyDayOfWeek,
    setMonthlyDayOfWeek,
  ] = useState(2);

  const [reminder, setReminder] =
    useState(0);

  const [
    recurrenceEditMode,
    setRecurrenceEditMode,
  ] = useState("all");

  const [users, setUsers] =
    useState([]);

  const [userSearch, setUserSearch] =
    useState("");

  const [loadingUsers, setLoadingUsers] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /*
   * ------------------------------------------------
   * LOAD USERS
   * ------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      setLoadingUsers(true);

      try {
        const result =
          await getUsers();

        if (!cancelled) {
          setUsers(result || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "Failed to load attendees."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ------------------------------------------------
   * INITIALIZE FORM
   * ------------------------------------------------
   */

  useEffect(() => {
    if (!sourceEvent) {
      return;
    }

    setTitle(
      sourceEvent.title || ""
    );

    setDescription(
      sourceEvent.description || ""
    );

    setDate(
      sourceEvent.date || ""
    );

    setStartTime(
      sourceEvent.startTime ||
        "09:00"
    );

    setEndTime(
      sourceEvent.endTime ||
        "10:00"
    );

    setAllDay(
      Boolean(sourceEvent.allDay)
    );

    setAttendees(
      sourceEvent.attendees || []
    );

    /*
     * Recurrence edit mode
     *
     * Occurrence -> This occurrence
     * Normal recurring event -> All occurrences
     */

    if (sourceEvent.isOccurrence) {
      setRecurrenceEditMode(
        "this"
      );
    } else {
      setRecurrenceEditMode(
        "all"
      );
    }

    const recurrence =
      sourceEvent.recurrence;

    if (
      recurrence &&
      recurrence.frequency &&
      recurrence.frequency !==
        "none"
    ) {
      setRecurrenceFrequency(
        recurrence.frequency
      );

      setRecurrenceInterval(
        recurrence.interval || 1
      );

      setRecurrenceEndType(
        recurrence.endType ||
          "never"
      );

      setRecurrenceUntil(
        recurrence.until || ""
      );

      setRecurrenceCount(
        recurrence.count || 1
      );

      setWeeklyDays(
        Array.isArray(
          recurrence.weekdays
        )
          ? recurrence.weekdays
          : recurrence.dayOfWeek !==
              null &&
            recurrence.dayOfWeek !==
              undefined
          ? [recurrence.dayOfWeek]
          : []
      );

      if (
        recurrence.weekOfMonth
      ) {
        setMonthlyMode(
          "weekday"
        );

        setMonthlyWeekOfMonth(
          recurrence.weekOfMonth
        );

        setMonthlyDayOfWeek(
          recurrence.dayOfWeek ?? 2
        );
      } else {
        setMonthlyMode(
          "dayOfMonth"
        );

        setMonthlyDayOfMonth(
          recurrence.dayOfMonth ||
            1
        );
      }
    } else {
      setRecurrenceFrequency(
        "none"
      );

      setRecurrenceInterval(1);

      setRecurrenceEndType(
        "never"
      );

      setRecurrenceUntil("");

      setRecurrenceCount(1);

      setWeeklyDays([]);

      setMonthlyMode(
        "dayOfMonth"
      );

      const sourceDay =
        sourceEvent.date
          ? Number(
              sourceEvent.date
                .split("-")[2]
            )
          : 1;

      setMonthlyDayOfMonth(
        Math.min(
          31,
          Math.max(
            1,
            sourceDay
          )
        )
      );

      setMonthlyWeekOfMonth(1);

      setMonthlyDayOfWeek(2);
    }

    setReminder(
      sourceEvent.reminder ?? 0
    );

    setError("");
    setSuccessMessage("");
  }, [sourceEvent]);

  /*
   * ------------------------------------------------
   * ATTENDEE HELPERS
   * ------------------------------------------------
   */

  const getUserId = (
    user
  ) => {
    return (
      user?.id ??
      user?.userId
    );
  };

  const isAttendeeSelected = (
    user
  ) => {
    const userId =
      getUserId(user);

    return attendees.some(
      (attendee) =>
        String(
          getUserId(attendee)
        ) ===
        String(userId)
    );
  };

  const toggleAttendee = (
    user
  ) => {
    const userId =
      getUserId(user);

    if (
      isAttendeeSelected(user)
    ) {
      setAttendees(
        (previous) =>
          previous.filter(
            (attendee) =>
              String(
                getUserId(
                  attendee
                )
              ) !==
              String(userId)
          )
      );

      return;
    }

    setAttendees(
      (previous) => [
        ...previous,
        user,
      ]
    );
  };

  const removeAttendee = (
    userId
  ) => {
    setAttendees(
      (previous) =>
        previous.filter(
          (attendee) =>
            String(
              getUserId(attendee)
            ) !==
            String(userId)
        )
    );
  };

  const filteredUsers =
    users.filter(
      (user) => {
        const fullName =
          `${user.firstName || ""} ${
            user.lastName || ""
          }`.toLowerCase();

        const email =
          (
            user.email || ""
          ).toLowerCase();

        const search =
          userSearch
            .trim()
            .toLowerCase();

        if (!search) {
          return true;
        }

        return (
          fullName.includes(
            search
          ) ||
          email.includes(search)
        );
      }
    );

  /*
   * ------------------------------------------------
   * LIVE ATTENDEE BUSY WARNING
   * ------------------------------------------------
   */

  const busyAttendees =
    attendees.filter(
      (selectedAttendee) => {
        const selectedId =
          String(
            getUserId(
              selectedAttendee
            )
          );

        return events.some(
          (calendarEvent) => {
            /*
             * Don't compare the event
             * with itself while editing.
             */

            if (
              isEditMode &&
              String(
                calendarEvent.id
              ) ===
                String(
                  sourceEvent?.id
                )
            ) {
              return false;
            }

            if (
              calendarEvent.date !==
              date
            ) {
              return false;
            }

            const eventAttendees =
              Array.isArray(
                calendarEvent.attendees
              )
                ? calendarEvent.attendees
                : [];

            const hasSameAttendee =
              eventAttendees.some(
                (eventAttendee) =>
                  String(
                    getUserId(
                      eventAttendee
                    )
                  ) ===
                  selectedId
              );

            if (!hasSameAttendee) {
              return false;
            }

            /*
             * All-day event occupies
             * the entire day.
             */

            if (
              calendarEvent.allDay ||
              allDay
            ) {
              return true;
            }

            if (
              !startTime ||
              !endTime ||
              !calendarEvent.startTime ||
              !calendarEvent.endTime
            ) {
              return false;
            }

            const newStart =
              getMinutes(
                startTime
              );

            const newEnd =
              getMinutes(
                endTime
              );

            const existingStart =
              getMinutes(
                calendarEvent.startTime
              );

            const existingEnd =
              getMinutes(
                calendarEvent.endTime
              );

            /*
             * Overlap condition:
             *
             * newStart < existingEnd
             * AND
             * newEnd > existingStart
             */

            return (
              newStart <
                existingEnd &&
              newEnd >
                existingStart
            );
          }
        );
      }
    );

  /*
   * ------------------------------------------------
   * WEEKLY DAYS
   * ------------------------------------------------
   */

  const weekDays = [
    {
      value: 0,
      label: "Sun",
    },
    {
      value: 1,
      label: "Mon",
    },
    {
      value: 2,
      label: "Tue",
    },
    {
      value: 3,
      label: "Wed",
    },
    {
      value: 4,
      label: "Thu",
    },
    {
      value: 5,
      label: "Fri",
    },
    {
      value: 6,
      label: "Sat",
    },
  ];

  const toggleWeeklyDay = (
    day
  ) => {
    setWeeklyDays(
      (previous) => {
        if (
          previous.includes(day)
        ) {
          return previous.filter(
            (value) =>
              value !== day
          );
        }

        return [
          ...previous,
          day,
        ].sort(
          (a, b) => a - b
        );
      }
    );
  };

  /*
   * ------------------------------------------------
   * RECURRENCE
   * ------------------------------------------------
   */

  const buildRecurrence = () => {
    if (
      recurrenceFrequency ===
      "none"
    ) {
      return {
        frequency: "none",
        interval: 1,
        endType: "never",
        until: "",
        count: null,
        weekdays: [],
        dayOfWeek: null,
        weekOfMonth: null,
        dayOfMonth: null,
      };
    }

    const recurrence = {
      frequency:
        recurrenceFrequency,

      interval:
        Math.max(
          1,
          Number(
            recurrenceInterval
          ) || 1
        ),

      endType:
        recurrenceEndType,

      until:
        recurrenceEndType ===
        "until"
          ? recurrenceUntil
          : "",

      count:
        recurrenceEndType ===
        "count"
          ? Math.max(
              1,
              Number(
                recurrenceCount
              ) || 1
            )
          : null,

      weekdays: [],
      dayOfWeek: null,
      weekOfMonth: null,
      dayOfMonth: null,
    };

    if (
      recurrenceFrequency ===
      "weekly"
    ) {
      recurrence.weekdays =
        weeklyDays;

      recurrence.dayOfWeek =
        weeklyDays.length > 0
          ? weeklyDays[0]
          : null;
    }

    if (
      recurrenceFrequency ===
      "monthly"
    ) {
      if (
        monthlyMode ===
        "dayOfMonth"
      ) {
        recurrence.dayOfMonth =
          Math.max(
            1,
            Math.min(
              31,
              Number(
                monthlyDayOfMonth
              ) || 1
            )
          );
      } else {
        recurrence.weekOfMonth =
          Number(
            monthlyWeekOfMonth
          ) || 1;

        recurrence.dayOfWeek =
          Number(
            monthlyDayOfWeek
          );

        recurrence.weekdays = [
          recurrence.dayOfWeek,
        ];
      }
    }

    return recurrence;
  };

  /*
   * ------------------------------------------------
   * VALIDATION
   * ------------------------------------------------
   */

  const validateForm = () => {
    if (!title.trim()) {
      return "Title is required.";
    }

    if (!date) {
      return "Date is required.";
    }

    if (!allDay) {
      if (!startTime) {
        return "Start time is required.";
      }

      if (!endTime) {
        return "End time is required.";
      }

      if (
        getMinutes(endTime) <=
        getMinutes(startTime)
      ) {
        return "End time must be after start time.";
      }
    }

    if (
      recurrenceFrequency ===
      "weekly" &&
      weeklyDays.length === 0
    ) {
      return "Select at least one weekday.";
    }

    if (
      recurrenceFrequency ===
      "monthly"
    ) {
      if (
        monthlyMode ===
        "dayOfMonth"
      ) {
        const day =
          Number(
            monthlyDayOfMonth
          );

        if (
          !day ||
          day < 1 ||
          day > 31
        ) {
          return "Monthly day must be between 1 and 31.";
        }
      }
    }

    if (
      recurrenceEndType ===
      "until"
    ) {
      if (!recurrenceUntil) {
        return "Select an end date.";
      }

      if (
        recurrenceUntil <
        date
      ) {
        return "Recurrence end date cannot be before the event date.";
      }
    }

    if (
      recurrenceEndType ===
      "count"
    ) {
      const count =
        Number(
          recurrenceCount
        );

      if (
        !count ||
        count < 1
      ) {
        return "Occurrence count must be at least 1.";
      }
    }

    return "";
  };

  /*
   * ------------------------------------------------
   * SAVE
   * ------------------------------------------------
   */

  const handleSubmit = async (
    submitEvent
  ) => {
    submitEvent.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccessMessage("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    setSaving(true);

    const recurrence =
      buildRecurrence();

    const eventData = {
      ...(sourceEvent || {}),

      title:
        title.trim(),

      description:
        description.trim(),

      date,

      startTime:
        allDay
          ? "00:00"
          : startTime,

      endTime:
        allDay
          ? "23:59"
          : endTime,

      allDay,

      attendees,

      recurrence,

      reminder:
        Number(reminder) || 0,

      occurrenceDate:
        sourceEvent?.originalOccurrenceDate ||
        sourceEvent?.occurrenceDate ||
        date,

      apiId:
        sourceEvent?.apiId ??
        null,
    };

    /*
     * Only send recurrence edit mode
     * when editing a recurring event.
     */

    if (
      isEditMode &&
      isRecurringEvent
    ) {
      eventData.recurrenceEditMode =
        recurrenceEditMode;
    }

    try {
      if (isEditMode) {
        const updated =
          await updateEvent(
            sourceEvent.id,
            eventData
          );

        await fakeSync();

        onEventUpdated?.({
          ...eventData,

          id:
            sourceEvent.id,

          apiId:
            sourceEvent.apiId ??
            updated?.id ??
            null,
        });

        setSuccessMessage(
          "Event updated successfully."
        );
      } else {
        const created =
          await createEvent(
            eventData
          );

        await fakeSync();

        const newEventId =
          `event-${crypto.randomUUID()}`;

        onEventCreated?.({
          ...eventData,

          id:
            newEventId,

          apiId:
            created?.id ??
            null,

          isLocal: true,
        });

        setSuccessMessage(
          "Event created successfully."
        );
      }

      window.setTimeout(() => {
        onClose?.();
      }, 400);
    } catch (saveError) {
      setError(
        saveError?.message ||
          "Failed to save event."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ------------------------------------------------
   * RENDER
   * ------------------------------------------------
   */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2
              id="event-form-title"
              className="text-xl font-bold text-slate-900"
            >
              {isEditMode
                ? "Edit Event"
                : "Create Event"}
            </h2>

            <p className="text-sm text-slate-500">
              Add event details and recurrence.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* TITLE */}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title *
            </label>

            <input
              type="text"
              value={title}
              onChange={(inputEvent) =>
                setTitle(
                  inputEvent.target.value
                )
              }
              placeholder="Event title"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(inputEvent) =>
                setDescription(
                  inputEvent.target.value
                )
              }
              rows={3}
              placeholder="Event description"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
            />
          </div>

          {/* DATE */}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Date *
            </label>

            <input
              type="date"
              value={date}
              onChange={(inputEvent) =>
                setDate(
                  inputEvent.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          {/* ALL DAY */}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(inputEvent) =>
                setAllDay(
                  inputEvent.target.checked
                )
              }
            />

            All-day event
          </label>

          {/* TIME */}

          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Start time *
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(inputEvent) =>
                    setStartTime(
                      inputEvent.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  End time *
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(inputEvent) =>
                    setEndTime(
                      inputEvent.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          )}

          {/* ATTENDEES */}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Attendees
            </label>

            <input
              type="search"
              value={userSearch}
              onChange={(inputEvent) =>
                setUserSearch(
                  inputEvent.target.value
                )
              }
              placeholder="Search attendees..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />

            {attendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attendees.map(
                  (attendee) => {
                    const attendeeId =
                      getUserId(
                        attendee
                      );

                    return (
                      <button
                        key={
                          attendeeId
                        }
                        type="button"
                        onClick={() =>
                          removeAttendee(
                            attendeeId
                          )
                        }
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                      >
                        {attendee.firstName}{" "}
                        {attendee.lastName}
                        {" ×"}
                      </button>
                    );
                  }
                )}
              </div>
            )}

            {/* BUSY WARNING */}

            {busyAttendees.length >
              0 && (
              <div
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                role="alert"
              >
                <strong>
                  Busy attendee:
                </strong>{" "}
                {busyAttendees
                  .map(
                    (attendee) =>
                      `${attendee.firstName || ""} ${
                        attendee.lastName || ""
                      }`.trim()
                  )
                  .join(", ")}
                {" "}
                already has an overlapping
                event at this time.
              </div>
            )}

            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
              {loadingUsers && (
                <div className="p-3 text-sm text-slate-500">
                  Loading attendees...
                </div>
              )}

              {!loadingUsers &&
                filteredUsers.length ===
                  0 && (
                  <div className="p-3 text-sm text-slate-500">
                    No users found.
                  </div>
                )}

              {!loadingUsers &&
                filteredUsers.map(
                  (user) => {
                    const userId =
                      getUserId(user);

                    const selected =
                      isAttendeeSelected(
                        user
                      );

                    return (
                      <button
                        key={
                          userId
                        }
                        type="button"
                        onClick={() =>
                          toggleAttendee(
                            user
                          )
                        }
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                          selected
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <span>
                          {user.firstName}{" "}
                          {user.lastName}

                          <span className="ml-2 text-xs text-slate-400">
                            {user.email}
                          </span>
                        </span>

                        {selected && (
                          <span className="text-blue-600">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
            </div>
          </div>

          {/* RECURRENCE */}

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Recurrence
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-slate-600">
                  Repeat
                </label>

                <select
                  value={
                    recurrenceFrequency
                  }
                  onChange={(inputEvent) =>
                    setRecurrenceFrequency(
                      inputEvent.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="none">
                    Does not repeat
                  </option>

                  <option value="daily">
                    Daily
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>
                </select>
              </div>

              {recurrenceFrequency !==
                "none" && (
                <div>
                  <label className="mb-1 block text-sm text-slate-600">
                    Every
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={
                        recurrenceInterval
                      }
                      onChange={(
                        inputEvent
                      ) =>
                        setRecurrenceInterval(
                          Math.max(
                            1,
                            Number(
                              inputEvent
                                .target
                                .value
                            ) || 1
                          )
                        )
                      }
                      className="w-24 rounded-lg border border-slate-300 px-3 py-2"
                    />

                    <span className="text-sm text-slate-500">
                      {recurrenceFrequency ===
                      "daily"
                        ? "day(s)"
                        : recurrenceFrequency ===
                          "weekly"
                        ? "week(s)"
                        : "month(s)"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* WEEKLY */}

            {recurrenceFrequency ===
              "weekly" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Repeat on
                </label>

                <div className="flex flex-wrap gap-2">
                  {weekDays.map(
                    (day) => {
                      const selected =
                        weeklyDays.includes(
                          day.value
                        );

                      return (
                        <button
                          key={
                            day.value
                          }
                          type="button"
                          onClick={() =>
                            toggleWeeklyDay(
                              day.value
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            selected
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* MONTHLY */}

            {recurrenceFrequency ===
              "monthly" && (
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="monthlyMode"
                    value="dayOfMonth"
                    checked={
                      monthlyMode ===
                      "dayOfMonth"
                    }
                    onChange={() =>
                      setMonthlyMode(
                        "dayOfMonth"
                      )
                    }
                  />

                  Day{" "}
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={
                      monthlyDayOfMonth
                    }
                    onChange={(
                      inputEvent
                    ) =>
                      setMonthlyDayOfMonth(
                        Math.max(
                          1,
                          Math.min(
                            31,
                            Number(
                              inputEvent
                                .target
                                .value
                            ) || 1
                          )
                        )
                      )
                    }
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                  />

                  of every{" "}
                  {recurrenceInterval}{" "}
                  month(s)
                </label>

                <label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="monthlyMode"
                    value="weekday"
                    checked={
                      monthlyMode ===
                      "weekday"
                    }
                    onChange={() =>
                      setMonthlyMode(
                        "weekday"
                      )
                    }
                  />

                  The

                  <select
                    value={
                      monthlyWeekOfMonth
                    }
                    onChange={(
                      inputEvent
                    ) =>
                      setMonthlyWeekOfMonth(
                        Number(
                          inputEvent
                            .target
                            .value
                        )
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1"
                  >
                    <option value="1">
                      1st
                    </option>

                    <option value="2">
                      2nd
                    </option>

                    <option value="3">
                      3rd
                    </option>

                    <option value="4">
                      4th
                    </option>

                    <option value="5">
                      5th
                    </option>

                    <option value="-1">
                      Last
                    </option>
                  </select>

                  <select
                    value={
                      monthlyDayOfWeek
                    }
                    onChange={(
                      inputEvent
                    ) =>
                      setMonthlyDayOfWeek(
                        Number(
                          inputEvent
                            .target
                            .value
                        )
                      )
                    }
                    className="rounded-lg border border-slate-300 px-2 py-1"
                  >
                    {weekDays.map(
                      (day) => (
                        <option
                          key={
                            day.value
                          }
                          value={
                            day.value
                          }
                        >
                          {
                            day.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  of every{" "}
                  {recurrenceInterval}{" "}
                  month(s)
                </label>
              </div>
            )}

            {/* END */}

            {recurrenceFrequency !==
              "none" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ends
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="recurrenceEnd"
                      checked={
                        recurrenceEndType ===
                        "never"
                      }
                      onChange={() =>
                        setRecurrenceEndType(
                          "never"
                        )
                      }
                    />

                    Never
                  </label>

                  <label className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="recurrenceEnd"
                      checked={
                        recurrenceEndType ===
                        "until"
                      }
                      onChange={() =>
                        setRecurrenceEndType(
                          "until"
                        )
                      }
                    />

                    On

                    <input
                      type="date"
                      value={
                        recurrenceUntil
                      }
                      onChange={(
                        inputEvent
                      ) =>
                        setRecurrenceUntil(
                          inputEvent
                            .target
                            .value
                        )
                      }
                      disabled={
                        recurrenceEndType !==
                        "until"
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <label className="flex flex-wrap items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="recurrenceEnd"
                      checked={
                        recurrenceEndType ===
                        "count"
                      }
                      onChange={() =>
                        setRecurrenceEndType(
                          "count"
                        )
                      }
                    />

                    After

                    <input
                      type="number"
                      min="1"
                      value={
                        recurrenceCount
                      }
                      onChange={(
                        inputEvent
                      ) =>
                        setRecurrenceCount(
                          Math.max(
                            1,
                            Number(
                              inputEvent
                                .target
                                .value
                            ) || 1
                          )
                        )
                      }
                      disabled={
                        recurrenceEndType !==
                        "count"
                      }
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                    />

                    occurrences
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* RECURRENCE EDIT MODE */}

          {isEditMode &&
            isRecurringEvent && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Edit recurring event
                </h3>

                <p className="mb-3 text-xs text-slate-600">
                  Choose which occurrences
                  should receive your changes.
                </p>

                <div className="space-y-2">
                  {isRecurringOccurrence && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white p-3 hover:border-blue-300">
                      <input
                        type="radio"
                        name="recurrenceEditMode"
                        value="this"
                        checked={
                          recurrenceEditMode ===
                          "this"
                        }
                        onChange={() =>
                          setRecurrenceEditMode(
                            "this"
                          )
                        }
                        className="mt-1"
                      />

                      <span>
                        <span className="block text-sm font-medium text-slate-800">
                          This occurrence
                        </span>

                        <span className="block text-xs text-slate-500">
                          Change only the selected occurrence.
                        </span>
                      </span>
                    </label>
                  )}

                  {isRecurringOccurrence && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white p-3 hover:border-blue-300">
                      <input
                        type="radio"
                        name="recurrenceEditMode"
                        value="following"
                        checked={
                          recurrenceEditMode ===
                          "following"
                        }
                        onChange={() =>
                          setRecurrenceEditMode(
                            "following"
                          )
                        }
                        className="mt-1"
                      />

                      <span>
                        <span className="block text-sm font-medium text-slate-800">
                          This and following
                        </span>

                        <span className="block text-xs text-slate-500">
                          Split the series and apply changes from this occurrence onward.
                        </span>
                      </span>
                    </label>
                  )}

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white p-3 hover:border-blue-300">
                    <input
                      type="radio"
                      name="recurrenceEditMode"
                      value="all"
                      checked={
                        recurrenceEditMode ===
                        "all"
                      }
                      onChange={() =>
                        setRecurrenceEditMode(
                          "all"
                        )
                      }
                      className="mt-1"
                    />

                    <span>
                      <span className="block text-sm font-medium text-slate-800">
                        All occurrences
                      </span>

                      <span className="block text-xs text-slate-500">
                        Apply changes to the entire recurring series.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

          {/* REMINDER */}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Reminder
            </label>

            <select
              value={reminder}
              onChange={(inputEvent) =>
                setReminder(
                  inputEvent.target.value
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="0">
                No reminder
              </option>

              <option value="5">
                5 minutes before
              </option>

              <option value="10">
                10 minutes before
              </option>

              <option value="15">
                15 minutes before
              </option>

              <option value="30">
                30 minutes before
              </option>

              <option value="60">
                1 hour before
              </option>

              <option value="1440">
                1 day before
              </option>
            </select>
          </div>

          {/* ACTIONS */}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : isEditMode
                ? "Update Event"
                : "Save Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventForm;