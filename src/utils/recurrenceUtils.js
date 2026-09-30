/*
 * Recurrence utilities
 *
 * Supported:
 * - Daily
 * - Weekly
 * - Monthly by day number
 * - Monthly by week + weekday
 * - Until date
 * - Count
 * - Exceptions ("this occurrence")
 * - Following-series events
 *
 * Only occurrences inside the visible range are generated.
 */

const DATE_FORMATTER = new Intl.DateTimeFormat(
  "en-CA",
  {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }
);

/*
 * ------------------------------------------------
 * DATE HELPERS
 * ------------------------------------------------
 */

const parseDate = (dateString) => {
  if (!dateString) {
    return null;
  }

  const parts = String(dateString)
    .split("-")
    .map(Number);

  if (
    parts.length !== 3 ||
    parts.some(
      (value) => !Number.isInteger(value)
    )
  ) {
    return null;
  }

  const [year, month, day] = parts;

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  /*
   * Prevent invalid dates such as:
   * 2026-02-31
   */
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const formatDate = (date) => {
  return DATE_FORMATTER.format(date);
};

const addDays = (
  date,
  days
) => {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
};

const addMonths = (
  date,
  months
) => {
  const result = new Date(date);

  result.setUTCMonth(
    result.getUTCMonth() + months
  );

  return result;
};

const daysInMonth = (
  year,
  month
) => {
  return new Date(
    Date.UTC(
      year,
      month + 1,
      0
    )
  ).getUTCDate();
};

/*
 * ------------------------------------------------
 * WEEKDAY
 * ------------------------------------------------
 *
 * JavaScript:
 * 0 = Sunday
 * 1 = Monday
 * ...
 * 6 = Saturday
 */

const getDayOfWeek = (
  date
) => {
  return date.getUTCDay();
};

/*
 * ------------------------------------------------
 * MONTHLY ORDINAL
 * ------------------------------------------------
 *
 * Examples:
 *
 * 2nd Tuesday
 * 3rd Monday
 * Last Friday
 */

const getNthWeekdayOfMonth = (
  year,
  month,
  weekday,
  occurrence
) => {
  if (
    !Number.isInteger(weekday) ||
    weekday < 0 ||
    weekday > 6
  ) {
    return null;
  }

  if (
    !Number.isInteger(occurrence) ||
    occurrence === 0
  ) {
    return null;
  }

  const firstDay = new Date(
    Date.UTC(
      year,
      month,
      1
    )
  );

  const firstWeekday =
    firstDay.getUTCDay();

  /*
   * Positive occurrence:
   *
   * 1 = first
   * 2 = second
   * 3 = third
   * 4 = fourth
   * 5 = fifth
   */

  if (occurrence > 0) {
    const day =
      1 +
      ((weekday -
        firstWeekday +
        7) %
        7) +
      (occurrence - 1) * 7;

    const lastDay =
      daysInMonth(
        year,
        month
      );

    /*
     * Example:
     * There is no 5th Tuesday
     * in this particular month.
     */

    if (day > lastDay) {
      return null;
    }

    return new Date(
      Date.UTC(
        year,
        month,
        day
      )
    );
  }

  /*
   * occurrence <= -1:
   *
   * -1 = last
   *
   * We currently treat any negative
   * value as "last", which matches
   * the project's form representation.
   */

  const lastDay =
    daysInMonth(
      year,
      month
    );

  const lastDate = new Date(
    Date.UTC(
      year,
      month,
      lastDay
    )
  );

  const lastWeekday =
    lastDate.getUTCDay();

  const resultDay =
    lastDay -
    ((lastWeekday -
      weekday +
      7) %
      7);

  return new Date(
    Date.UTC(
      year,
      month,
      resultDay
    )
  );
};

/*
 * ------------------------------------------------
 * RECURRENCE END CONDITION
 * ------------------------------------------------
 */

const isAfterUntil = (
  date,
  recurrence
) => {
  if (
    recurrence?.endType !==
    "until"
  ) {
    return false;
  }

  if (!recurrence.until) {
    return false;
  }

  const untilDate =
    parseDate(
      recurrence.until
    );

  if (!untilDate) {
    return false;
  }

  return date > untilDate;
};

/*
 * ------------------------------------------------
 * WEEKDAY NORMALIZATION
 * ------------------------------------------------
 */

const getWeeklyDays = (
  recurrence,
  startDate
) => {
  /*
   * Newer format:
   *
   * weekdays: [1, 2, 3]
   */

  if (
    Array.isArray(
      recurrence?.weekdays
    ) &&
    recurrence.weekdays.length > 0
  ) {
    const weekdays =
      recurrence.weekdays
        .map(Number)
        .filter(
          (day) =>
            Number.isInteger(day) &&
            day >= 0 &&
            day <= 6
        );

    if (weekdays.length > 0) {
      return [
        ...new Set(
          weekdays
        ),
      ].sort(
        (a, b) => a - b
      );
    }
  }

  /*
   * Existing project format:
   *
   * dayOfWeek: number
   */

  if (
    recurrence?.dayOfWeek !==
      null &&
    recurrence?.dayOfWeek !==
      undefined &&
    recurrence?.dayOfWeek !==
      ""
  ) {
    const day =
      Number(
        recurrence.dayOfWeek
      );

    if (
      Number.isInteger(day) &&
      day >= 0 &&
      day <= 6
    ) {
      return [day];
    }
  }

  /*
   * Default:
   *
   * Use the weekday of the
   * original event.
   */

  return [
    getDayOfWeek(
      startDate
    ),
  ];
};

/*
 * ------------------------------------------------
 * MONTHLY OCCURRENCE
 * ------------------------------------------------
 */

const getMonthlyDate = (
  year,
  month,
  startDate,
  recurrence
) => {
  /*
   * Option 1:
   *
   * Specific day of month.
   *
   * Example:
   *
   * dayOfMonth = 15
   */

  const rawDayOfMonth =
    recurrence?.dayOfMonth;

  const dayOfMonth =
    Number(
      rawDayOfMonth
    );

  if (
    Number.isInteger(
      dayOfMonth
    ) &&
    dayOfMonth >= 1 &&
    dayOfMonth <= 31
  ) {
    const lastDay =
      daysInMonth(
        year,
        month
      );

    /*
     * Month-end handling.
     *
     * 31st:
     *
     * January 31
     * February 28/29
     * March 31
     */

    const actualDay =
      Math.min(
        dayOfMonth,
        lastDay
      );

    return new Date(
      Date.UTC(
        year,
        month,
        actualDay
      )
    );
  }

  /*
   * Option 2:
   *
   * weekOfMonth + dayOfWeek
   *
   * Example:
   *
   * 2nd Tuesday
   */

  const weekOfMonth =
    Number(
      recurrence?.weekOfMonth
    );

  let dayOfWeek =
    recurrence?.dayOfWeek;

  if (
    dayOfWeek ===
      null ||
    dayOfWeek ===
      undefined ||
    dayOfWeek === ""
  ) {
    dayOfWeek =
      getDayOfWeek(
        startDate
      );
  }

  dayOfWeek =
    Number(dayOfWeek);

  if (
    !Number.isInteger(
      dayOfWeek
    ) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6
  ) {
    return null;
  }

  if (
    !Number.isInteger(
      weekOfMonth
    ) ||
    weekOfMonth === 0
  ) {
    return null;
  }

  return getNthWeekdayOfMonth(
    year,
    month,
    dayOfWeek,
    weekOfMonth
  );
};

/*
 * ------------------------------------------------
 * SHOULD INCLUDE OCCURRENCE
 * ------------------------------------------------
 */

const shouldIncludeDate = (
  date,
  visibleStart,
  visibleEnd
) => {
  if (
    !date ||
    !visibleStart ||
    !visibleEnd
  ) {
    return false;
  }

  return (
    date >= visibleStart &&
    date <= visibleEnd
  );
};

/*
 * ------------------------------------------------
 * CREATE OCCURRENCE
 * ------------------------------------------------
 */

const createOccurrence = (
  event,
  date,
  occurrenceIndex
) => {
  const dateString =
    formatDate(date);

  return {
    ...event,

    id:
      `${event.id}__occurrence__${dateString}`,

    date: dateString,

    originalEventId:
      event.id,

    originalOccurrenceDate:
      dateString,

    seriesId:
      event.seriesId ||
      event.id,

    occurrenceIndex,

    isOccurrence: true,

    isException: false,
  };
};

/*
 * ------------------------------------------------
 * EXCEPTIONS
 * ------------------------------------------------
 */

const applyExceptions = (
  occurrences
) => {
  /*
   * Exceptions are applied later
   * because this function does not
   * have access to the complete
   * events array.
   */

  return occurrences;
};

/*
 * ------------------------------------------------
 * APPLY EXCEPTIONS TO SERIES
 * ------------------------------------------------ */

const applyEventExceptions = (
  occurrences,
  allEvents,
  seriesEvent
) => {
  return occurrences.flatMap(
    (occurrence) => {
      const exception =
        allEvents.find(
          (event) =>
            event.isException &&
            String(
              event.originalEventId
            ) ===
              String(
                seriesEvent.id
              ) &&
            event.originalOccurrenceDate ===
              occurrence.originalOccurrenceDate
        );

      if (exception) {
        return [
          {
            ...exception,

            id:
              `${seriesEvent.id}__occurrence__${occurrence.originalOccurrenceDate}`,

            originalEventId:
              seriesEvent.id,

            originalOccurrenceDate:
              occurrence.originalOccurrenceDate,

            seriesId:
              seriesEvent.seriesId ||
              seriesEvent.id,

            isOccurrence: true,

            isException: true,

            occurrenceIndex:
              occurrence.occurrenceIndex,
          },
        ];
      }

      return [occurrence];
    }
  );
};

/*
 * ------------------------------------------------
 * EXPAND SINGLE SERIES
 * ------------------------------------------------ */

const expandSingleSeries = (
  event,
  visibleStart,
  visibleEnd
) => {
  const recurrence =
    event.recurrence;

  const startDate =
    parseDate(event.date);

  if (!startDate) {
    return [];
  }

  /*
   * Normal event
   */

  if (
    !recurrence ||
    !recurrence.frequency ||
    recurrence.frequency ===
      "none"
  ) {
    if (
      shouldIncludeDate(
        startDate,
        visibleStart,
        visibleEnd
      )
    ) {
      return [event];
    }

    return [];
  }

  const results = [];

  const frequency =
    String(
      recurrence.frequency
    ).toLowerCase();

  const intervalValue =
    Number(
      recurrence.interval ??
        recurrence.every ??
        1
    );

  const interval =
    Number.isFinite(
      intervalValue
    ) &&
    intervalValue >= 1
      ? Math.floor(
          intervalValue
        )
      : 1;

  const countValue =
    Number(
      recurrence.count
    );

  const countLimit =
    recurrence.endType ===
    "count"
      ? Number.isFinite(
          countValue
        ) &&
        countValue >= 1
        ? Math.floor(
            countValue
          )
        : 1
      : Infinity;

  /*
   * ---------------------------------------------
   * DAILY
   * ---------------------------------------------
   */

  if (
    frequency === "daily"
  ) {
    let occurrenceIndex = 0;

    let currentDate =
      new Date(startDate);

    while (
      occurrenceIndex <
      countLimit
    ) {
      if (
        isAfterUntil(
          currentDate,
          recurrence
        )
      ) {
        break;
      }

      if (
        currentDate >
        visibleEnd
      ) {
        break;
      }

      if (
        shouldIncludeDate(
          currentDate,
          visibleStart,
          visibleEnd
        )
      ) {
        results.push(
          createOccurrence(
            event,
            currentDate,
            occurrenceIndex
          )
        );
      }

      occurrenceIndex += 1;

      currentDate =
        addDays(
          currentDate,
          interval
        );
    }

    return applyExceptions(
      results
    );
  }

  /*
   * ---------------------------------------------
   * WEEKLY
   * ---------------------------------------------
   */

  if (
    frequency === "weekly"
  ) {
    const weekdays =
      getWeeklyDays(
        recurrence,
        startDate
      );

    /*
     * Start from Sunday of the
     * original event's week.
     */

    let weekStart =
      new Date(startDate);

    weekStart.setUTCDate(
      weekStart.getUTCDate() -
        weekStart.getUTCDay()
    );

    let occurrenceIndex = 0;

    while (
      weekStart <=
      visibleEnd
    ) {
      for (
        const weekday of weekdays
      ) {
        const occurrenceDate =
          addDays(
            weekStart,
            weekday
          );

        /*
         * Never create an occurrence
         * before the original event.
         */

        if (
          occurrenceDate <
          startDate
        ) {
          continue;
        }

        /*
         * Until condition.
         */

        if (
          isAfterUntil(
            occurrenceDate,
            recurrence
          )
        ) {
          return applyExceptions(
            results
          );
        }

        /*
         * Count condition.
         */

        if (
          occurrenceIndex >=
          countLimit
        ) {
          return applyExceptions(
            results
          );
        }

        if (
          shouldIncludeDate(
            occurrenceDate,
            visibleStart,
            visibleEnd
          )
        ) {
          results.push(
            createOccurrence(
              event,
              occurrenceDate,
              occurrenceIndex
            )
          );
        }

        occurrenceIndex += 1;
      }

      weekStart =
        addDays(
          weekStart,
          7 * interval
        );
    }

    return applyExceptions(
      results
    );
  }

  /*
   * ---------------------------------------------
   * MONTHLY
   * ---------------------------------------------
   */

  if (
    frequency === "monthly"
  ) {
    /*
     * Always start from the first
     * day of the original event's
     * month.
     */

    let monthDate =
      new Date(startDate);

    monthDate.setUTCDate(1);

    let occurrenceIndex = 0;

    while (
      monthDate <=
      visibleEnd
    ) {
      /*
       * Stop when count is reached.
       */

      if (
        occurrenceIndex >=
        countLimit
      ) {
        break;
      }

      const year =
        monthDate.getUTCFullYear();

      const month =
        monthDate.getUTCMonth();

      const occurrenceDate =
        getMonthlyDate(
          year,
          month,
          startDate,
          recurrence
        );

      /*
       * A monthly ordinal occurrence
       * may not exist.
       *
       * Example:
       * 5th Tuesday in a month.
       */

      if (
        occurrenceDate &&
        occurrenceDate >=
          startDate
      ) {
        /*
         * Until condition.
         */

        if (
          isAfterUntil(
            occurrenceDate,
            recurrence
          )
        ) {
          break;
        }

        /*
         * Only occurrences inside
         * visible range are returned.
         */

        if (
          shouldIncludeDate(
            occurrenceDate,
            visibleStart,
            visibleEnd
          )
        ) {
          results.push(
            createOccurrence(
              event,
              occurrenceDate,
              occurrenceIndex
            )
          );
        }

        occurrenceIndex += 1;
      }

      /*
       * Move by the requested
       * monthly interval.
       *
       * interval = 1:
       * every month
       *
       * interval = 2:
       * every 2 months
       */

      monthDate =
        addMonths(
          monthDate,
          interval
        );
    }

    return applyExceptions(
      results
    );
  }

  /*
   * ---------------------------------------------
   * UNKNOWN FREQUENCY
   * ---------------------------------------------
   *
   * Safely treat it as a normal event.
   */

  if (
    shouldIncludeDate(
      startDate,
      visibleStart,
      visibleEnd
    )
  ) {
    return [event];
  }

  return [];
};

/*
 * ------------------------------------------------
 * EXPAND ALL EVENTS
 * ------------------------------------------------ */

export const expandEventsForRange = (
  events = [],
  visibleStart,
  visibleEnd
) => {
  if (
    !Array.isArray(events) ||
    !visibleStart ||
    !visibleEnd
  ) {
    return [];
  }

  const result = [];

  events.forEach(
    (event) => {
      /*
       * Exception events are applied
       * to their original series.
       */

      if (
        event.isException
      ) {
        return;
      }

      const occurrences =
        expandSingleSeries(
          event,
          visibleStart,
          visibleEnd
        );

      if (
        event.recurrence &&
        event.recurrence.frequency &&
        event.recurrence.frequency !==
          "none"
      ) {
        const withExceptions =
          applyEventExceptions(
            occurrences,
            events,
            event
          );

        result.push(
          ...withExceptions
        );
      } else {
        result.push(
          ...occurrences
        );
      }
    }
  );

  return result;
};

/*
 * ------------------------------------------------
 * EXPORT HELPERS
 * ------------------------------------------------
 */

export {
  parseDate,
  formatDate,
  addDays,
  addMonths,
  getNthWeekdayOfMonth,
};