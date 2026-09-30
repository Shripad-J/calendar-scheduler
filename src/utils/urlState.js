const validViews = [
  "week",
  "month",
];

export const getUrlState = () => {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const urlView = params.get("view");

  const view = validViews.includes(
    urlView
  )
    ? urlView
    : "week";

  const urlDate = params.get("date");

  let date = new Date();

  if (urlDate) {
    const parsedDate = new Date(
      `${urlDate}T00:00:00`
    );

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      date = parsedDate;
    }
  }

  const timezone =
    params.get("timezone") ||
    "Asia/Kolkata";

  const attendee =
    params.get("attendee") || "";

  return {
    view,
    date,
    timezone,
    attendee,
  };
};

export const updateUrlState = ({
  view,
  date,
  timezone,
  attendee,
}) => {
  const params =
    new URLSearchParams();

  params.set("view", view);

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  params.set(
    "date",
    `${year}-${month}-${day}`
  );

  params.set(
    "timezone",
    timezone
  );

  if (attendee) {
    params.set(
      "attendee",
      attendee
    );
  }

  window.history.replaceState(
    null,
    "",
    `?${params.toString()}`
  );
};