'use client';

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ScreenContextProvider } from '../ScreenContext';
import { DashboardDataProvider, type DashboardDataSourceApi } from '../DataSourceContext';
import { dashboardWidgetRegistry } from '../registry';
import { registerDefaultDashboardWidgets } from '../widgets/defaultWidgets';
import type {
  DashboardScreenConfig,
  DashboardWidgetBase,
  PermissionChecker,
  WidgetPosition,
} from '../types';
import {
  clampRowSpan,
  clampSpan,
  createLayoutFromWidgets,
  ensureLayoutPositions,
  getAllowedPalette,
  gridPlacementStyle,
  HOMEPAGE_GRID_COLUMNS,
  HOMEPAGE_GRID_GAP_PX,
  HOMEPAGE_GRID_ROW_PX,
  nextOpenRow,
  normalizePosition,
  widgetDisplayLabel,
  type HomepageUserLayout,
  type PaletteWidget,
} from './layoutModel';

registerDefaultDashboardWidgets();

type ResizeAxis = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const RESIZE_HANDLES: Array<{ axis: ResizeAxis; cursor: string }> = [
  { axis: 'n', cursor: 'ns-resize' },
  { axis: 's', cursor: 'ns-resize' },
  { axis: 'e', cursor: 'ew-resize' },
  { axis: 'w', cursor: 'ew-resize' },
  { axis: 'ne', cursor: 'nesw-resize' },
  { axis: 'nw', cursor: 'nwse-resize' },
  { axis: 'se', cursor: 'nwse-resize' },
  { axis: 'sw', cursor: 'nesw-resize' },
];

export type HomepageLayoutBuilderProps = {
  baseScreen: DashboardScreenConfig;
  permissionChecker: PermissionChecker;
  initialLayout?: HomepageUserLayout | null;
  dataSource?: DashboardDataSourceApi;
  onSave: (layout: HomepageUserLayout) => void | Promise<void>;
  onResetToDefault: () => void | Promise<void>;
  onCancel?: () => void;
};

function cloneWidget(widget: DashboardWidgetBase): DashboardWidgetBase {
  return structuredClone(widget);
}

function sortWidgets(widgets: DashboardWidgetBase[]) {
  return [...widgets].sort((a, b) => {
    const rowA = a.position?.row ?? 999;
    const rowB = b.position?.row ?? 999;
    if (rowA !== rowB) return rowA - rowB;
    return (a.position?.col ?? 0) - (b.position?.col ?? 0);
  });
}

function gridMetrics(grid: HTMLElement) {
  const rect = grid.getBoundingClientRect();
  const colStep =
    (rect.width - HOMEPAGE_GRID_GAP_PX * (HOMEPAGE_GRID_COLUMNS - 1)) /
      HOMEPAGE_GRID_COLUMNS +
    HOMEPAGE_GRID_GAP_PX;
  const rowStep = HOMEPAGE_GRID_ROW_PX + HOMEPAGE_GRID_GAP_PX;
  return { rect, colStep: Math.max(colStep, 1), rowStep };
}

function pointerToCell(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
  span: number,
  rowSpan: number,
): Pick<WidgetPosition, 'row' | 'col'> {
  const { rect, colStep, rowStep } = gridMetrics(grid);
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const col = Math.min(
    HOMEPAGE_GRID_COLUMNS - span + 1,
    Math.max(1, Math.round(x / colStep) + 1),
  );
  const row = Math.max(1, Math.round(y / rowStep) + 1);
  void rowSpan;
  return { row, col };
}

function applyResizeDelta(
  start: WidgetPosition,
  axis: ResizeAxis,
  dCol: number,
  dRow: number,
): WidgetPosition {
  let { row, col, span, rowSpan = 1 } = start;

  if (axis.includes('e')) {
    span = clampSpan(span + dCol);
  }
  if (axis.includes('w')) {
    const nextSpan = clampSpan(span - dCol);
    col = Math.max(1, col + (span - nextSpan));
    span = nextSpan;
  }
  if (axis.includes('s')) {
    rowSpan = clampRowSpan(rowSpan + dRow);
  }
  if (axis.includes('n')) {
    const nextRowSpan = clampRowSpan(rowSpan - dRow);
    row = Math.max(1, row + (rowSpan - nextRowSpan));
    rowSpan = nextRowSpan;
  }

  if (col + span - 1 > HOMEPAGE_GRID_COLUMNS) {
    if (axis.includes('w')) col = HOMEPAGE_GRID_COLUMNS - span + 1;
    else span = HOMEPAGE_GRID_COLUMNS - col + 1;
  }

  return {
    row: Math.max(1, row),
    col: Math.max(1, col),
    span: clampSpan(span),
    rowSpan: clampRowSpan(rowSpan),
  };
}

