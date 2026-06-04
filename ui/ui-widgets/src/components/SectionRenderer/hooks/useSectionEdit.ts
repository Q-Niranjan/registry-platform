import { useState, useEffect, useCallback, RefObject } from 'react';

export interface EditSectionPosition {
  top: number;
  left: number;
  width: number;
}

export function useSectionEdit(options: {
  forceExitEdit?: boolean;
  originalSectionId: string;
  onEditModeChange?: (sectionId: string, editing: boolean) => void;
  sectionRef: RefObject<HTMLDivElement | null>;
}) {
  const { forceExitEdit, originalSectionId, onEditModeChange, sectionRef } = options;

  const [isEditMode, setIsEditMode] = useState(false);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);
  const [editSectionPosition, setEditSectionPosition] = useState<EditSectionPosition | null>(null);

  useEffect(() => {
    if (forceExitEdit && isEditMode) {
      setIsEditMode(false);
    }
  }, [forceExitEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isEditMode && sectionRef.current) {
      const updatePosition = () => {
        if (sectionRef.current) {
          const rect = sectionRef.current.getBoundingClientRect();
          setEditSectionPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      };

      requestAnimationFrame(updatePosition);
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }

    setEditSectionPosition(null);
    setSectionHeight(null);
  }, [isEditMode, sectionRef]);

  const handleEdit = useCallback(() => {
    if (sectionRef.current) {
      setSectionHeight(sectionRef.current.offsetHeight);
    }
    setIsEditMode(true);
    onEditModeChange?.(originalSectionId, true);
  }, [originalSectionId, onEditModeChange, sectionRef]);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    onEditModeChange?.(originalSectionId, false);
  }, [originalSectionId, onEditModeChange]);

  return {
    isEditMode,
    sectionHeight,
    editSectionPosition,
    handleEdit,
    exitEditMode,
  };
}
