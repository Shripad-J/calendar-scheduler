 
import { useState } from "react";

function useDragInteraction({
  onCreate,
} = {}) {
  const [isDragging, setIsDragging] =
    useState(false);

  const [dragStart, setDragStart] =
    useState(null);

  const [dragEnd, setDragEnd] =
    useState(null);

  const startDrag = (
    startPosition,
    startY
  ) => {
    setIsDragging(true);

    setDragStart({
      ...startPosition,
      y: startY,
    });

    setDragEnd({
      ...startPosition,
      y: startY,
    });
  };

  const updateDrag = (
    endPosition,
    endY
  ) => {
    if (!isDragging) {
      return;
    }

    setDragEnd({
      ...endPosition,
      y: endY,
    });
  };

  const endDrag = () => {
    if (
      !dragStart ||
      !dragEnd
    ) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    if (onCreate) {
      onCreate(
        dragStart,
        dragEnd
      );
    }

    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  const cancelDrag = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  };

  return {
    isDragging,
    dragStart,
    dragEnd,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
  };
}

export default useDragInteraction;