const STORAGE_KEY = "calendar_scheduler";
const STORAGE_VERSION = 1;

export const loadEventsFromStorage = () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);

    if (!storedData) {
      return [];
    }

    const parsedData = JSON.parse(storedData);

    if (
      !parsedData ||
      parsedData.version !== STORAGE_VERSION ||
      !Array.isArray(parsedData.events)
    ) {
      return [];
    }

    return parsedData.events;
  } catch (error) {
    console.error("Corrupted localStorage data:", error);

    localStorage.removeItem(STORAGE_KEY);

    return [];
  }
};

export const saveEventsToStorage = (events) => {
  try {
    const data = {
      version: STORAGE_VERSION,
      events: events,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  } catch (error) {
    console.error(
      "Failed to save events to localStorage:",
      error
    );
  }
};