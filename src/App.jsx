import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Login from "./Login";
import Calendar from "./components/Calendar";
import EventForm from "./components/EventForm";
import EventDetails from "./components/EventDetails";

import { getCurrentUser } from "./services/authService";

import {
  createEvent,
  deleteEvent,
  getEvents,
  updateEvent,
} from "./services/calendarService";

import {
  loadEventsFromStorage,
  saveEventsToStorage,
} from "./services/storageService";

import { fakeSync } from "./services/syncService";

import {
  useCalendarContext,
} from "./context/CalendarContext";

function App() {
  const {
    state,
    dispatch,
    history,
  } = useCalendarContext();

  const {
    events,
    editingEvent,
    loading,
  } = state;

  const [loggedIn, setLoggedIn] =
    useState(
      Boolean(
        localStorage.getItem(
          "accessToken"
        )
      )
    );

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [syncStatus, setSyncStatus] =
    useState("saved");

  const [dragEvent, setDragEvent] =
    useState(null);

  const [currentPath, setCurrentPath] =
    useState(
      window.location.pathname
    );

  /*
   * Prevent duplicate delete requests.
   */
  const pendingDeletesRef =
    useRef(new Set());

  /*
   * ------------------------------------------------
   * EVENT OPERATION VERSION
   * ------------------------------------------------
   *
   * Every event gets its own operation number.
   *
   * Example:
   *
   * Move 1 -> version 1
   * Move 2 -> version 2
   *
   * If Move 1 finishes after Move 2,
   * Move 1 cannot rollback or overwrite
   * the newer operation.
   */

  const eventOperationVersionRef =
    useRef(new Map());

  const startEventOperation =
    useCallback((eventId) => {
      const current =
        eventOperationVersionRef.current.get(
          eventId
        ) || 0;

      const next = current + 1;

      eventOperationVersionRef.current.set(
        eventId,
        next
      );

      return next;
    }, []);

  const isLatestEventOperation =
    useCallback(
      (
        eventId,
        operationVersion
      ) => {
        return (
          eventOperationVersionRef.current.get(
            eventId
          ) === operationVersion
        );
      },
      []
    );

  /*
   * ------------------------------------------------
   * GLOBAL SYNC STATUS
   * ------------------------------------------------
   */

  const syncStatusVersionRef =
    useRef(0);

  const startSyncStatusOperation =
    useCallback(() => {
      syncStatusVersionRef.current += 1;

      return syncStatusVersionRef.current;
    }, []);

  const isLatestSyncStatusOperation =
    useCallback(
      (operationVersion) => {
        return (
          syncStatusVersionRef.current ===
          operationVersion
        );
      },
      []
    );

  /*
   * ------------------------------------------------
   * NAVIGATION
   * ------------------------------------------------
   */

  const navigate = useCallback(
    (path) => {
      window.history.pushState(
        {},
        "",
        path
      );

      setCurrentPath(path);
    },
    []
  );

  const goToCalendar =
    useCallback(() => {
      window.history.pushState(
        {},
        "",
        "/"
      );

      setCurrentPath("/");
    }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(
        window.location.pathname
      );
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);

  /*
   * ------------------------------------------------
   * CHECK SESSION
   * ------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const checkSession =
      async () => {
        const accessToken =
          localStorage.getItem(
            "accessToken"
          );

        if (!accessToken) {
          if (!cancelled) {
            setLoggedIn(false);
            setCheckingSession(false);
          }

          return;
        }

        try {
          await getCurrentUser();

          if (!cancelled) {
            setLoggedIn(true);
          }
        } catch (error) {
          if (!cancelled) {
            console.error(
              "Session check failed:",
              error
            );

            localStorage.removeItem(
              "accessToken"
            );

            localStorage.removeItem(
              "refreshToken"
            );

            setLoggedIn(false);
          }
        } finally {
          if (!cancelled) {
            setCheckingSession(false);
          }
        }
      };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ------------------------------------------------
   * LOAD EVENTS
   * ------------------------------------------------
   */

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const loadCalendar =
      async () => {
        dispatch({
          type: "SET_LOADING",
          payload: true,
        });

        try {
          const localEvents =
            loadEventsFromStorage();

          if (
            localEvents.length > 0
          ) {
            dispatch({
              type: "SET_EVENTS",
              payload: localEvents,
            });
          }

          const apiEvents =
            await getEvents();

          if (
            localEvents.length === 0
          ) {
            dispatch({
              type: "SET_EVENTS",
              payload: apiEvents,
            });

            saveEventsToStorage(
              apiEvents
            );
          }
        } catch (error) {
          console.error(
            "Failed to load events:",
            error
          );

          const localEvents =
            loadEventsFromStorage();

          dispatch({
            type: "SET_EVENTS",
            payload: localEvents,
          });
        } finally {
          dispatch({
            type: "SET_LOADING",
            payload: false,
          });
        }
      };

    loadCalendar();
  }, [
    loggedIn,
    dispatch,
  ]);

  /*
   * ------------------------------------------------
   * SAVE EVENTS TO LOCAL STORAGE
   * ------------------------------------------------
   */

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    if (loading) {
      return;
    }

    saveEventsToStorage(events);
  }, [
    events,
    loggedIn,
    loading,
  ]);

  /*
   * ------------------------------------------------
   * KEYBOARD UNDO / REDO
   * ------------------------------------------------
   */

  useEffect(() => {
    const handleKeyDown =
      (event) => {
        const isUndo =
          event.ctrlKey &&
          !event.shiftKey &&
          event.key.toLowerCase() ===
            "z";

        const isRedo =
          event.ctrlKey &&
          event.shiftKey &&
          event.key.toLowerCase() ===
            "z";

        if (isUndo) {
          event.preventDefault();
          history.undo();
        }

        if (isRedo) {
          event.preventDefault();
          history.redo();
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
  }, [history]);

  /*
   * ------------------------------------------------
   * LOGIN
   * ------------------------------------------------
   */

  const handleLogin = () => {
    setLoggedIn(true);
    setCheckingSession(false);
  };

  /*
   * ------------------------------------------------
   * LOGOUT
   * ------------------------------------------------
   */

  const handleLogout = () => {
    localStorage.removeItem(
      "accessToken"
    );

    localStorage.removeItem(
      "refreshToken"
    );

    setLoggedIn(false);

    dispatch({
      type: "SET_EVENTS",
      payload: [],
    });

    history.clear();

    goToCalendar();
  };

  /*
   * ------------------------------------------------
   * MULTI-TAB LOGOUT
   * ------------------------------------------------
   */

  useEffect(() => {
    const handleStorage =
      (event) => {
        if (
          event.key ===
            "accessToken" &&
          event.newValue === null
        ) {
          setLoggedIn(false);

          dispatch({
            type: "SET_EVENTS",
            payload: [],
          });

          history.clear();

          goToCalendar();
        }
      };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    dispatch,
    history,
    goToCalendar,
  ]);

  /*
   * ------------------------------------------------
   * CREATE EVENT
   * ------------------------------------------------
   *
   * EventForm passes validated data here.
   *
   * App performs:
   *
   * createEvent()
   * fakeSync()
   *
   * before changing local state.
   */

  const handleCreateEvent =
    useCallback(
      async (eventData) => {
        const temporaryId =
          `new-${crypto.randomUUID()}`;

        const statusVersion =
          startSyncStatusOperation();

        setSyncStatus("saving");

        try {
          const created =
            await createEvent(
              eventData
            );

          await fakeSync();

          const clientId =
            `event-${crypto.randomUUID()}`;

          const eventWithStableId = {
            ...eventData,

            id: clientId,

            apiId:
              created?.id ??
              null,

            isLocal: true,
          };

          history.execute({
            do: () => {
              dispatch({
                type: "ADD_EVENT",
                payload:
                  eventWithStableId,
              });
            },

            undo: () => {
              dispatch({
                type: "DELETE_EVENT",
                payload:
                  eventWithStableId.id,
              });
            },
          });

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus("saved");
          }

          return eventWithStableId;
        } catch (error) {
          console.error(
            "Failed to create event:",
            error
          );

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus("failed");
          }

          throw error;
        }
      },
      [
        dispatch,
        history,
        startSyncStatusOperation,
        isLatestSyncStatusOperation,
      ]
    );

  /*
   * ------------------------------------------------
   * NORMAL EVENT UPDATE
   * ------------------------------------------------
   */

  const handleNormalEventUpdate =
    useCallback(
      async (updatedEvent) => {
        const previousEvent =
          events.find(
            (event) =>
              event.id ===
              updatedEvent.id
          );

        if (!previousEvent) {
          return;
        }

        const eventId =
          updatedEvent.id;

        const operationVersion =
          startEventOperation(
            eventId
          );

        const statusVersion =
          startSyncStatusOperation();

        setSyncStatus("saving");

        try {
          await updateEvent(
            eventId,
            updatedEvent
          );

          await fakeSync();

          /*
           * An older request must not
           * overwrite a newer operation.
           */

          if (
            !isLatestEventOperation(
              eventId,
              operationVersion
            )
          ) {
            return;
          }

          const command = {
            do: () => {
              dispatch({
                type: "UPDATE_EVENT",
                payload:
                  updatedEvent,
              });
            },

            undo: () => {
              dispatch({
                type: "UPDATE_EVENT",
                payload:
                  previousEvent,
              });
            },
          };

          history.execute(command);

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus("saved");
          }
        } catch (error) {
          console.error(
            "Failed to update event:",
            error
          );

          /*
           * Never let an old request
           * rollback a newer operation.
           */

          if (
            !isLatestEventOperation(
              eventId,
              operationVersion
            )
          ) {
            return;
          }

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus("failed");
          }

          throw error;
        }
      },
      [
        dispatch,
        events,
        history,
        startEventOperation,
        isLatestEventOperation,
        startSyncStatusOperation,
        isLatestSyncStatusOperation,
      ]
    );

  /*
   * ------------------------------------------------
   * UPDATE THIS OCCURRENCE
   * ------------------------------------------------
   */

  const updateThisOccurrence =
    useCallback(
      (
        seriesEvent,
        occurrenceEvent,
        updatedEvent
      ) => {
        const occurrenceDate =
          occurrenceEvent.originalOccurrenceDate ||
          occurrenceEvent.date;

        const exceptionId =
          `${seriesEvent.id}-exception-${occurrenceDate}`;

        const existingException =
          events.find(
            (event) =>
              event.id ===
              exceptionId
          );

        const newEvent = {
          ...updatedEvent,

          id: exceptionId,

          recurrence: null,

          recurrenceEditMode:
            undefined,

          isOccurrence: false,

          isException: true,

          originalEventId:
            seriesEvent.id,

          originalOccurrenceDate:
            occurrenceDate,

          seriesId:
            seriesEvent.seriesId ||
            seriesEvent.id,

          occurrenceIndex:
            occurrenceEvent.occurrenceIndex ??
            null,
        };

        const command = {
          do: () => {
            if (
              existingException
            ) {
              dispatch({
                type: "UPDATE_EVENT",
                payload: newEvent,
              });
            } else {
              dispatch({
                type: "ADD_EVENT",
                payload: newEvent,
              });
            }
          },

          undo: () => {
            if (
              existingException
            ) {
              dispatch({
                type: "UPDATE_EVENT",
                payload:
                  existingException,
              });
            } else {
              dispatch({
                type: "DELETE_EVENT",
                payload:
                  newEvent.id,
              });
            }
          },
        };

        history.execute(command);

        return command;
      },
      [
        dispatch,
        events,
        history,
      ]
    );

  /*
   * ------------------------------------------------
   * UPDATE THIS AND FOLLOWING
   * ------------------------------------------------
   */

  const updateFollowingOccurrences =
    useCallback(
      (
        seriesEvent,
        occurrenceEvent,
        updatedEvent
      ) => {
        const selectedDate =
          occurrenceEvent.originalOccurrenceDate ||
          occurrenceEvent.date;

        const selectedDateObject =
          new Date(
            `${selectedDate}T00:00:00`
          );

        const dayBefore =
          new Date(
            selectedDateObject
          );

        dayBefore.setDate(
          dayBefore.getDate() - 1
        );

        const oldEndDate =
          `${dayBefore.getFullYear()}-${String(
            dayBefore.getMonth() + 1
          ).padStart(2, "0")}-${String(
            dayBefore.getDate()
          ).padStart(2, "0")}`;

        const oldSeries = {
          ...seriesEvent,

          recurrence:
            seriesEvent.recurrence
              ? {
                  ...seriesEvent.recurrence,

                  endType: "until",

                  until:
                    oldEndDate,

                  count: null,
                }
              : null,
        };

        let remainingCount =
          null;

        if (
          seriesEvent.recurrence
            ?.endType === "count"
        ) {
          const occurrenceIndex =
            occurrenceEvent.occurrenceIndex ??
            0;

          remainingCount =
            Math.max(
              Number(
                seriesEvent.recurrence
                  .count
              ) -
                occurrenceIndex,
              1
            );
        }

        const newSeries = {
          ...updatedEvent,

          id:
            `${seriesEvent.id}-following-${selectedDate}`,

          date:
            selectedDate,

          seriesId:
            seriesEvent.seriesId ||
            seriesEvent.id,

          isOccurrence:
            false,

          isException:
            false,

          originalEventId:
            undefined,

          originalOccurrenceDate:
            undefined,

          occurrenceIndex:
            undefined,

          recurrence:
            updatedEvent.recurrence
              ? {
                  ...updatedEvent.recurrence,

                  ...(remainingCount
                    ? {
                        endType:
                          "count",

                        count:
                          remainingCount,

                        until: "",
                      }
                    : {}),
                }
              : null,

          recurrenceEditMode:
            undefined,
        };

        const command = {
          do: () => {
            dispatch({
              type: "UPDATE_EVENT",
              payload:
                oldSeries,
            });

            dispatch({
              type: "ADD_EVENT",
              payload:
                newSeries,
            });
          },

          undo: () => {
            dispatch({
              type: "UPDATE_EVENT",
              payload:
                seriesEvent,
            });

            dispatch({
              type: "DELETE_EVENT",
              payload:
                newSeries.id,
            });
          },
        };

        history.execute(command);

        return command;
      },
      [
        dispatch,
        history,
      ]
    );

  /*
   * ------------------------------------------------
   * UPDATE ALL OCCURRENCES
   * ------------------------------------------------
   */

  const updateAllOccurrences =
    useCallback(
      (
        seriesEvent,
        updatedEvent
      ) => {
        const newEvent = {
          ...updatedEvent,

          id:
            seriesEvent.id,

          seriesId:
            seriesEvent.seriesId ||
            seriesEvent.id,

          isOccurrence:
            false,

          isException:
            false,

          originalEventId:
            undefined,

          originalOccurrenceDate:
            undefined,

          occurrenceIndex:
            undefined,

          recurrenceEditMode:
            undefined,
        };

        const previousEvent =
          events.find(
            (event) =>
              event.id ===
              seriesEvent.id
          );

        if (!previousEvent) {
          return null;
        }

        const command = {
          do: () => {
            dispatch({
              type: "UPDATE_EVENT",
              payload:
                newEvent,
            });
          },

          undo: () => {
            dispatch({
              type: "UPDATE_EVENT",
              payload:
                previousEvent,
            });
          },
        };

        history.execute(command);

        return command;
      },
      [
        dispatch,
        events,
        history,
      ]
    );

  /*
   * ------------------------------------------------
   * EVENT UPDATED
   * ------------------------------------------------
   */

  const handleEventUpdated =
    useCallback(
      async (updatedEvent) => {
        const sourceEventId =
          updatedEvent.originalEventId ||
          updatedEvent.seriesId ||
          updatedEvent.id;

        const sourceEvent =
          events.find(
            (event) =>
              event.id ===
              sourceEventId
          );

        /*
         * Recurring event editing is
         * represented locally as:
         *
         * this
         * following
         * all
         *
         * EventForm has already sent
         * the persistence request.
         */

        if (
          updatedEvent.recurrenceEditMode &&
          sourceEvent?.recurrence
        ) {
          if (
            updatedEvent.recurrenceEditMode ===
            "this"
          ) {
            updateThisOccurrence(
              sourceEvent,
              updatedEvent,
              updatedEvent
            );

            return;
          }

          if (
            updatedEvent.recurrenceEditMode ===
            "following"
          ) {
            updateFollowingOccurrences(
              sourceEvent,
              updatedEvent,
              updatedEvent
            );

            return;
          }

          if (
            updatedEvent.recurrenceEditMode ===
            "all"
          ) {
            updateAllOccurrences(
              sourceEvent,
              updatedEvent
            );

            return;
          }
        }

        await handleNormalEventUpdate(
          updatedEvent
        );
      },
      [
        events,
        handleNormalEventUpdate,
        updateThisOccurrence,
        updateFollowingOccurrences,
        updateAllOccurrences,
      ]
    );

  /*
   * ------------------------------------------------
   * MOVE / RESIZE EVENT
   * ------------------------------------------------
   */

  const handleMoveEvent =
    useCallback(
      async (
        movedEvent,
        oldEvent
      ) => {
        const sourceEventId =
          oldEvent.originalEventId ||
          oldEvent.seriesId ||
          oldEvent.id;

        const sourceEvent =
          events.find(
            (event) =>
              event.id ===
              sourceEventId
          );

        /*
         * ------------------------------------------
         * RECURRING OCCURRENCE
         * ------------------------------------------
         */

        if (
          oldEvent.isOccurrence &&
          sourceEvent?.recurrence
        ) {
          const movedOccurrence = {
            ...movedEvent,

            id:
              oldEvent.id,

            isOccurrence:
              true,

            originalEventId:
              sourceEvent.id,

            originalOccurrenceDate:
              oldEvent.originalOccurrenceDate ||
              oldEvent.date,

            seriesId:
              sourceEvent.seriesId ||
              sourceEvent.id,
          };

          const operationVersion =
            startEventOperation(
              oldEvent.id
            );

          const statusVersion =
            startSyncStatusOperation();

          setSyncStatus("saving");

          try {
            await fakeSync();

            if (
              !isLatestEventOperation(
                oldEvent.id,
                operationVersion
              )
            ) {
              return;
            }

            updateThisOccurrence(
              sourceEvent,
              oldEvent,
              movedOccurrence
            );

            if (
              isLatestSyncStatusOperation(
                statusVersion
              )
            ) {
              setSyncStatus(
                "saved"
              );
            }
          } catch (error) {
            console.error(
              "Failed to sync moved occurrence:",
              error
            );

            if (
              isLatestEventOperation(
                oldEvent.id,
                operationVersion
              ) &&
              isLatestSyncStatusOperation(
                statusVersion
              )
            ) {
              setSyncStatus(
                "failed"
              );
            }
          }

          return;
        }

        /*
         * ------------------------------------------
         * NORMAL EVENT
         * ------------------------------------------
         */

        const previousEvent =
          events.find(
            (event) =>
              event.id ===
              oldEvent.id
          );

        if (!previousEvent) {
          return;
        }

        const eventId =
          movedEvent.id;

        const operationVersion =
          startEventOperation(
            eventId
          );

        const statusVersion =
          startSyncStatusOperation();

        const command = {
          do: () => {
            dispatch({
              type: "UPDATE_EVENT",
              payload:
                movedEvent,
            });
          },

          undo: () => {
            dispatch({
              type: "UPDATE_EVENT",
              payload:
                previousEvent,
            });
          },
        };

        /*
         * Optimistic UI update.
         */

        history.execute(command);

        setSyncStatus("saving");

        try {
          await updateEvent(
            eventId,
            movedEvent
          );

          await fakeSync();

          /*
           * Ignore an old request.
           */

          if (
            !isLatestEventOperation(
              eventId,
              operationVersion
            )
          ) {
            return;
          }

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus(
              "saved"
            );
          }
        } catch (error) {
          console.error(
            "Failed to save moved event:",
            error
          );

          /*
           * Only rollback if this
           * operation is still current.
           */

          if (
            !isLatestEventOperation(
              eventId,
              operationVersion
            )
          ) {
            return;
          }

          history.rollback(command);

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus(
              "failed"
            );
          }
        }
      },
      [
        dispatch,
        events,
        history,
        startEventOperation,
        isLatestEventOperation,
        startSyncStatusOperation,
        isLatestSyncStatusOperation,
        updateThisOccurrence,
      ]
    );

  /*
   * ------------------------------------------------
   * DELETE EVENT
   * ------------------------------------------------
   */

  const handleDeleteEvent =
    useCallback(
      async (eventId) => {
        /*
         * Double-click protection.
         */

        if (
          pendingDeletesRef.current.has(
            eventId
          )
        ) {
          return;
        }

        const eventToDelete =
          events.find(
            (event) =>
              event.id ===
              eventId
          );

        if (!eventToDelete) {
          return;
        }

        pendingDeletesRef.current.add(
          eventId
        );

        const operationVersion =
          startEventOperation(
            eventId
          );

        const statusVersion =
          startSyncStatusOperation();

        const command = {
          do: () => {
            dispatch({
              type: "DELETE_EVENT",
              payload: eventId,
            });
          },

          undo: () => {
            dispatch({
              type: "ADD_EVENT",
              payload:
                eventToDelete,
            });
          },
        };

        /*
         * Optimistic delete.
         */

        history.execute(command);

        setSyncStatus("saving");

        try {
          await deleteEvent(
            eventId,
            eventToDelete
          );

          await fakeSync();

          /*
           * Old delete must not overwrite
           * a newer operation.
           */

          if (
            !isLatestEventOperation(
              eventId,
              operationVersion
            )
          ) {
            return;
          }

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus(
              "saved"
            );
          }
        } catch (error) {
          console.error(
            "Failed to delete event:",
            error
          );

          if (
            !isLatestEventOperation(
              eventId,
              operationVersion
            )
          ) {
            return;
          }

          history.rollback(command);

          if (
            isLatestSyncStatusOperation(
              statusVersion
            )
          ) {
            setSyncStatus(
              "failed"
            );
          }
        } finally {
          pendingDeletesRef.current.delete(
            eventId
          );
        }
      },
      [
        dispatch,
        events,
        history,
        startEventOperation,
        isLatestEventOperation,
        startSyncStatusOperation,
        isLatestSyncStatusOperation,
      ]
    );

  /*
   * ------------------------------------------------
   * DRAG CREATION
   * ------------------------------------------------
   */

  const handleCreateFromDrag =
    useCallback(
      (eventData) => {
        setDragEvent(eventData);
      },
      []
    );

  /*
   * ------------------------------------------------
   * EVENT DETAILS
   * ------------------------------------------------
   */

  const eventDetailsId =
    currentPath.startsWith(
      "/events/"
    )
      ? decodeURIComponent(
          currentPath.substring(
            "/events/".length
          )
        )
      : null;

  let eventDetails =
    eventDetailsId
      ? events.find(
          (event) =>
            String(event.id) ===
            String(eventDetailsId)
        )
      : null;

  /*
   * Recurring occurrence route.
   */

  if (
    !eventDetails &&
    eventDetailsId
  ) {
    const occurrenceMarker =
      "__occurrence__";

    const markerIndex =
      eventDetailsId.indexOf(
        occurrenceMarker
      );

    if (
      markerIndex !== -1
    ) {
      const sourceEventId =
        eventDetailsId.substring(
          0,
          markerIndex
        );

      const occurrenceDate =
        eventDetailsId.substring(
          markerIndex +
            occurrenceMarker.length
        );

      const exceptionId =
        `${sourceEventId}-exception-${occurrenceDate}`;

      const exceptionEvent =
        events.find(
          (event) =>
            String(event.id) ===
            String(exceptionId)
        );

      if (exceptionEvent) {
        eventDetails =
          exceptionEvent;
      } else {
        const sourceEvent =
          events.find(
            (event) =>
              String(event.id) ===
              String(sourceEventId)
          );

        if (
          sourceEvent &&
          sourceEvent.recurrence
        ) {
          eventDetails = {
            ...sourceEvent,

            id:
              eventDetailsId,

            originalEventId:
              sourceEvent.id,

            seriesId:
              sourceEvent.seriesId ||
              sourceEvent.id,

            originalOccurrenceDate:
              occurrenceDate,

            occurrenceIndex:
              undefined,

            date:
              occurrenceDate,

            isOccurrence:
              true,

            isException:
              false,
          };
        }
      }
    }
  }

  /*
   * ------------------------------------------------
   * LOADING
   * ------------------------------------------------
   */

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl bg-white px-6 py-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Checking session...
          </p>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------
   * LOGIN
   * ------------------------------------------------
   */

  if (!loggedIn) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  /*
   * ------------------------------------------------
   * EVENT DETAILS
   * ------------------------------------------------
   */

  if (
    currentPath.startsWith(
      "/events/"
    )
  ) {
    return (
      <EventDetails
        event={eventDetails}
        onBack={goToCalendar}
        onEdit={(event) => {
          dispatch({
            type: "SET_EDITING_EVENT",
            payload: event,
          });

          goToCalendar();
        }}
      />
    );
  }

  /*
   * ------------------------------------------------
   * MAIN CALENDAR
   * ------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Calendar Scheduler
            </h1>

            <p className="text-xs text-slate-500">
              React Calendar Assignment
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium ${
                syncStatus ===
                "failed"
                  ? "text-red-600"
                  : syncStatus ===
                    "saving"
                  ? "text-amber-600"
                  : "text-green-600"
              }`}
            >
              {syncStatus ===
              "saving"
                ? "Saving..."
                : syncStatus ===
                  "failed"
                ? "Save failed"
                : "Saved"}
            </span>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={
                history.undo
              }
              disabled={
                !history.canUndo
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </button>

            <button
              type="button"
              onClick={
                history.redo
              }
              disabled={
                !history.canRedo
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Redo
            </button>
          </div>

          <span className="text-sm text-slate-500">
            {events.length} events
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading calendar...
            </p>
          </div>
        ) : (
          <Calendar
            events={events}
            onCreateFromDrag={
              handleCreateFromDrag
            }
            onViewEvent={(
              event
            ) => {
              const eventId =
                String(
                  event.id
                );

              navigate(
                `/events/${encodeURIComponent(
                  eventId
                )}`
              );
            }}
            onMoveEvent={
              handleMoveEvent
            }
          />
        )}

        {editingEvent && (
          <EventForm
            event={
              editingEvent.id
                ? editingEvent
                : undefined
            }
            initialEvent={
              editingEvent.id
                ? undefined
                : editingEvent
            }
            events={events}
            onEventUpdated={
              handleEventUpdated
            }
            onEventCreated={
              handleCreateEvent
            }
            onClose={() =>
              dispatch({
                type: "SET_EDITING_EVENT",
                payload: null,
              })
            }
          />
        )}

        {dragEvent && (
          <EventForm
            initialEvent={
              dragEvent
            }
            events={events}
            onEventCreated={
              handleCreateEvent
            }
            onClose={() =>
              setDragEvent(null)
            }
          />
        )}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-800">
            Events
          </h2>

          <div className="mt-3 space-y-2">
            {events.map(
              (event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {event.title}
                    </p>

                    <p className="text-xs text-slate-500">
                      {event.date}{" "}
                      {event.allDay
                        ? "All day"
                        : `${event.startTime} - ${event.endTime}`}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/events/${encodeURIComponent(
                            String(
                              event.id
                            )
                          )}`
                        )
                      }
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "SET_EDITING_EVENT",
                          payload:
                            event,
                        })
                      }
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={
                        pendingDeletesRef.current.has(
                          event.id
                        )
                      }
                      onClick={() =>
                        handleDeleteEvent(
                          event.id
                        )
                      }
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {pendingDeletesRef.current.has(
                        event.id
                      )
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;