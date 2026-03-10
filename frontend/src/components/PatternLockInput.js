import React, { useEffect, useMemo, useRef, useState } from 'react';
import './PatternLockInput.css';

const toArray = (value) => String(value || '').split('-').filter(Boolean);

const PatternLockInput = ({ id, value, onChange, disabled = false, showHint = true }) => {
  const [selected, setSelected] = useState(() => toArray(value));
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      isDrawingRef.current = false;
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  useEffect(() => {
    setSelected(toArray(value));
  }, [value]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const handleSelect = (dot) => {
    if (disabled) return;
    const key = String(dot);
    if (selectedSet.has(key)) return;
    const next = [...selected, key];
    setSelected(next);
    onChange?.(next.join('-'));
  };

  const startDrawing = (dot) => {
    if (disabled) return;
    isDrawingRef.current = true;
    handleSelect(dot);
  };

  const continueDrawing = (dot) => {
    if (!isDrawingRef.current) return;
    handleSelect(dot);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    if (disabled) return;
    setSelected([]);
    onChange?.('');
  };

  return (
    <div className="pattern-lock" id={id}>
      <div className="pattern-lock__grid" role="group" aria-label="3 by 3 pattern lock grid">
        {Array.from({ length: 9 }, (_, index) => {
          const key = String(index);
          const selectedIndex = selected.indexOf(key);
          const isSelected = selectedSet.has(key);

          return (
            <button
              key={key}
              type="button"
              className={`pattern-lock__dot ${isSelected ? 'is-selected' : ''}`}
              onPointerDown={(event) => {
                event.preventDefault();
                startDrawing(index);
              }}
              onPointerEnter={() => continueDrawing(index)}
              onPointerUp={stopDrawing}
              disabled={disabled || isSelected}
              aria-label={`Pattern dot ${index + 1}${isSelected ? ` selected order ${selectedIndex + 1}` : ''}`}
            >
              <span className="pattern-lock__dot-core" />
              {isSelected && <span className="pattern-lock__order">{selectedIndex + 1}</span>}
            </button>
          );
        })}
      </div>

      <div className="pattern-lock__actions">
        {showHint && <span className="pattern-lock__hint">Selected dots: {selected.length} (minimum 4)</span>}
        <button type="button" className="pattern-lock__clear" onClick={handleClear} disabled={disabled || selected.length === 0}>
          Clear Pattern
        </button>
      </div>
    </div>
  );
};

export default PatternLockInput;
