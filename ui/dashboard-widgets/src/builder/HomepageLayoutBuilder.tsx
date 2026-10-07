'use client';

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
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
  compactLayout,
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

const ROW_STEP_PX = HOMEPAGE_GRID_ROW_PX + HOMEPAGE_GRID_GAP_PX;
const DRAG_THRESHOLD_PX = 4;
const EDGE_SCROLL_ZONE_PX = 80;
const EDGE_SCROLL_MAX_PX = 18;
const REFLOW_ANIMATION: KeyframeAnimationOptions = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
};

export type HomepageLayoutBuilderProps = {
  baseScreen: DashboardScreenConfig;
  permissionChecker: PermissionChecker;
  initialLayout?: HomepageUserLayout | null;
  dataSource?: DashboardDataSourceApi;
  onSave: (layout: HomepageUserLayout) => void | Promise<void>;
  onResetToDefault: () => void | Promise<void>;
  onCancel?: () => void;
  /** When false, hides the Add widget dropdown (default true). */
  showAddWidget?: boolean;
};

type Interaction = {
  id: string;
  mode: 'move' | 'resize';
  axis: ResizeAxis | null;
  pointerId: number;
  startPos: WidgetPosition;
  target: WidgetPosition;
  originX: number;
  originY: number;
  originGridLeft: number;
  originGridTop: number;
  colStep: number;
  lastX: number;
  lastY: number;
  started: boolean;
  scroller: HTMLElement | null;
};

type Preview = {
  id: string;
  mode: 'move' | 'resize';
  position: WidgetPosition;
};

function cloneWidget(widget: DashboardWidgetBase): DashboardWidgetBase {
  return structuredClone(widget);
}

function bodyWidgets(widgets: DashboardWidgetBase[]) {
  return widgets.filter((w) => w.type !== 'identity');
}

function columnStep(grid: HTMLElement) {
  const width = grid.getBoundingClientRect().width;
  return Math.max(
    1,
    (width - HOMEPAGE_GRID_GAP_PX * (HOMEPAGE_GRID_COLUMNS - 1)) /
      HOMEPAGE_GRID_COLUMNS +
      HOMEPAGE_GRID_GAP_PX,
  );
}

function pointerToCell(
  grid: HTMLElement,
  clientX: number,
  clientY: number,
  span: number,
): Pick<WidgetPosition, 'row' | 'col'> {
  const rect = grid.getBoundingClientRect();
  const col = Math.min(
    HOMEPAGE_GRID_COLUMNS - span + 1,
    Math.max(1, Math.floor((clientX - rect.left) / columnStep(grid)) + 1),
  );
  const row = Math.max(1, Math.floor((clientY - rect.top) / ROW_STEP_PX) + 1);
  return { row, col };
}

function samePosition(a: WidgetPosition, b: WidgetPosition) {
  return (
    a.row === b.row &&
    a.col === b.col &&
    a.span === b.span &&
    (a.rowSpan ?? 1) === (b.rowSpan ?? 1)
  );
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
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
    const nextSpan = clampSpan(Math.min(span - dCol, col + span - 1));
    col = col + (span - nextSpan);
    span = nextSpan;
  }
  if (axis.includes('s')) {
    rowSpan = clampRowSpan(rowSpan + dRow);
  }
  if (axis.includes('n')) {
    const nextRowSpan = clampRowSpan(Math.min(rowSpan - dRow, row + rowSpan - 1));
    row = row + (rowSpan - nextRowSpan);
    rowSpan = nextRowSpan;
  }

  if (col + span - 1 > HOMEPAGE_GRID_COLUMNS) {
    span = HOMEPAGE_GRID_COLUMNS - col + 1;
  }

  return {
    row: Math.max(1, row),
    col: Math.max(1, col),
    span: clampSpan(span),
    rowSpan: clampRowSpan(rowSpan),
  };
}

