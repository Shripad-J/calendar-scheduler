import {
  useRef,
  useState,
} from "react";

function useHistory() {
  const [history, setHistory] =
    useState([]);

  const [future, setFuture] =
    useState([]);

  const historyRef =
    useRef([]);

  const execute = (command) => {
    command.do();

    historyRef.current = [
      ...historyRef.current,
      command,
    ];

    setHistory(
      historyRef.current
    );

    setFuture([]);
  };

  const undo = () => {
    const currentHistory =
      historyRef.current;

    if (
      currentHistory.length === 0
    ) {
      return;
    }

    const command =
      currentHistory[
        currentHistory.length - 1
      ];

    command.undo();

    const newHistory =
      currentHistory.slice(
        0,
        currentHistory.length - 1
      );

    historyRef.current =
      newHistory;

    setHistory(newHistory);

    setFuture(
      (previousFuture) => [
        command,
        ...previousFuture,
      ]
    );
  };

  const redo = () => {
    const currentFuture =
      future;

    if (
      currentFuture.length === 0
    ) {
      return;
    }

    const command =
      currentFuture[0];

    command.do();

    const newFuture =
      currentFuture.slice(1);

    historyRef.current = [
      ...historyRef.current,
      command,
    ];

    setHistory(
      historyRef.current
    );

    setFuture(newFuture);
  };

  /*
   * Roll back a failed async operation.
   *
   * Important:
   * Only the latest history command
   * can be automatically rolled back.
   *
   * This prevents:
   *
   * Action A pending
   * Action B completed
   * Action A fails
   *
   * from accidentally undoing Action B.
   */
  const rollback = (command) => {
    const currentHistory =
      historyRef.current;

    const lastCommand =
      currentHistory[
        currentHistory.length - 1
      ];

    if (
      lastCommand !== command
    ) {
      return false;
    }

    command.undo();

    const newHistory =
      currentHistory.slice(
        0,
        currentHistory.length - 1
      );

    historyRef.current =
      newHistory;

    setHistory(newHistory);

    return true;
  };

  const clear = () => {
    historyRef.current = [];

    setHistory([]);

    setFuture([]);
  };

  return {
    execute,
    undo,
    redo,
    rollback,
    clear,
    canUndo:
      history.length > 0,
    canRedo:
      future.length > 0,
  };
}

export default useHistory;