function EditableWidgetFrame({
  widget,
  draggingId,
  setDraggingId,
  resizable,
  interactive = false,
  livePosition,
  onRemove,
  onMoveStart,
  onMove,
  onMoveEnd,
  onResizeStart,
  onResize,
  onResizeEnd,
  onDropPalette,
}: {
  widget: DashboardWidgetBase;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  resizable: boolean;
  interactive?: boolean;
  livePosition?: WidgetPosition | null;
  onRemove: (id: string) => void;
  onMoveStart: (id: string, clientX: number, clientY: number) => void;
  onMove: (id: string, clientX: number, clientY: number) => void;
  onMoveEnd: (id: string) => void;
  onResizeStart: (id: string, axis: ResizeAxis) => void;
  onResize: (
    id: string,
    axis: ResizeAxis,
    clientX: number,
    clientY: number,
  ) => void;
  onResizeEnd: (id: string) => void;
  onDropPalette: (paletteId: string, beforeId: string) => void;
}) {
  const entry = dashboardWidgetRegistry.get(widget.type);
  const basePosition = normalizePosition(widget);
  const position = livePosition ?? basePosition;
  const Component = entry?.component;
  const slotRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number } | null>(null);
  const resizeRef = useRef<{ pointerId: number; axis: ResizeAxis } | null>(
    null,
  );
  const isDragging = draggingId === widget.id;
  const isResizing = Boolean(livePosition) && !isDragging;

  const beginMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizable) return;
    const target = e.target as HTMLElement;
    if (target.closest('.og2p-hlb-live-delete')) return;
    if (target.closest('.og2p-hlb-resize')) return;
    if (
      target.closest(
        'select, button, input, textarea, a, label, [data-og2p-interactive]',
      )
    ) {
      return;
    }
    e.preventDefault();
    dragRef.current = { pointerId: e.pointerId };
    setDraggingId(widget.id);
    onMoveStart(widget.id, e.clientX, e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const movePointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId === e.pointerId) {
      e.preventDefault();
      onResize(widget.id, resizeRef.current.axis, e.clientX, e.clientY);
      return;
    }
    if (dragRef.current?.pointerId !== e.pointerId) return;
    e.preventDefault();
    onMove(widget.id, e.clientX, e.clientY);
  };

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeRef.current?.pointerId === e.pointerId) {
      resizeRef.current = null;
      onResizeEnd(widget.id);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      return;
    }
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    onMoveEnd(widget.id);
    setDraggingId(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const beginResize =
    (axis: ResizeAxis) => (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!resizable) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { pointerId: e.pointerId, axis };
      onResizeStart(widget.id, axis);
      // Capture on the slot so move events keep flowing.
      slotRef.current?.setPointerCapture(e.pointerId);
    };

  return (
    <div
      ref={slotRef}
      className={`og2p-hlb-live-slot ${isDragging ? 'dragging' : ''} ${
        isResizing ? 'resizing' : ''
      } ${resizable ? 'movable' : ''}`}
      style={gridPlacementStyle(position)}
      onPointerDown={beginMove}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const paletteId = e.dataTransfer.getData('application/x-og2p-palette');
        if (paletteId) onDropPalette(paletteId, widget.id);
      }}
    >
      <div className="og2p-hlb-live-toolbar">
        <span className="og2p-hlb-live-handle" title="Drag anywhere to move" aria-hidden>
          ⋮⋮
        </span>
        <span className="og2p-hlb-live-name">{widgetDisplayLabel(widget)}</span>
        {resizable ? (
          <span className="og2p-hlb-live-span" title="Width × height in grid units">
            {position.span}×{position.rowSpan ?? 1}
          </span>
        ) : null}
        <button
          type="button"
          className="og2p-hlb-btn danger og2p-hlb-live-delete"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(widget.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Remove ${widgetDisplayLabel(widget)}`}
        >
          Delete
        </button>
      </div>
      <div
        className={`og2p-hlb-live-widget ${interactive ? 'interactive' : ''}`}
        data-og2p-interactive={interactive ? 'true' : undefined}
        onPointerDown={
          interactive
            ? (e) => {
                // Keep filter/control clicks from being treated as canvas gestures.
                e.stopPropagation();
              }
            : undefined
        }
      >
        {Component ? (
          <Component widget={widget} onDrill={() => undefined} />
        ) : (
          <div className="og2p-dash-unknown">Unsupported: {widget.type}</div>
        )}
      </div>
      {resizable
        ? RESIZE_HANDLES.map(({ axis, cursor }) => (
            <button
              key={axis}
              type="button"
              className={`og2p-hlb-resize og2p-hlb-resize--${axis}`}
              style={{ cursor }}
              aria-label={`Resize ${widgetDisplayLabel(widget)} from ${axis}`}
              title="Drag to resize"
              onPointerDown={beginResize(axis)}
            />
          ))
        : null}
    </div>
  );
}

export function HomepageLayoutBuilder({
  baseScreen,
  permissionChecker,
  initialLayout,
  dataSource,
  onSave,
  onResetToDefault,
  onCancel,
}: HomepageLayoutBuilderProps) {
  const palette = useMemo(
    () => getAllowedPalette(baseScreen, permissionChecker),
    [baseScreen, permissionChecker],
  );

  const [canvas, setCanvas] = useState<DashboardWidgetBase[]>(() => {
    if (initialLayout?.widgets?.length) {
      return ensureLayoutPositions(initialLayout.widgets.map(cloneWidget));
    }
    if (initialLayout && initialLayout.updatedAt && initialLayout.widgets.length === 0) {
      return [];
    }
    return ensureLayoutPositions(palette.map((p) => cloneWidget(p.widget)));
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [livePositions, setLivePositions] = useState<
    Record<string, WidgetPosition>
  >({});
  const interactionRef = useRef<{
    id: string;
    mode: 'move' | 'resize';
    axis?: ResizeAxis;
    startPos: WidgetPosition;
    originX: number;
    originY: number;
    colStep: number;
    rowStep: number;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const livePositionsRef = useRef(livePositions);
  livePositionsRef.current = livePositions;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const onCanvasIds = useMemo(() => new Set(canvas.map((w) => w.id)), [canvas]);

  const availablePalette = useMemo(
    () => palette.filter((p) => !onCanvasIds.has(p.widget.id)),
    [palette, onCanvasIds],
  );

  const previewConfig = useMemo<DashboardScreenConfig>(
    () => ({
      ...baseScreen,
      screen: {
        ...baseScreen.screen,
        widgets: canvas,
      },
    }),
    [baseScreen, canvas],
  );

  const sorted = useMemo(() => sortWidgets(canvas), [canvas]);
  const chrome = sorted.filter(
    (w) => w.type === 'identity' || w.type === 'context_bar',
  );
  const body = sorted.filter(
    (w) => w.type !== 'identity' && w.type !== 'context_bar',
  );

  const maxOccupiedRow = useMemo(
    () =>
      body.reduce((max, widget) => {
        const pos = livePositions[widget.id] ?? normalizePosition(widget);
        return Math.max(max, pos.row + (pos.rowSpan ?? 1) - 1);
      }, 8),
    [body, livePositions],
  );

  const commitPosition = (id: string, position: WidgetPosition) => {
    setCanvas((prev) =>
      ensureLayoutPositions(
        prev.map((widget) =>
          widget.id === id ? { ...widget, position } : widget,
        ),
      ),
    );
    setLivePositions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMessage(null);
  };

  const addWidget = (item: PaletteWidget, beforeId?: string) => {
    setCanvas((prev) => {
      if (prev.some((w) => w.id === item.widget.id)) return prev;
      const bodyWidgets = prev.filter(
        (w) => w.type !== 'identity' && w.type !== 'context_bar',
      );
      const widget = cloneWidget(item.widget);
      const span = clampSpan(widget.position?.span ?? HOMEPAGE_GRID_COLUMNS);
      const rowSpan = clampRowSpan(
        widget.position?.rowSpan ?? normalizePosition(widget).rowSpan!,
      );
      if (beforeId) {
        const anchor = prev.find((w) => w.id === beforeId);
        const anchorPos = anchor ? normalizePosition(anchor) : null;
        widget.position = {
          row: anchorPos?.row ?? nextOpenRow(bodyWidgets),
          col: 1,
          span,
          rowSpan,
        };
      } else {
        widget.position = {
          row: nextOpenRow(bodyWidgets),
          col: 1,
          span,
          rowSpan,
        };
      }
      return ensureLayoutPositions([...prev, widget]);
    });
    setMessage(null);
    setPaletteOpen(false);
  };

  const removeWidget = (id: string) => {
    setCanvas((prev) => prev.filter((w) => w.id !== id));
  };

  const onMoveStart = (id: string, clientX: number, clientY: number) => {
    const widget = canvas.find((w) => w.id === id);
    const grid = gridRef.current;
    if (!widget || !grid) return;
    const startPos = normalizePosition(widget);
    const { colStep, rowStep } = gridMetrics(grid);
    interactionRef.current = {
      id,
      mode: 'move',
      startPos,
      originX: clientX,
      originY: clientY,
      colStep,
      rowStep,
    };
    setLivePositions((prev) => ({ ...prev, [id]: startPos }));
  };

  const onMove = (id: string, clientX: number, clientY: number) => {
    const state = interactionRef.current;
    const grid = gridRef.current;
    if (!state || state.id !== id || state.mode !== 'move' || !grid) return;
    const { startPos } = state;
    const cell = pointerToCell(
      grid,
      clientX,
      clientY,
      startPos.span,
      startPos.rowSpan ?? 1,
    );
    const next = {
      ...startPos,
      row: cell.row,
      col: cell.col,
    };
    livePositionsRef.current = { ...livePositionsRef.current, [id]: next };
    setLivePositions(livePositionsRef.current);
  };

  const onMoveEnd = (id: string) => {
    const live =
      livePositionsRef.current[id] ?? interactionRef.current?.startPos;
    interactionRef.current = null;
    if (live) commitPosition(id, live);
  };

  const onResizeStart = (id: string, axis: ResizeAxis) => {
    const widget = canvas.find((w) => w.id === id);
    const grid = gridRef.current;
    if (!widget || !grid) return;
    const startPos = normalizePosition(widget);
    const { colStep, rowStep } = gridMetrics(grid);
    interactionRef.current = {
      id,
      mode: 'resize',
      axis,
      startPos,
      originX: 0,
      originY: 0,
      colStep,
      rowStep,
    };
    // Capture initial pointer via first move; store origin on first resize call.
    setLivePositions((prev) => ({ ...prev, [id]: startPos }));
  };

  const onResize = (
    id: string,
    axis: ResizeAxis,
    clientX: number,
    clientY: number,
  ) => {
    const state = interactionRef.current;
    if (!state || state.id !== id || state.mode !== 'resize') return;
    if (state.originX === 0 && state.originY === 0) {
      state.originX = clientX;
      state.originY = clientY;
      state.axis = axis;
      return;
    }
    const dCol = Math.round((clientX - state.originX) / state.colStep);
    const dRow = Math.round((clientY - state.originY) / state.rowStep);
    const next = applyResizeDelta(state.startPos, state.axis || axis, dCol, dRow);
    livePositionsRef.current = { ...livePositionsRef.current, [id]: next };
    setLivePositions(livePositionsRef.current);
  };

  const onResizeEnd = (id: string) => {
    const live =
      livePositionsRef.current[id] ?? interactionRef.current?.startPos;
    interactionRef.current = null;
    if (live) commitPosition(id, live);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const layout = createLayoutFromWidgets(baseScreen.screen.id, canvas);
      await onSave(layout);
      setMessage('Homepage layout saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const startBlank = () => {
    setCanvas([]);
    setMessage('Homepage cleared. Add widgets from “Add widget”, then save.');
  };

  const loadDefault = () => {
    setCanvas(ensureLayoutPositions(palette.map((p) => cloneWidget(p.widget))));
    setMessage('Restored default homepage layout (not saved yet).');
  };

  const trust = baseScreen.screen.trust;
  const chromeReady = chrome
    .map((widget) => {
      if (widget.type === 'context_bar') {
        return {
          ...widget,
          config: {
            ...(widget.config || {}),
            trust: (widget.config?.trust as object) || trust,
          },
        };
      }
      if (widget.type === 'identity') {
        const identity =
          (widget.config?.identity as object | undefined) ||
          baseScreen.screen.identity;
        if (!identity) return null;
        return {
          ...widget,
          config: { ...(widget.config || {}), identity },
        };
      }
      return widget;
    })
    .filter((w): w is DashboardWidgetBase => w !== null);

  const dropPaletteOnGrid = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const paletteId = e.dataTransfer.getData('application/x-og2p-palette');
    const item = palette.find((p) => p.widget.id === paletteId);
    const grid = gridRef.current;
    if (!item || !grid) return;
    const widget = cloneWidget(item.widget);
    const span = clampSpan(widget.position?.span ?? 6);
    const rowSpan = clampRowSpan(normalizePosition(widget).rowSpan!);
    const cell = pointerToCell(grid, e.clientX, e.clientY, span, rowSpan);
    widget.position = { ...cell, span, rowSpan };
    setCanvas((prev) => {
      if (prev.some((w) => w.id === widget.id)) return prev;
      return ensureLayoutPositions([...prev, widget]);
    });
    setPaletteOpen(false);
    setMessage(null);
  };

  const live = (
    <ScreenContextProvider
      initialContext={previewConfig.screen.context}
      asOf={previewConfig.screen.trust.asOf}
    >
      <div className="og2p-dash-root og2p-hlb-live-root">
        {chromeReady.map((widget) => (
          <EditableWidgetFrame
            key={widget.id}
            widget={widget}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
            resizable={false}
            interactive={widget.type === 'context_bar'}
            onRemove={removeWidget}
            onMoveStart={() => undefined}
            onMove={() => undefined}
            onMoveEnd={() => undefined}
            onResizeStart={() => undefined}
            onResize={() => undefined}
            onResizeEnd={() => undefined}
            onDropPalette={(paletteId, beforeId) => {
              const item = palette.find((p) => p.widget.id === paletteId);
              if (item) addWidget(item, beforeId);
            }}
          />
        ))}

        <main className="og2p-dash-page">
          <div className="og2p-dash-screen-title-row">
            <h2 className="og2p-dash-screen-title">{previewConfig.screen.title}</h2>
            <span className="og2p-dash-demo-pill">Edit mode</span>
          </div>

          {body.length === 0 ? (
            <div
              className="og2p-hlb-live-empty"
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropPaletteOnGrid}
            >
              <b>Empty homepage</b>
              <p>Use “Add widget” or drag a widget onto this page.</p>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="og2p-dash-grid og2p-dash-grid--freeform og2p-hlb-canvas"
              style={{
                minHeight: Math.max(
                  420,
                  maxOccupiedRow * (HOMEPAGE_GRID_ROW_PX + HOMEPAGE_GRID_GAP_PX) +
                    160,
                ),
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropPaletteOnGrid}
            >
              {body.map((widget) => (
                <EditableWidgetFrame
                  key={widget.id}
                  widget={widget}
                  draggingId={draggingId}
                  setDraggingId={setDraggingId}
                  resizable
                  livePosition={livePositions[widget.id] ?? null}
                  onRemove={removeWidget}
                  onMoveStart={onMoveStart}
                  onMove={onMove}
                  onMoveEnd={onMoveEnd}
                  onResizeStart={onResizeStart}
                  onResize={onResize}
                  onResizeEnd={onResizeEnd}
                  onDropPalette={(paletteId, beforeId) => {
                    const item = palette.find((p) => p.widget.id === paletteId);
                    if (item) addWidget(item, beforeId);
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </ScreenContextProvider>
  );

  return (
    <div className="og2p-hlb og2p-hlb--live">
      <header className="og2p-hlb-header">
        <div>
          <h1 className="og2p-hlb-title">Customize homepage</h1>
          <p className="og2p-hlb-sub">
            Treat this page as your canvas. Press and drag anywhere on a widget to
            move it. Resize from any edge or corner. Then save.
          </p>
        </div>
        <div className="og2p-hlb-actions">
          {onCancel ? (
            <button type="button" className="og2p-hlb-btn" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
          <div className="og2p-hlb-add-wrap">
            <button
              type="button"
              className="og2p-hlb-btn"
              onClick={() => setPaletteOpen((v) => !v)}
              disabled={availablePalette.length === 0}
              aria-expanded={paletteOpen}
            >
              Add widget
              {availablePalette.length ? ` (${availablePalette.length})` : ''}
            </button>
            {paletteOpen && availablePalette.length > 0 ? (
              <div className="og2p-hlb-add-menu" role="menu">
                {availablePalette.map((item) => (
                  <button
                    key={item.widget.id}
                    type="button"
                    role="menuitem"
                    className="og2p-hlb-add-item"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/x-og2p-palette',
                        item.widget.id,
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => addWidget(item)}
                  >
                    <span>{item.label}</span>
                    <span className="og2p-hlb-add-type">{item.widget.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className="og2p-hlb-btn" onClick={startBlank}>
            Start blank
          </button>
          <button type="button" className="og2p-hlb-btn" onClick={loadDefault}>
            Load default
          </button>
          <button
            type="button"
            className="og2p-hlb-btn"
            onClick={() => void onResetToDefault()}
          >
            Reset saved
          </button>
          <button
            type="button"
            className="og2p-hlb-btn primary"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save layout'}
          </button>
        </div>
      </header>

      {message ? <p className="og2p-hlb-message">{message}</p> : null}

      {dataSource ? (
        <DashboardDataProvider api={dataSource}>{live}</DashboardDataProvider>
      ) : (
        live
      )}
    </div>
  );
}

export { createLayoutFromWidgets };