function WidgetFrame({
  widget,
  position,
  sizeLabel,
  state,
  setSlotEl,
  onRemove,
  onPointerDown,
  onResizePointerDown,
  onPointerMove,
  onPointerEnd,
}: {
  widget: DashboardWidgetBase;
  position: WidgetPosition;
  sizeLabel: string;
  state: 'idle' | 'selected' | 'dragging' | 'resizing';
  setSlotEl: (id: string, el: HTMLDivElement | null) => void;
  onRemove: (id: string) => void;
  onPointerDown: (id: string, e: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (
    id: string,
    axis: ResizeAxis,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => void;
}) {
  const entry = dashboardWidgetRegistry.get(widget.type);
  const Component = entry?.component;
  const label = widgetDisplayLabel(widget);

  return (
    <div
      ref={(el) => setSlotEl(widget.id, el)}
      className={`og2p-hlb-slot is-${state}`}
      style={gridPlacementStyle(position)}
      data-widget-type={widget.type}
      onPointerDown={(e) => onPointerDown(widget.id, e)}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => onPointerEnd(e, false)}
      onPointerCancel={(e) => onPointerEnd(e, true)}
    >
      <div className="og2p-hlb-slot-body" aria-hidden>
        {Component ? (
          <Component widget={widget} onDrill={() => undefined} />
        ) : (
          <div className="og2p-dash-unknown">Unsupported: {widget.type}</div>
        )}
      </div>

      <div className="og2p-hlb-chip">
        <svg className="og2p-hlb-chip-grip" viewBox="0 0 10 16" aria-hidden>
          <circle cx="2.5" cy="3" r="1.4" />
          <circle cx="7.5" cy="3" r="1.4" />
          <circle cx="2.5" cy="8" r="1.4" />
          <circle cx="7.5" cy="8" r="1.4" />
          <circle cx="2.5" cy="13" r="1.4" />
          <circle cx="7.5" cy="13" r="1.4" />
        </svg>
        <span className="og2p-hlb-chip-name">{label}</span>
        <span className="og2p-hlb-chip-size">{sizeLabel}</span>
      </div>

      <button
        type="button"
        className="og2p-hlb-remove"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(widget.id);
        }}
        aria-label={`Remove ${label}`}
        title={`Remove ${label}`}
      >
        <svg viewBox="0 0 12 12" aria-hidden>
          <path d="M3 3l6 6M9 3l-6 6" />
        </svg>
      </button>

      {RESIZE_HANDLES.map(({ axis, cursor }) => (
        <button
          key={axis}
          type="button"
          tabIndex={-1}
          className={`og2p-hlb-resize og2p-hlb-resize--${axis}`}
          style={{ cursor }}
          aria-label={`Resize ${label} from ${axis}`}
          onPointerDown={(e) => onResizePointerDown(widget.id, axis, e)}
        />
      ))}
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
  showAddWidget = true,
}: HomepageLayoutBuilderProps) {
  const palette = useMemo(
    () => getAllowedPalette(baseScreen, permissionChecker),
    [baseScreen, permissionChecker],
  );

  const defaultCanvas = () =>
    compactLayout(ensureLayoutPositions(palette.map((p) => cloneWidget(p.widget))));

  const [canvas, setCanvas] = useState<DashboardWidgetBase[]>(() => {
    if (initialLayout?.widgets?.length) {
      return compactLayout(
        ensureLayoutPositions(bodyWidgets(initialLayout.widgets).map(cloneWidget)),
      );
    }
    if (initialLayout && initialLayout.updatedAt && initialLayout.widgets.length === 0) {
      return [];
    }
    return defaultCanvas();
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const slotEls = useRef(new Map<string, HTMLDivElement>());
  const lastRects = useRef(new Map<string, { x: number; y: number }>());

  const updateCanvas = (
    next: (prev: DashboardWidgetBase[]) => DashboardWidgetBase[],
  ) => {
    setCanvas(next);
    setDirty(true);
  };

  const onCanvasIds = useMemo(() => new Set(canvas.map((w) => w.id)), [canvas]);
  const availablePalette = useMemo(
    () => palette.filter((p) => !onCanvasIds.has(p.widget.id)),
    [palette, onCanvasIds],
  );

  const layout = useMemo(
    () =>
      preview
        ? compactLayout(canvas, { id: preview.id, position: preview.position })
        : canvas,
    [canvas, preview],
  );
  const layoutPositions = useMemo(
    () => new Map(layout.map((w) => [w.id, normalizePosition(w)] as const)),
    [layout],
  );

  const occupiedRows = useMemo(
    () =>
      Array.from(layoutPositions.values()).reduce(
        (max, pos) => Math.max(max, pos.row + (pos.rowSpan ?? 1) - 1),
        0,
      ),
    [layoutPositions],
  );

  const trust = baseScreen.screen.trust;
  const renderable = useMemo(
    () =>
      canvas.map((widget) =>
        widget.type === 'context_bar'
          ? {
              ...widget,
              config: {
                ...(widget.config || {}),
                trust: (widget.config?.trust as object) || trust,
              },
            }
          : widget,
      ),
    [canvas, trust],
  );

  // Animate widgets from their previous spot to the new one whenever the grid reflows.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      lastRects.current.clear();
      return;
    }
    const gridRect = grid.getBoundingClientRect();
    const activeId = interactionRef.current?.started ? interactionRef.current.id : null;
    const next = new Map<string, { x: number; y: number }>();
    slotEls.current.forEach((el, id) => {
      if (id !== activeId) el.getAnimations?.().forEach((a) => a.cancel());
      const rect = el.getBoundingClientRect();
      const pos = { x: rect.left - gridRect.left, y: rect.top - gridRect.top };
      next.set(id, pos);
      const prev = lastRects.current.get(id);
      if (!prev || id === activeId) return;
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        REFLOW_ANIMATION,
      );
    });
    lastRects.current = next;
  });

  useEffect(() => {
    if (!message) return;
    const handle = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(handle);
  }, [message]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finishInteraction(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    },
    [],
  );

  const setSlotEl = (id: string, el: HTMLDivElement | null) => {
    if (el) slotEls.current.set(id, el);
    else slotEls.current.delete(id);
  };

  const updateInteraction = (clientX: number, clientY: number) => {
    const s = interactionRef.current;
    const grid = gridRef.current;
    if (!s || !grid) return;
    s.lastX = clientX;
    s.lastY = clientY;

    if (!s.started) {
      if (Math.hypot(clientX - s.originX, clientY - s.originY) < DRAG_THRESHOLD_PX) {
        return;
      }
      s.started = true;
      setSelectedId(s.id);
      setPreview({ id: s.id, mode: s.mode, position: s.startPos });
      startAutoScroll();
    }

    const gridRect = grid.getBoundingClientRect();
    const dx = clientX - s.originX - (gridRect.left - s.originGridLeft);
    const dy = clientY - s.originY - (gridRect.top - s.originGridTop);
    const dCol = Math.round(dx / s.colStep);
    const dRow = Math.round(dy / ROW_STEP_PX);

    let target: WidgetPosition;
    if (s.mode === 'move') {
      const el = slotEls.current.get(s.id);
      if (el) el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      target = {
        ...s.startPos,
        col: Math.min(
          HOMEPAGE_GRID_COLUMNS - s.startPos.span + 1,
          Math.max(1, s.startPos.col + dCol),
        ),
        row: Math.max(1, s.startPos.row + dRow),
      };
    } else {
      target = applyResizeDelta(s.startPos, s.axis ?? 'se', dCol, dRow);
    }

    if (!samePosition(target, s.target)) {
      s.target = target;
      setPreview({ id: s.id, mode: s.mode, position: target });
    }
  };

  const stopAutoScroll = () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = null;
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    const tick = () => {
      const s = interactionRef.current;
      if (!s?.started) {
        scrollFrameRef.current = null;
        return;
      }
      const scrollerRect = s.scroller?.getBoundingClientRect();
      const viewTop = Math.max(
        scrollerRect?.top ?? 0,
        headerRef.current?.getBoundingClientRect().bottom ?? 0,
      );
      const viewBottom = scrollerRect?.bottom ?? window.innerHeight;
      let speed = 0;
      if (s.lastY < viewTop + EDGE_SCROLL_ZONE_PX) {
        speed = -EDGE_SCROLL_MAX_PX * Math.min(1, (viewTop + EDGE_SCROLL_ZONE_PX - s.lastY) / EDGE_SCROLL_ZONE_PX);
      } else if (s.lastY > viewBottom - EDGE_SCROLL_ZONE_PX) {
        speed = EDGE_SCROLL_MAX_PX * Math.min(1, (s.lastY - (viewBottom - EDGE_SCROLL_ZONE_PX)) / EDGE_SCROLL_ZONE_PX);
      }
      if (speed !== 0) {
        if (s.scroller) s.scroller.scrollBy(0, speed);
        else window.scrollBy(0, speed);
        updateInteraction(s.lastX, s.lastY);
      }
      scrollFrameRef.current = requestAnimationFrame(tick);
    };
    scrollFrameRef.current = requestAnimationFrame(tick);
  };

  const beginInteraction = (
    id: string,
    mode: Interaction['mode'],
    axis: ResizeAxis | null,
    e: ReactPointerEvent<HTMLElement>,
  ) => {
    const grid = gridRef.current;
    const widget = canvas.find((w) => w.id === id);
    const slot = slotEls.current.get(id);
    if (!grid || !widget || !slot || interactionRef.current) return;
    const gridRect = grid.getBoundingClientRect();
    const startPos = normalizePosition(widget);
    interactionRef.current = {
      id,
      mode,
      axis,
      pointerId: e.pointerId,
      startPos,
      target: startPos,
      originX: e.clientX,
      originY: e.clientY,
      originGridLeft: gridRect.left,
      originGridTop: gridRect.top,
      colStep: columnStep(grid),
      lastX: e.clientX,
      lastY: e.clientY,
      started: false,
      scroller: findScrollParent(grid),
    };
    slot.setPointerCapture(e.pointerId);
  };

  const finishInteraction = (cancelled: boolean) => {
    const s = interactionRef.current;
    interactionRef.current = null;
    stopAutoScroll();
    if (!s) return;

    const el = slotEls.current.get(s.id);
    try {
      el?.releasePointerCapture(s.pointerId);
    } catch {
      /* already released */
    }

    if (!s.started) {
      setSelectedId(s.id);
      return;
    }

    const grid = gridRef.current;
    if (el && grid) {
      const gridRect = grid.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      lastRects.current.set(s.id, {
        x: rect.left - gridRect.left,
        y: rect.top - gridRect.top,
      });
      el.style.transform = '';
    }

    if (!cancelled && !samePosition(s.target, s.startPos)) {
      updateCanvas((prev) => compactLayout(prev, { id: s.id, position: s.target }));
    }
    setPreview(null);
  };

  const onSlotPointerDown = (id: string, e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    beginInteraction(id, 'move', null, e);
  };

  const onResizePointerDown = (
    id: string,
    axis: ResizeAxis,
    e: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    beginInteraction(id, 'resize', axis, e);
  };

  const onSlotPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (interactionRef.current?.pointerId !== e.pointerId) return;
    e.preventDefault();
    updateInteraction(e.clientX, e.clientY);
  };

  const onSlotPointerEnd = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    if (interactionRef.current?.pointerId !== e.pointerId) return;
    finishInteraction(cancelled);
  };

  const placeWidget = (item: PaletteWidget, cell?: Pick<WidgetPosition, 'row' | 'col'>) => {
    updateCanvas((prev) => {
      if (prev.some((w) => w.id === item.widget.id)) return prev;
      const widget = cloneWidget(item.widget);
      const base = normalizePosition(widget);
      const span = clampSpan(base.span);
      widget.position = {
        row: cell?.row ?? nextOpenRow(prev),
        col: Math.min(HOMEPAGE_GRID_COLUMNS - span + 1, cell?.col ?? 1),
        span,
        rowSpan: base.rowSpan,
      };
      return compactLayout([...prev, widget], {
        id: widget.id,
        position: widget.position,
      });
    });
    setPaletteOpen(false);
  };

  const removeWidget = (id: string) => {
    updateCanvas((prev) => compactLayout(prev.filter((w) => w.id !== id)));
    setSelectedId((current) => (current === id ? null : current));
  };

  const dropPaletteOnGrid = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const paletteId = e.dataTransfer.getData('application/x-og2p-palette');
    const item = palette.find((p) => p.widget.id === paletteId);
    if (!item) return;
    const grid = gridRef.current;
    const span = clampSpan(normalizePosition(item.widget).span);
    placeWidget(item, grid ? pointerToCell(grid, e.clientX, e.clientY, span) : undefined);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(createLayoutFromWidgets(baseScreen.screen.id, canvas));
      setDirty(false);
      setMessage('Homepage layout saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const startBlank = () => {
    updateCanvas(() => []);
    setSelectedId(null);
    setMessage('Canvas cleared. Save to keep an empty homepage.');
  };

  const loadDefault = () => {
    updateCanvas(() => defaultCanvas());
    setSelectedId(null);
    setMessage('Default layout loaded — save to apply it.');
  };

  const activeId = preview?.id ?? null;
  const placeholder =
    preview?.mode === 'move' ? layoutPositions.get(preview.id) ?? null : null;

  const live = (
    <ScreenContextProvider
      initialContext={baseScreen.screen.context}
      asOf={baseScreen.screen.trust.asOf}
    >
      <div
        className={`og2p-dash-root og2p-hlb-stage ${preview ? 'is-interacting' : ''}`}
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest('.og2p-hlb-slot')) setSelectedId(null);
        }}
      >
        <main className="og2p-dash-page" aria-label={baseScreen.screen.title}>
          {canvas.length === 0 ? (
            <div
              className="og2p-hlb-empty"
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropPaletteOnGrid}
            >
              <b>Your homepage is empty</b>
              <p>
                {showAddWidget
                  ? 'Use “Add widget” to place widgets, or load the default layout.'
                  : 'Load the default layout to start again.'}
              </p>
              <button type="button" className="og2p-hlb-btn" onClick={loadDefault}>
                Load default layout
              </button>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="og2p-dash-grid og2p-hlb-grid"
              style={{ minHeight: (occupiedRows + 3) * ROW_STEP_PX }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropPaletteOnGrid}
            >
              {placeholder ? (
                <div
                  className="og2p-hlb-placeholder"
                  style={gridPlacementStyle(placeholder)}
                  aria-hidden
                />
              ) : null}
              {renderable.map((widget) => {
                const isActive = widget.id === activeId;
                const isMoving = isActive && preview?.mode === 'move';
                const position = isMoving
                  ? normalizePosition(widget)
                  : layoutPositions.get(widget.id) ?? normalizePosition(widget);
                const shown = isActive ? preview!.position : position;
                return (
                  <WidgetFrame
                    key={widget.id}
                    widget={widget}
                    position={position}
                    sizeLabel={`${shown.span} × ${shown.rowSpan ?? 1}`}
                    state={
                      isActive
                        ? preview!.mode === 'move'
                          ? 'dragging'
                          : 'resizing'
                        : selectedId === widget.id
                          ? 'selected'
                          : 'idle'
                    }
                    setSlotEl={setSlotEl}
                    onRemove={removeWidget}
                    onPointerDown={onSlotPointerDown}
                    onResizePointerDown={onResizePointerDown}
                    onPointerMove={onSlotPointerMove}
                    onPointerEnd={onSlotPointerEnd}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>
    </ScreenContextProvider>
  );

  return (
    <div className="og2p-hlb">
      <header ref={headerRef} className="og2p-hlb-header">
        <div className="og2p-hlb-heading">
          <div className="og2p-hlb-title-row">
            <h1 className="og2p-hlb-title">Homepage layout</h1>
            {dirty ? <span className="og2p-hlb-dirty">Unsaved changes</span> : null}
          </div>
          <p className="og2p-hlb-sub">
            Drag a widget to move it. Pull any edge or corner to resize. Press Esc to
            cancel a drag.
          </p>
        </div>

        <div className="og2p-hlb-actions">
          {showAddWidget ? (
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
                      onClick={() => placeWidget(item)}
                    >
                      <span>{item.label}</span>
                      <span className="og2p-hlb-add-type">{item.widget.type}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="og2p-hlb-btn-group" role="group" aria-label="Layout presets">
            <button type="button" className="og2p-hlb-btn ghost" onClick={startBlank}>
              Start blank
            </button>
            <button type="button" className="og2p-hlb-btn ghost" onClick={loadDefault}>
              Load default
            </button>
            <button
              type="button"
              className="og2p-hlb-btn ghost"
              onClick={() => void onResetToDefault()}
            >
              Reset saved
            </button>
          </div>

          <span className="og2p-hlb-divider" aria-hidden />

          {onCancel ? (
            <button type="button" className="og2p-hlb-btn" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
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

      {dataSource ? (
        <DashboardDataProvider api={dataSource}>{live}</DashboardDataProvider>
      ) : (
        live
      )}

      {message ? (
        <div className="og2p-hlb-toast" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
}

export { createLayoutFromWidgets };
