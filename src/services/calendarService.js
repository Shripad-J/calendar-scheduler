 
import axiosInstance from "./axiosInstance";

/*
 * -----------------------------
 * Get all events
 * -----------------------------
 */

export const getEvents = async () => {
  const allTodos = [];

  let skip = 0;
  const limit = 100;

  while (true) {
    const response =
      await axiosInstance.get(
        `/todos?limit=${limit}&skip=${skip}`
      );

    const todos =
      response.data.todos;

    allTodos.push(...todos);

    if (
      allTodos.length >=
      response.data.total
    ) {
      break;
    }

    skip += limit;
  }

  return allTodos.map((todo) => {
    const eventDate =
      new Date(2026, 0, 1);

    eventDate.setDate(todo.id);

    const year =
      eventDate.getFullYear();

    const month =
      String(
        eventDate.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        eventDate.getDate()
      ).padStart(2, "0");

    const hour =
      (todo.id * 2) % 24;

    const startHour =
      String(hour).padStart(
        2,
        "0"
      );

    const endHour =
      String(
        (hour + 1) % 24
      ).padStart(2, "0");

    return {
      id: `todo-${todo.id}`,

      apiId: todo.id,

      title: todo.todo,

      date:
        `${year}-${month}-${day}`,

      startTime:
        `${startHour}:00`,

      endTime:
        `${endHour}:00`,

      description:
        todo.completed
          ? "Completed task"
          : "Pending task",

      organizerId:
        todo.userId,

      allDay: false,

      attendees: [],

      recurrence: null,

      reminder: 0,

      /*
       * These events actually come
       * from DummyJSON.
       */
      isLocal: false,
    };
  });
};

/*
 * -----------------------------
 * Create event
 * -----------------------------
 */

export const createEvent =
  async (eventData) => {
    try {
      const response =
        await axiosInstance.post(
          "/todos/add",
          {
            todo:
              eventData.title,

            completed: false,

            userId: 1,
          }
        );

      return response.data;
    } catch (error) {
      throw createCalendarError(
        error,
        "Failed to create event"
      );
    }
  };

/*
 * -----------------------------
 * Get API ID
 * -----------------------------
 */

const getApiId = (
  eventId,
  eventData
) => {
  /*
   * If apiId exists, use it.
   */
  if (
    eventData?.apiId !==
      null &&
    eventData?.apiId !==
      undefined
  ) {
    return eventData.apiId;
  }

  /*
   * Existing DummyJSON event:
   *
   * todo-123
   *
   * becomes:
   *
   * 123
   */
  const id = String(eventId);

  if (
    id.startsWith("todo-")
  ) {
    return id.replace(
      "todo-",
      ""
    );
  }

  return eventId;
};

/*
 * -----------------------------
 * Update event
 * -----------------------------
 */

export const updateEvent =
  async (
    eventId,
    eventData
  ) => {
    try {
      /*
       * Newly created events are
       * simulated by DummyJSON.
       *
       * They do not really exist
       * on the server.
       *
       * Therefore, do not send
       * PUT request for them.
       */
      if (
        String(eventId).startsWith(
          "event-"
        )
      ) {
        return {
          ...eventData,

          id: eventId,

          apiId:
            eventData?.apiId ??
            null,

          isLocal: true,
        };
      }

      /*
       * Existing events come from
       * DummyJSON and can use PUT.
       */
      const apiId =
        getApiId(
          eventId,
          eventData
        );

      const response =
        await axiosInstance.put(
          `/todos/${apiId}`,
          {
            todo:
              eventData.title,

            completed: false,
          }
        );

      return response.data;
    } catch (error) {
      throw createCalendarError(
        error,
        "Failed to update event"
      );
    }
  };

/*
 * -----------------------------
 * Delete event
 * -----------------------------
 */

export const deleteEvent =
  async (
    eventId,
    eventData
  ) => {
    try {
      /*
       * Newly created events are
       * local because DummyJSON
       * does not permanently store
       * /todos/add results.
       *
       * So simply tell the caller
       * that deletion succeeded.
       */
      if (
        String(eventId).startsWith(
          "event-"
        )
      ) {
        return {
          success: true,

          id: eventId,

          local: true,
        };
      }

      /*
       * Existing DummyJSON event.
       */
      const apiId =
        getApiId(
          eventId,
          eventData
        );

      const response =
        await axiosInstance.delete(
          `/todos/${apiId}`
        );

      return response.data;
    } catch (error) {
      throw createCalendarError(
        error,
        "Failed to delete event"
      );
    }
  };

/*
 * -----------------------------
 * Consistent error shape
 * -----------------------------
 */

const createCalendarError = (
  error,
  fallbackMessage
) => {
  const status =
    error?.response?.status ??
    null;

  const serverMessage =
    error?.response?.data?.message;

  const message =
    serverMessage ||
    error?.message ||
    fallbackMessage;

  const calendarError =
    new Error(message);

  calendarError.status =
    status;

  calendarError.code =
    error?.code ||
    "CALENDAR_ERROR";

  calendarError.data =
    error?.response?.data ||
    null;

  return calendarError;
};
