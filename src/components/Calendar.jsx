import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import useDragInteraction from "../hooks/useDragInteraction";

import {
  useCalendarContext,
} from "../context/CalendarContext";

import {
  getUrlState,
  updateUrlState,
} from "../utils/urlState";

import {
  expandEventsForRange,
} from "../utils/recurrenceUtils";

function Calendar({
  events,
  onCreateFromDrag,
  onMoveEvent,
  onViewEvent,
}) {
  const {
    state,
    dispatch,
  } = useCalendarContext();

  const {
    selectedDate,
    view,
    timezone,
  } = state;

  const [selectedEventId, setSelectedEventId] =
    useState(null);

  const [keyboardMoveMode, setKeyboardMoveMode] =
    useState(false);

  const [moveAnnouncement, setMoveAnnouncement] =
    useState("");

  const [dragPreview, setDragPreview] =
    useState(null);

  const [resizePreview, setResizePreview] =
    useState(null);

  /*
   * Event move drag state
   */
  const [isEventDragging, setIsEventDragging] =
    useState(false);

  /*
   * Event resize state
   */
  const [isEventResizing, setIsEventResizing] =
    useState(false);

  const eventDragRef =
    useRef(null);

  const resizeDragRef =
    useRef(null);

  const didEventDragRef =
    useRef(false);

  const didEventResizeRef =
    useRef(false);

  const dragPreviewFrame =
    useRef(null);

  const resizePreviewFrame =
    useRef(null);

  const didDragRef =
    useRef(false);

  /*
   * ------------------------------------------------
   * URL STATE
   * ------------------------------------------------
   */

  useEffect(() => {
    const urlState = getUrlState();

    dispatch({
      type: "SET_VIEW",
      payload: urlState.view,
    });

    dispatch({
      type: "SET_SELECTED_DATE",
      payload: urlState.date,
    });

    dispatch({
      type: "SET_TIMEZONE",
      payload: urlState.timezone,
    });
  }, [dispatch]);

  useEffect(() => {
    updateUrlState({
      view,
      date: selectedDate,
      timezone,
      attendee: "",
    });
  }, [
    view,
    selectedDate,
    timezone,
  ]);

  /*
   * ------------------------------------------------
   * DATE HELPERS
   * ------------------------------------------------
   */

  const formatDate = (date) => {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const addDaysToDateString = (
    dateString,
    days
  ) => {
    const [
      year,
      month,
      day,
    ] = dateString
      .split("-")
      .map(Number);

    const date = new Date(
      year,
      month - 1,
      day
    );

    date.setDate(
      date.getDate() + days
    );

    return formatDate(date);
  };

  const getWeekStart = (date) => {
    const result =
      new Date(date);

    const day =
      result.getDay();

    result.setDate(
      result.getDate() - day
    );

    result.setHours(
      0,
      0,
      0,
      0
    );

    return result;
  };

  const getMonthStart = (date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
  };

  const getMonthEnd = (date) => {
    return new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    );
  };

  const getMinutes = (
    time
  ) => {
    const [
      hours,
      minutes,
    ] = time
      .split(":")
      .map(Number);

    return (
      hours * 60 +
      minutes
    );
  };

  const minutesToTime = (
    minutes
  ) => {
    const safeMinutes =
      Math.max(
        0,
        Math.min(
          1439,
          minutes
        )
      );

    const hours =
      Math.floor(
        safeMinutes / 60
      );

    const remainingMinutes =
      safeMinutes % 60;

    return `${String(
      hours
    ).padStart(2, "0")}:${String(
      remainingMinutes
    ).padStart(2, "0")}`;
  };

  /*
   * ------------------------------------------------
   * OPEN EVENT FORM
   * ------------------------------------------------
   */

  const openCreateForm = (
    dateString,
    startTime = "09:00",
    endTime = "10:00"
  ) => {
    dispatch({
      type: "SET_EDITING_EVENT",
      payload: {
        id: null,
        title: "",
        date: dateString,
        startTime,
        endTime,
        description: "",
        allDay: false,
        attendees: [],
        recurrence: {
          frequency: "none",
          endType: "until",
          until: "",
          count: null,
          dayOfWeek: null,
          weekOfMonth: null,
          weekdays: [],
          dayOfMonth: null,
          interval: 1,
        },
        reminder: "",
      },
    });
  };

  /*
   * ------------------------------------------------
   * VISIBLE DATES
   * ------------------------------------------------
   */

  const weekStart = useMemo(
    () =>
      getWeekStart(
        selectedDate
      ),
    [selectedDate]
  );

  const weekDates = useMemo(() => {
    return Array.from(
      { length: 7 },
      (_, index) => {
        const date =
          new Date(
            weekStart
          );

        date.setDate(
          date.getDate() + index
        );

        return date;
      }
    );
  }, [weekStart]);

  const monthDates = useMemo(() => {
    const start =
      getMonthStart(
        selectedDate
      );

    const end =
      getMonthEnd(
        selectedDate
      );

    const firstDay =
      start.getDay();

    const totalDays =
      end.getDate();

    const dates = [];

    for (
      let index = 0;
      index < firstDay;
      index++
    ) {
      const date =
        new Date(start);

      date.setDate(
        date.getDate() -
          (firstDay - index)
      );

      dates.push(date);
    }

    for (
      let day = 1;
      day <= totalDays;
      day++
    ) {
      dates.push(
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          day
        )
      );
    }

    while (
      dates.length % 7 !== 0
    ) {
      const date =
        new Date(
          dates[
            dates.length - 1
          ]
        );

      date.setDate(
        date.getDate() + 1
      );

      dates.push(date);
    }

    return dates;
  }, [selectedDate]);

  /*
   * ------------------------------------------------
   * VISIBLE RANGE
   * ------------------------------------------------
   */

  const visibleRange =
    useMemo(() => {
      if (view === "week") {
        const start =
          new Date(
            weekStart
          );

        const end =
          new Date(
            weekStart
          );

        end.setDate(
          end.getDate() + 6
        );

        return {
          start,
          end,
        };
      }

      return {
        start: monthDates[0],
        end:
          monthDates[
            monthDates.length - 1
          ],
      };
    }, [
      view,
      weekStart,
      monthDates,
    ]);

  /*
   * ------------------------------------------------
   * RECURRENCE EXPANSION
   * ------------------------------------------------
   */

  const visibleEvents =
    useMemo(() => {
      return expandEventsForRange(
        events || [],
        visibleRange.start,
        visibleRange.end
      );
    }, [
      events,
      visibleRange,
    ]);

  /*
   * ------------------------------------------------
   * EVENT LOOKUP
   * ------------------------------------------------
   */

  const getEventsForDate = (
    dateString
  ) => {
    return visibleEvents.filter(
      (event) =>
        event.date === dateString
    );
  };

  /*
   * ------------------------------------------------
   * NAVIGATION
   * ------------------------------------------------
   */

  const goPrevious = () => {
    const newDate =
      new Date(
        selectedDate
      );

    if (view === "week") {
      newDate.setDate(
        newDate.getDate() - 7
      );
    } else {
      newDate.setMonth(
        newDate.getMonth() - 1
      );
    }

    dispatch({
      type: "SET_SELECTED_DATE",
      payload: newDate,
    });
  };

  const goNext = () => {
    const newDate =
      new Date(
        selectedDate
      );

    if (view === "week") {
      newDate.setDate(
        newDate.getDate() + 7
      );
    } else {
      newDate.setMonth(
        newDate.getMonth() + 1
      );
    }

    dispatch({
      type: "SET_SELECTED_DATE",
      payload: newDate,
    });
  };

  const goToday = () => {
    dispatch({
      type: "SET_SELECTED_DATE",
      payload: new Date(),
    });
  };

  /*
   * ------------------------------------------------
   * DRAG CREATE
   * ------------------------------------------------
   */

  const {
    isDragging,
    dragStart,
    dragEnd,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  } = useDragInteraction();

  useEffect(() => {
    if (
      !isDragging ||
      !dragStart ||
      !dragEnd
    ) {
      return;
    }

    if (
      dragPreviewFrame.current
    ) {
      cancelAnimationFrame(
        dragPreviewFrame.current
      );
    }

    dragPreviewFrame.current =
      requestAnimationFrame(() => {
        setDragPreview({
          start: dragStart,
          end: dragEnd,
        });
      });

    return () => {
      if (
        dragPreviewFrame.current
      ) {
        cancelAnimationFrame(
          dragPreviewFrame.current
        );
      }
    };
  }, [
    isDragging,
    dragStart,
    dragEnd,
  ]);

  const finishCreateDrag = () => {
    if (
      !dragStart ||
      !dragEnd
    ) {
      cancelDrag();
      setDragPreview(null);
      return;
    }

    onCreateFromDrag?.(
      dragStart,
      dragEnd
    );

    endDrag();

    setDragPreview(null);
  };

  /*
   * ------------------------------------------------
   * EVENT OVERLAP LAYOUT
   * ------------------------------------------------
   */

  const getOverlapLayout = (
    dayEvents
  ) => {
    const sortedEvents = [
      ...dayEvents,
    ].sort(
      (a, b) => {
        const startDifference =
          getMinutes(
            a.startTime
          ) -
          getMinutes(
            b.startTime
          );

        if (
          startDifference !== 0
        ) {
          return startDifference;
        }

        return (
          getMinutes(
            b.endTime
          ) -
          getMinutes(
            a.endTime
          )
        );
      }
    );

    const groups = [];

    sortedEvents.forEach(
      (event) => {
        const start =
          getMinutes(
            event.startTime
          );

        const end =
          getMinutes(
            event.endTime
          );

        let groupFound = false;

        for (
          const group of groups
        ) {
          const overlapsGroup =
            group.some(
              (groupEvent) => {
                const groupStart =
                  getMinutes(
                    groupEvent.startTime
                  );

                const groupEnd =
                  getMinutes(
                    groupEvent.endTime
                  );

                return (
                  start <
                    groupEnd &&
                  end >
                    groupStart
                );
              }
            );

          if (
            overlapsGroup
          ) {
            group.push(event);
            groupFound = true;
            break;
          }
        }

        if (!groupFound) {
          groups.push([
            event,
          ]);
        }
      }
    );

    const result = [];

    groups.forEach(
      (group) => {
        const columns = [];

        group.forEach(
          (event) => {
            const start =
              getMinutes(
                event.startTime
              );

            const end =
              getMinutes(
                event.endTime
              );

            let columnIndex =
              columns.findIndex(
                (columnEnd) =>
                  columnEnd <=
                  start
              );

            if (
              columnIndex === -1
            ) {
              columnIndex =
                columns.length;

              columns.push(end);
            } else {
              columns[
                columnIndex
              ] = end;
            }

            result.push({
              event,
              column:
                columnIndex,
              totalColumns:
                0,
            });
          }
        );

        const totalColumns =
          columns.length;

        result
          .filter(
            (item) =>
              group.includes(
                item.event
              )
          )
          .forEach(
            (item) => {
              item.totalColumns =
                totalColumns;
            }
          );
      }
    );

    return result;
  };

  /*
   * ------------------------------------------------
   * MOVE EVENT BY POINTER
   * ------------------------------------------------
   *
   * 15 minutes = 20px
   */

  const createMovedEventPreview = (
    clientX,
    clientY
  ) => {
    const dragData =
      eventDragRef.current;

    if (!dragData) {
      return null;
    }

    const {
      oldEvent,
      startX,
      startY,
      startDayIndex,
      columnWidth,
    } = dragData;

    const deltaX =
      clientX - startX;

    const deltaY =
      clientY - startY;

    const rawMinuteDelta =
      (deltaY / 20) * 15;

    const snappedMinuteDelta =
      Math.round(
        rawMinuteDelta / 15
      ) * 15;

    const oldStart =
      getMinutes(
        oldEvent.startTime
      );

    const oldEnd =
      getMinutes(
        oldEvent.endTime
      );

    const duration =
      oldEnd - oldStart;

    let newStart =
      oldStart +
      snappedMinuteDelta;

    newStart =
      Math.max(
        0,
        Math.min(
          1440 - duration,
          newStart
        )
      );

    let dayOffset = 0;

    if (
      columnWidth > 0
    ) {
      dayOffset =
        Math.round(
          deltaX /
            columnWidth
        );
    }

    const newDayIndex =
      Math.max(
        0,
        Math.min(
          6,
          startDayIndex +
            dayOffset
        )
      );

    const newDate =
      formatDate(
        weekDates[
          newDayIndex
        ]
      );

    return {
      ...oldEvent,

      date:
        newDate,

      startTime:
        minutesToTime(
          newStart
        ),

      endTime:
        minutesToTime(
          newStart +
            duration
        ),
    };
  };

  const handleEventPointerDown = (
    pointerEvent,
    calendarEvent
  ) => {
    if (
      view !== "week" ||
      calendarEvent.allDay
    ) {
      return;
    }

    /*
     * Do not start move when the
     * resize handle was clicked.
     */
    if (
      pointerEvent.target.closest(
        "[data-resize-handle='true']"
      )
    ) {
      return;
    }

    pointerEvent.stopPropagation();

    const currentTarget =
      pointerEvent.currentTarget;

    const parentCell =
      currentTarget.parentElement;

    const cellRect =
      parentCell.getBoundingClientRect();

    const columnWidth =
      cellRect.width;

    const startDayIndex =
      weekDates.findIndex(
        (date) =>
          formatDate(date) ===
          calendarEvent.date
      );

    if (
      startDayIndex === -1
    ) {
      return;
    }

    didEventDragRef.current =
      false;

    eventDragRef.current = {
      oldEvent: calendarEvent,

      startX:
        pointerEvent.clientX,

      startY:
        pointerEvent.clientY,

      startDayIndex,

      columnWidth,
    };

    setIsEventDragging(true);

    setSelectedEventId(
      calendarEvent.id
    );

    currentTarget.setPointerCapture?.(
      pointerEvent.pointerId
    );
  };

  const handleEventPointerMove = (
    pointerEvent
  ) => {
    if (
      isEventResizing
    ) {
      return;
    }

    if (
      !eventDragRef.current ||
      !isEventDragging
    ) {
      return;
    }

    const deltaX =
      pointerEvent.clientX -
      eventDragRef.current.startX;

    const deltaY =
      pointerEvent.clientY -
      eventDragRef.current.startY;

    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {
      didEventDragRef.current =
        true;
    }

    if (
      !didEventDragRef.current
    ) {
      return;
    }

    const movedEvent =
      createMovedEventPreview(
        pointerEvent.clientX,
        pointerEvent.clientY
      );

    if (!movedEvent) {
      return;
    }

    if (
      dragPreviewFrame.current
    ) {
      cancelAnimationFrame(
        dragPreviewFrame.current
      );
    }

    dragPreviewFrame.current =
      requestAnimationFrame(() => {
        setDragPreview({
          event: movedEvent,
        });
      });
  };

  const handleEventPointerUp = (
    pointerEvent
  ) => {
    /*
     * Resize has its own pointer-up
     * handler.
     */
    if (
      isEventResizing
    ) {
      return;
    }

    if (
      !eventDragRef.current
    ) {
      return;
    }

    pointerEvent.stopPropagation();

    const dragData =
      eventDragRef.current;

    const wasDragged =
      didEventDragRef.current;

    const movedEvent =
      wasDragged
        ? createMovedEventPreview(
            pointerEvent.clientX,
            pointerEvent.clientY
          )
        : null;

    eventDragRef.current =
      null;

    setIsEventDragging(false);

    try {
      pointerEvent.currentTarget.releasePointerCapture?.(
        pointerEvent.pointerId
      );
    } catch {
      /*
       * Pointer capture may already
       * have been released.
       */
    }

    if (
      wasDragged &&
      movedEvent
    ) {
      const changed =
        movedEvent.date !==
          dragData.oldEvent.date ||
        movedEvent.startTime !==
          dragData.oldEvent.startTime ||
        movedEvent.endTime !==
          dragData.oldEvent.endTime;

      if (changed) {
        onMoveEvent?.(
          movedEvent,
          dragData.oldEvent
        );

        setMoveAnnouncement(
          `${movedEvent.title} moved to ${movedEvent.date}, ${movedEvent.startTime} to ${movedEvent.endTime}.`
        );
      }
    }

    setDragPreview(null);

    window.setTimeout(() => {
      didEventDragRef.current =
        false;
    }, 0);
  };

  /*
   * ------------------------------------------------
   * RESIZE EVENT
   * ------------------------------------------------
   *
   * 15 minutes = 20px
   *
   * Only the END time changes.
   */

  const createResizePreview = (
    clientY
  ) => {
    const resizeData =
      resizeDragRef.current;

    if (!resizeData) {
      return null;
    }

    const {
      oldEvent,
      startY,
      startTime,
    } = resizeData;

    const deltaY =
      clientY - startY;

    const rawMinuteDelta =
      (deltaY / 20) * 15;

    const snappedMinuteDelta =
      Math.round(
        rawMinuteDelta / 15
      ) * 15;

    const newEnd =
      Math.max(
        startTime + 15,
        Math.min(
          1440,
          startTime +
            snappedMinuteDelta +
            (getMinutes(
              oldEvent.endTime
            ) -
              startTime)
        )
      );

    return {
      ...oldEvent,
      endTime:
        minutesToTime(
          newEnd
        ),
    };
  };

  const handleResizePointerDown = (
    pointerEvent,
    calendarEvent
  ) => {
    if (
      view !== "week" ||
      calendarEvent.allDay
    ) {
      return;
    }

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    didEventResizeRef.current =
      false;

    resizeDragRef.current = {
      oldEvent: calendarEvent,

      startY:
        pointerEvent.clientY,

      startTime:
        getMinutes(
          calendarEvent.startTime
        ),

      pointerId:
        pointerEvent.pointerId,

      target:
        pointerEvent.currentTarget,
    };

    setSelectedEventId(
      calendarEvent.id
    );

    setIsEventResizing(true);

    pointerEvent.currentTarget.setPointerCapture?.(
      pointerEvent.pointerId
    );
  };

  const handleResizePointerMove = (
    pointerEvent
  ) => {
    if (
      !resizeDragRef.current ||
      !isEventResizing
    ) {
      return;
    }

    const deltaY =
      pointerEvent.clientY -
      resizeDragRef.current.startY;

    if (
      Math.abs(deltaY) > 4
    ) {
      didEventResizeRef.current =
        true;
    }

    if (
      !didEventResizeRef.current
    ) {
      return;
    }

    const resizedEvent =
      createResizePreview(
        pointerEvent.clientY
      );

    if (!resizedEvent) {
      return;
    }

    if (
      resizePreviewFrame.current
    ) {
      cancelAnimationFrame(
        resizePreviewFrame.current
      );
    }

    resizePreviewFrame.current =
      requestAnimationFrame(() => {
        setResizePreview({
          event: resizedEvent,
        });
      });
  };

  const handleResizePointerUp = (
    pointerEvent
  ) => {
    if (
      !resizeDragRef.current
    ) {
      return;
    }

    pointerEvent.preventDefault();
    pointerEvent.stopPropagation();

    const resizeData =
      resizeDragRef.current;

    const wasResized =
      didEventResizeRef.current;

    const resizedEvent =
      wasResized
        ? createResizePreview(
            pointerEvent.clientY
          )
        : null;

    resizeDragRef.current =
      null;

    setIsEventResizing(false);

    try {
      pointerEvent.currentTarget.releasePointerCapture?.(
        pointerEvent.pointerId
      );
    } catch {
      /*
       * Pointer capture may already
       * have been released.
       */
    }

    if (
      wasResized &&
      resizedEvent
    ) {
      const changed =
        resizedEvent.endTime !==
        resizeData.oldEvent.endTime;

      if (changed) {
        onMoveEvent?.(
          resizedEvent,
          resizeData.oldEvent
        );

        setMoveAnnouncement(
          `${resizedEvent.title} resized to ${resizedEvent.startTime} to ${resizedEvent.endTime}.`
        );
      }
    }

    setResizePreview(null);

    window.setTimeout(() => {
      didEventResizeRef.current =
        false;
    }, 0);
  };

  /*
   * ------------------------------------------------
   * KEYBOARD MOVE
   * ------------------------------------------------
   */

  const moveEventWithKeyboard = (
    calendarEvent,
    direction
  ) => {
    const oldEvent =
      calendarEvent;

    const movedEvent = {
      ...oldEvent,
    };

    if (oldEvent.allDay) {
      if (
        direction === "left"
      ) {
        movedEvent.date =
          addDaysToDateString(
            oldEvent.date,
            -1
          );
      }

      if (
        direction === "right"
      ) {
        movedEvent.date =
          addDaysToDateString(
            oldEvent.date,
            1
          );
      }
    } else {
      const oldStart =
        getMinutes(
          oldEvent.startTime
        );

      const oldEnd =
        getMinutes(
          oldEvent.endTime
        );

      const duration =
        oldEnd - oldStart;

      let newStart =
        oldStart;

      if (
        direction === "up"
      ) {
        newStart -= 15;
      }

      if (
        direction === "down"
      ) {
        newStart += 15;
      }

      if (
        direction === "left"
      ) {
        movedEvent.date =
          addDaysToDateString(
            oldEvent.date,
            -1
          );
      }

      if (
        direction === "right"
      ) {
        movedEvent.date =
          addDaysToDateString(
            oldEvent.date,
            1
          );
      }

      newStart =
        Math.max(
          0,
          Math.min(
            1440 - duration,
            newStart
          )
        );

      movedEvent.startTime =
        minutesToTime(
          newStart
        );

      movedEvent.endTime =
        minutesToTime(
          newStart + duration
        );
    }

    if (
      movedEvent.date ===
        oldEvent.date &&
      movedEvent.startTime ===
        oldEvent.startTime &&
      movedEvent.endTime ===
        oldEvent.endTime
    ) {
      return;
    }

    onMoveEvent?.(
      movedEvent,
      oldEvent
    );

    setSelectedEventId(
      movedEvent.id
    );

    const timeText =
      movedEvent.allDay
        ? "all day"
        : `${movedEvent.startTime} to ${movedEvent.endTime}`;

    setMoveAnnouncement(
      `${movedEvent.title} moved to ${movedEvent.date}, ${timeText}.`
    );
  };

  const handleCalendarEventKeyDown = (
    keyboardEvent,
    calendarEvent
  ) => {
    setSelectedEventId(
      calendarEvent.id
    );

    if (
      keyboardEvent.key ===
      "Escape"
    ) {
      keyboardEvent.preventDefault();

      if (
        keyboardMoveMode
      ) {
        setKeyboardMoveMode(
          false
        );

        setMoveAnnouncement(
          "Move mode cancelled."
        );
      }

      return;
    }

    if (
      keyboardEvent.key ===
        "Enter" ||
      keyboardEvent.key === " "
    ) {
      keyboardEvent.preventDefault();

      if (
        keyboardMoveMode
      ) {
        setKeyboardMoveMode(
          false
        );

        setMoveAnnouncement(
          "Move mode ended."
        );

        return;
      }

      onViewEvent?.(
        calendarEvent
      );

      return;
    }

    if (
      keyboardEvent.key.toLowerCase() ===
      "m"
    ) {
      keyboardEvent.preventDefault();

      setKeyboardMoveMode(
        true
      );

      setMoveAnnouncement(
        "Move mode enabled. Use arrow keys to move the event. Press Escape to cancel."
      );

      return;
    }

    if (
      !keyboardMoveMode
    ) {
      return;
    }

    if (
      keyboardEvent.key ===
      "ArrowUp"
    ) {
      keyboardEvent.preventDefault();

      if (
        !calendarEvent.allDay
      ) {
        moveEventWithKeyboard(
          calendarEvent,
          "up"
        );
      }

      return;
    }

    if (
      keyboardEvent.key ===
      "ArrowDown"
    ) {
      keyboardEvent.preventDefault();

      if (
        !calendarEvent.allDay
      ) {
        moveEventWithKeyboard(
          calendarEvent,
          "down"
        );
      }

      return;
    }

    if (
      keyboardEvent.key ===
      "ArrowLeft"
    ) {
      keyboardEvent.preventDefault();

      moveEventWithKeyboard(
        calendarEvent,
        "left"
      );

      return;
    }

    if (
      keyboardEvent.key ===
      "ArrowRight"
    ) {
      keyboardEvent.preventDefault();

      moveEventWithKeyboard(
        calendarEvent,
        "right"
      );
    }
  };

  const handleEventFocus = (
    calendarEvent
  ) => {
    setSelectedEventId(
      calendarEvent.id
    );
  };

  /*
   * ------------------------------------------------
   * ESCAPE
   * ------------------------------------------------
   */

  useEffect(() => {
    const handleEscape = (
      keyboardEvent
    ) => {
      if (
        keyboardEvent.key !==
        "Escape"
      ) {
        return;
      }

      if (
        resizeDragRef.current
      ) {
        resizeDragRef.current =
          null;

        setIsEventResizing(
          false
        );

        setResizePreview(
          null
        );

        didEventResizeRef.current =
          false;

        setMoveAnnouncement(
          "Resize cancelled."
        );

        return;
      }

      if (
        eventDragRef.current
      ) {
        eventDragRef.current =
          null;

        setIsEventDragging(
          false
        );

        setDragPreview(
          null
        );

        didEventDragRef.current =
          false;

        setMoveAnnouncement(
          "Move cancelled."
        );

        return;
      }

      setKeyboardMoveMode(
        false
      );

      setDragPreview(
        null
      );

      setResizePreview(
        null
      );

      setMoveAnnouncement(
        "Move cancelled."
      );
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /*
   * ------------------------------------------------
   * DATE TITLE
   * ------------------------------------------------
   */

  const getHeaderTitle = () => {
    if (
      view === "week"
    ) {
      const start =
        weekDates[0];

      const end =
        weekDates[6];

      return `${start.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
        }
      )} - ${end.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      )}`;
    }

    return selectedDate.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  /*
   * ------------------------------------------------
   * EVENT CLASS
   * ------------------------------------------------
   */

  const getEventClassName = (
    calendarEvent
  ) => {
    const selected =
      selectedEventId ===
      calendarEvent.id;

    const moving =
      keyboardMoveMode &&
      selected;

    const dragging =
      isEventDragging &&
      selected;

    const resizing =
      isEventResizing &&
      selected;

    return `
      absolute
      overflow-hidden
      rounded-md
      border
      px-2
      py-1
      text-left
      text-xs
      shadow-sm
      cursor-grab
      transition
      ${
        selected
          ? "border-slate-900 ring-2 ring-slate-300"
          : "border-slate-300"
      }
      ${
        moving
          ? "ring-2 ring-blue-400"
          : ""
      }
      ${
        dragging
          ? "cursor-grabbing opacity-60"
          : ""
      }
      ${
        resizing
          ? "opacity-70"
          : ""
      }
      bg-blue-50
      text-blue-900
      hover:bg-blue-100
    `;
  };

  /*
   * ------------------------------------------------
   * RENDER
   * ------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-slate-100">
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {moveAnnouncement}
      </div>

      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Calendar
            </h1>

            <p className="text-sm text-slate-500">
              {getHeaderTitle()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={
                goPrevious
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={
                goToday
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Today
            </button>

            <button
              type="button"
              onClick={
                goNext
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Next
            </button>

            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "SET_VIEW",
                  payload: "week",
                })
              }
              className={`rounded-lg px-3 py-2 text-sm ${
                view === "week"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white"
              }`}
            >
              Week
            </button>

            <button
              type="button"
              onClick={() =>
                dispatch({
                  type: "SET_VIEW",
                  payload: "month",
                })
              }
              className={`rounded-lg px-3 py-2 text-sm ${
                view === "month"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white"
              }`}
            >
              Month
            </button>

            <select
              value={timezone}
              onChange={(
                event
              ) =>
                dispatch({
                  type: "SET_TIMEZONE",
                  payload:
                    event.target.value,
                })
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              aria-label="Timezone"
            >
              <option value="UTC">
                UTC
              </option>

              <option value="Asia/Kolkata">
                Asia/Kolkata
              </option>

              <option value="America/New_York">
                America/New_York
              </option>

              <option value="America/Los_Angeles">
                America/Los_Angeles
              </option>

              <option value="Europe/London">
                Europe/London
              </option>

              <option value="Europe/Berlin">
                Europe/Berlin
              </option>

              <option value="Asia/Tokyo">
                Asia/Tokyo
              </option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        {view === "week" && (
          <div
            role="grid"
            aria-label="Weekly calendar"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid grid-cols-8 border-b border-slate-200">
              <div className="border-r border-slate-200 p-2 text-xs text-slate-400">
                Time
              </div>

              {weekDates.map(
                (date) => (
                  <div
                    key={formatDate(
                      date
                    )}
                    className="border-r border-slate-200 p-2 text-center text-sm font-medium text-slate-700"
                  >
                    {date.toLocaleDateString(
                      "en-US",
                      {
                        weekday:
                          "short",
                        month:
                          "short",
                        day: "numeric",
                      }
                    )}
                  </div>
                )
              )}
            </div>

            <div className="grid grid-cols-8">
              <div className="border-r border-slate-200">
                {Array.from(
                  {
                    length: 24,
                  },
                  (_, hour) => (
                    <div
                      key={hour}
                      className="h-20 border-b border-slate-100 px-2 pt-1 text-xs text-slate-400"
                    >
                      {String(
                        hour
                      ).padStart(
                        2,
                        "0"
                      )}
                      :00
                    </div>
                  )
                )}
              </div>

              {weekDates.map(
                (date) => {
                  const dateString =
                    formatDate(
                      date
                    );

                  const dayEvents =
                    getEventsForDate(
                      dateString
                    ).filter(
                      (event) =>
                        !event.allDay
                    );

                  const layouts =
                    getOverlapLayout(
                      dayEvents
                    );

                  return (
                    <div
                      key={
                        dateString
                      }
                      role="gridcell"
                      aria-label={
                        dateString
                      }
                      className="relative border-r border-slate-200"
                    >
                      {Array.from(
                        {
                          length: 24,
                        },
                        (_, hour) => {
                          const startTime =
                            `${String(
                              hour
                            ).padStart(
                              2,
                              "0"
                            )}:00`;

                          const endTime =
                            `${String(
                              Math.min(
                                hour + 1,
                                24
                              )
                            ).padStart(
                              2,
                              "0"
                            )}:00`;

                          return (
                            <div
                              key={hour}
                              className="h-20 border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                              onPointerDown={(
                                pointerEvent
                              ) => {
                                if (
                                  isEventResizing ||
                                  isEventDragging
                                ) {
                                  return;
                                }

                                didDragRef.current =
                                  false;

                                startDrag(
                                  {
                                    date:
                                      dateString,
                                    time:
                                      startTime,
                                  },
                                  pointerEvent.clientY
                                );
                              }}
                              onPointerMove={(
                                pointerEvent
                              ) => {
                                if (
                                  !isDragging ||
                                  isEventResizing ||
                                  isEventDragging
                                ) {
                                  return;
                                }

                                didDragRef.current =
                                  true;

                                updateDrag(
                                  {
                                    date:
                                      dateString,
                                    time:
                                      startTime,
                                  },
                                  pointerEvent.clientY
                                );
                              }}
                              onPointerUp={() => {
                                if (
                                  !isDragging
                                ) {
                                  return;
                                }

                                if (
                                  didDragRef.current
                                ) {
                                  finishCreateDrag();
                                } else {
                                  cancelDrag();

                                  setDragPreview(
                                    null
                                  );

                                  openCreateForm(
                                    dateString,
                                    startTime,
                                    endTime
                                  );
                                }

                                didDragRef.current =
                                  false;
                              }}
                            />
                          );
                        }
                      )}

                      {layouts.map(
                        ({
                          event:
                            calendarEvent,
                          column,
                          totalColumns,
                        }) => {
                          const start =
                            getMinutes(
                              calendarEvent.startTime
                            );

                          const end =
                            getMinutes(
                              calendarEvent.endTime
                            );

                          const top =
                            (start /
                              60) *
                            80;

                          const height =
                            Math.max(
                              20,
                              ((end -
                                start) /
                                60) *
                                80
                            );

                          const width =
                            100 /
                            totalColumns;

                          const left =
                            column *
                            width;

                          const movePreviewEvent =
                            dragPreview?.event &&
                            String(
                              dragPreview.event.id
                            ) ===
                              String(
                                calendarEvent.id
                              )
                              ? dragPreview.event
                              : null;

                          const resizePreviewEvent =
                            resizePreview?.event &&
                            String(
                              resizePreview.event.id
                            ) ===
                              String(
                                calendarEvent.id
                              )
                              ? resizePreview.event
                              : null;

                          /*
                           * Resize preview has
                           * priority over move
                           * preview.
                           */
                          const displayEvent =
                            resizePreviewEvent ||
                            movePreviewEvent ||
                            calendarEvent;

                          const displayStart =
                            getMinutes(
                              displayEvent.startTime
                            );

                          const displayEnd =
                            getMinutes(
                              displayEvent.endTime
                            );

                          const displayTop =
                            (displayStart /
                              60) *
                            80;

                          const displayHeight =
                            Math.max(
                              20,
                              ((displayEnd -
                                displayStart) /
                                60) *
                                80
                            );

                          const isOriginalBeingMoved =
                            isEventDragging &&
                            movePreviewEvent &&
                            displayEvent.date !==
                              dateString;

                          if (
                            isOriginalBeingMoved
                          ) {
                            return null;
                          }

                          return (
                            <div
                              key={
                                calendarEvent.id
                              }
                              role="gridcell"
                              tabIndex={0}
                              aria-selected={
                                selectedEventId ===
                                calendarEvent.id
                              }
                              aria-label={`${calendarEvent.title}, ${displayEvent.date}, ${displayEvent.startTime} to ${displayEvent.endTime}`}
                              onFocus={() =>
                                handleEventFocus(
                                  calendarEvent
                                )
                              }
                              onKeyDown={(
                                keyboardEvent
                              ) =>
                                handleCalendarEventKeyDown(
                                  keyboardEvent,
                                  calendarEvent
                                )
                              }
                              onPointerDown={(
                                pointerEvent
                              ) =>
                                handleEventPointerDown(
                                  pointerEvent,
                                  calendarEvent
                                )
                              }
                              onPointerMove={
                                handleEventPointerMove
                              }
                              onPointerUp={(
                                pointerEvent
                              ) =>
                                handleEventPointerUp(
                                  pointerEvent
                                )
                              }
                              onClick={(
                                pointerEvent
                              ) => {
                                pointerEvent.stopPropagation();

                                if (
                                  didEventDragRef.current ||
                                  didEventResizeRef.current
                                ) {
                                  return;
                                }

                                onViewEvent?.(
                                  calendarEvent
                                );
                              }}
                              className={getEventClassName(
                                calendarEvent
                              )}
                              style={{
                                top:
                                  resizePreviewEvent ||
                                  movePreviewEvent
                                    ? displayTop
                                    : top,

                                height:
                                  resizePreviewEvent ||
                                  movePreviewEvent
                                    ? displayHeight
                                    : height,

                                left:
                                  movePreviewEvent
                                    ? `${
                                        dateString ===
                                        displayEvent.date
                                          ? left
                                          : 0
                                      }%`
                                    : `${left}%`,

                                width:
                                  movePreviewEvent
                                    ? `${
                                        dateString ===
                                        displayEvent.date
                                          ? width
                                          : 100
                                      }%`
                                    : `${width}%`,

                                zIndex:
                                  resizePreviewEvent ||
                                  movePreviewEvent
                                    ? 30
                                    : 10,
                              }}
                            >
                              <div className="pointer-events-none truncate">
                                {
                                  displayEvent.title
                                }
                              </div>

                              {(movePreviewEvent ||
                                resizePreviewEvent) && (
                                <div className="pointer-events-none mt-1 text-[10px] text-blue-700">
                                  {
                                    displayEvent.startTime
                                  }
                                  {" - "}
                                  {
                                    displayEvent.endTime
                                  }
                                </div>
                              )}

                              {/*
                               * RESIZE HANDLE
                               *
                               * Only visible for
                               * normal Week view
                               * timed events.
                               */}
                              {!movePreviewEvent &&
                                !resizePreviewEvent && (
                                  <div
                                    data-resize-handle="true"
                                    role="separator"
                                    aria-label={`Resize ${calendarEvent.title}`}
                                    title="Drag to resize"
                                    onPointerDown={(
                                      pointerEvent
                                    ) =>
                                      handleResizePointerDown(
                                        pointerEvent,
                                        calendarEvent
                                      )
                                    }
                                    onPointerMove={
                                      handleResizePointerMove
                                    }
                                    onPointerUp={(
                                      pointerEvent
                                    ) =>
                                      handleResizePointerUp(
                                        pointerEvent
                                      )
                                    }
                                    className="absolute bottom-0 left-0 right-0 z-20 flex h-3 cursor-ns-resize items-end justify-center"
                                  >
                                    <div className="mb-0.5 h-1 w-8 rounded-full bg-blue-400 opacity-70 hover:bg-blue-600" />
                                  </div>
                                )}
                            </div>
                          );
                        }
                      )}

                      {dragPreview &&
                        dragPreview.event &&
                        dragPreview.event.date ===
                          dateString && (
                          <div
                            className="pointer-events-none absolute left-0 right-0 rounded-md border border-dashed border-blue-500 bg-blue-100/70"
                            style={{
                              top:
                                (getMinutes(
                                  dragPreview
                                    .event
                                    .startTime
                                ) /
                                  60) *
                                80,

                              height:
                                Math.max(
                                  20,
                                  ((getMinutes(
                                    dragPreview
                                      .event
                                      .endTime
                                  ) -
                                    getMinutes(
                                      dragPreview
                                        .event
                                        .startTime
                                    )) /
                                    60) *
                                    80
                                ),
                            }}
                          />
                        )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {view === "month" && (
          <div
            role="grid"
            aria-label="Monthly calendar"
            className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day) => (
                <div
                  key={day}
                  className="border-b border-r border-slate-200 p-2 text-center text-xs font-semibold text-slate-500"
                >
                  {day}
                </div>
              )
            )}

            {monthDates.map(
              (date) => {
                const dateString =
                  formatDate(
                    date
                  );

                const dayEvents =
                  getEventsForDate(
                    dateString
                  );

                const isCurrentMonth =
                  date.getMonth() ===
                  selectedDate.getMonth();

                return (
                  <div
                    key={dateString}
                    role="gridcell"
                    aria-label={
                      dateString
                    }
                    className={`min-h-32 cursor-pointer border-b border-r border-slate-200 p-2 hover:bg-slate-50 ${
                      isCurrentMonth
                        ? "bg-white"
                        : "bg-slate-50"
                    }`}
                    onClick={() => {
                      openCreateForm(
                        dateString,
                        "09:00",
                        "10:00"
                      );
                    }}
                  >
                    <div className="mb-2 text-xs font-medium text-slate-500">
                      {date.getDate()}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.map(
                        (
                          calendarEvent
                        ) => (
                          <div
                            key={
                              calendarEvent.id
                            }
                            role="button"
                            tabIndex={0}
                            aria-selected={
                              selectedEventId ===
                              calendarEvent.id
                            }
                            aria-label={`${calendarEvent.title}, ${calendarEvent.date}`}
                            onFocus={() =>
                              handleEventFocus(
                                calendarEvent
                              )
                            }
                            onKeyDown={(
                              keyboardEvent
                            ) => {
                              keyboardEvent.stopPropagation();

                              handleCalendarEventKeyDown(
                                keyboardEvent,
                                calendarEvent
                              );
                            }}
                            onClick={(
                              pointerEvent
                            ) => {
                              pointerEvent.stopPropagation();

                              onViewEvent?.(
                                calendarEvent
                              );
                            }}
                            className={`rounded-md border px-2 py-1 text-xs ${
                              selectedEventId ===
                              calendarEvent.id
                                ? "border-slate-900 ring-2 ring-slate-300"
                                : "border-slate-200"
                            } ${
                              calendarEvent.allDay
                                ? "bg-purple-50 text-purple-900"
                                : "bg-blue-50 text-blue-900"
                            } cursor-pointer hover:bg-slate-100`}
                          >
                            <div className="font-medium">
                              {
                                calendarEvent.title
                              }
                            </div>

                            {!calendarEvent.allDay && (
                              <div className="text-[10px] text-slate-500">
                                {
                                  calendarEvent.startTime
                                }
                                -
                                {
                                  calendarEvent.endTime
                                }
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {keyboardMoveMode && (
          <div
            className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
            role="status"
          >
            <strong>
              Move mode:
            </strong>{" "}
            Use ↑ ↓ to move 15 minutes and
            ← → to move one day. Press
            Escape to cancel.
          </div>
        )}

        {isEventDragging && (
          <div
            className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
            role="status"
          >
            Dragging event — release to move.
            Press Escape to cancel.
          </div>
        )}

        {isEventResizing && (
          <div
            className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            role="status"
          >
            Resizing event — release to save.
            Press Escape to cancel.
          </div>
        )}
      </main>
    </div>
  );
}

export default Calendar;