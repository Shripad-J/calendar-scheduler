import {
  createContext,
  useContext,
  useReducer,
} from "react";
import useHistory from "../hooks/useHistory";

const CalendarContext = createContext();

const initialState = {
  events: [],
  editingEvent: null,
  loading: true,
  timezone: "Asia/Kolkata",

  // Calendar view
  view: "week",

  // Currently selected date
  selectedDate: new Date(),
};

function calendarReducer(state, action) {
  switch (action.type) {
    case "SET_EVENTS":
      return {
        ...state,
        events: action.payload,
      };

    case "ADD_EVENT":
      return {
        ...state,
        events: [
          ...state.events,
          action.payload,
        ],
      };

    case "UPDATE_EVENT":
      return {
        ...state,
        events: state.events.map(
          (event) =>
            event.id === action.payload.id
              ? action.payload
              : event
        ),
      };

    case "DELETE_EVENT":
      return {
        ...state,
        events: state.events.filter(
          (event) =>
            event.id !== action.payload
        ),
      };

    case "SET_EDITING_EVENT":
      return {
        ...state,
        editingEvent: action.payload,
      };

    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };

    case "SET_TIMEZONE":
      return {
        ...state,
        timezone: action.payload,
      };

    case "SET_VIEW":
      return {
        ...state,
        view: action.payload,
      };

    case "SET_SELECTED_DATE":
      return {
        ...state,
        selectedDate: action.payload,
      };

    default:
      return state;
  }
}

export function CalendarProvider({
  children,
}) {
  const [state, dispatch] =
    useReducer(
      calendarReducer,
      initialState
    );

  const {
    execute,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  } = useHistory();

  return (
    <CalendarContext.Provider
      value={{
        state,
        dispatch,
        history: {
          execute,
          undo,
          redo,
          clear,
          canUndo,
          canRedo,
        },
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  return useContext(CalendarContext);
}