import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force';
import { Maximize2, RefreshCw, Waypoints } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { CharacterDocument } from '../../shared/schema';
import { cn } from '../lib/cn';
import { buildGraph, endpoints, type GraphEdge, type GraphNode } from '../lib/graph';
import { useLinks } from '../lib/linkContext';
import { colorClasses } from '../lib/palette';
import { useSettings } from '../lib/settingsStore';
import { TagChip } from './TagChip';
import { Button, IconButton } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Tooltip } from './ui/Tooltip';

/* -------------------------------------------------------------------------- */
/* Appearance                                                                  */
/* -------------------------------------------------------------------------- */

const radius = (node: GraphNode): number =>
  node.kind === 'self' ? 20 : Math.min(17, 6 + 2.4 * Math.sqrt(node.degree));

const STANDING_ALPHA: Record<string, number> = { Close: 0.85, Known: 0.55, Met: 0.32 };

function edgeStyle(edge: GraphEdge): { stroke: string; width: number; dash?: string } {
  const alpha = (edge.standing && STANDING_ALPHA[edge.standing]) ?? 0.45;
  const token = edge.kind === 'coin' ? '--wj-gold' : edge.kind === 'location' ? '--wj-sage' : '--wj-ink';
  return {
    stroke: `rgb(var(${token}) / ${alpha})`,
    width: 1 + Math.min(2, edge.weight * 0.4) + (edge.standing === 'Close' ? 0.6 : 0),
    ...(edge.kind === 'location' ? { dash: '4 3' } : {}),
  };
}

const NODE_TOKEN: Record<string, string> = {
  gold: '--wj-gold',
  ember: '--wj-ember',
  copper: '--wj-copper',
  sage: '--wj-sage',
  frost: '--wj-frost',
  plum: '--wj-plum',
  rose: '--wj-rose',
};

/* -------------------------------------------------------------------------- */
/* The view                                                                    */
/* -------------------------------------------------------------------------- */

interface WebViewProps {
  doc: CharacterDocument;
  activeTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClearTags: () => void;
}

export function WebView({ doc, activeTagIds, onToggleTag, onClearTags }: WebViewProps) {
  const { openEntry, openOverview } = useLinks();
  const container = useRef<HTMLDivElement | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);
  const layer = useRef<SVGGElement | null>(null);
  const simulation = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const transform = useRef({ k: 1, x: 0, y: 0 });
  const memory = useRef(new Map<string, { x: number; y: number }>());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [, bump] = useState(0);
  // Fit the settled graph to the canvas once per layout; never yank a view the player has moved.
  const fitted = useRef(false);

  const { hideSecrets } = useSettings();
  const graph = useMemo(() => buildGraph(doc, { tagIds: activeTagIds, hideSecrets }), [doc, activeTagIds, hideSecrets]);
  const nodesById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node] as const)), [graph]);

  const tagsInWeb = useMemo(() => {
    const used = new Set(graph.nodes.flatMap((node) => node.tagIds));
    for (const id of activeTagIds) used.add(id);
    return doc.tags.filter((tag) => used.has(tag.id));
  }, [graph, doc.tags, activeTagIds]);

  // Keep the canvas sized to its box.
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const applyTransform = () => {
    const { k, x, y } = transform.current;
    layer.current?.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
  };

  /** Zoom and pan so every node (with its label) sits inside the canvas. */
  const fitToView = () => {
    const xs = graph.nodes.map((node) => node.x ?? 0);
    const ys = graph.nodes.map((node) => node.y ?? 0);
    if (xs.length === 0 || !size.width || !size.height) return;
    const pad = 36;
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad + 12;
    const k = Math.min(1.35, Math.max(0.35, Math.min(size.width / (maxX - minX), size.height / (maxY - minY))));
    transform.current = {
      k,
      x: (size.width - (maxX + minX) * k) / 2,
      y: (size.height - (maxY + minY) * k) / 2,
    };
    applyTransform();
  };

  // The simulation. Positions are written straight to the DOM on every tick;
  // React only re-renders when the data or the hover changes.
  useEffect(() => {
    if (!size.width || !size.height || graph.nodes.length < 2) return;
    const centre = { x: size.width / 2, y: size.height / 2 };
    for (const node of graph.nodes) {
      const remembered = memory.current.get(node.id);
      if (remembered) {
        node.x = remembered.x;
        node.y = remembered.y;
      } else if (node.x === undefined) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * Math.min(size.width, size.height) * 0.3;
        node.x = centre.x + Math.cos(angle) * distance;
        node.y = centre.y + Math.sin(angle) * distance;
      }
      if (node.kind === 'self') {
        node.fx = centre.x;
        node.fy = centre.y;
      }
    }

    const root = layer.current;
    const nodeElements = new Map<string, SVGGElement>();
    const edgeElements = new Map<string, SVGLineElement>();
    root?.querySelectorAll<SVGGElement>('[data-node-id]').forEach((element) => {
      nodeElements.set(element.dataset.nodeId ?? '', element);
    });
    root?.querySelectorAll<SVGLineElement>('[data-edge-id]').forEach((element) => {
      edgeElements.set(element.dataset.edgeId ?? '', element);
    });

    const sim = forceSimulation<GraphNode, GraphEdge>(graph.nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphEdge>(graph.edges)
          .id((node) => node.id)
          .distance((edge) => (edge.kind === 'coin' ? 120 : 95))
          .strength((edge) => Math.min(1, 0.35 + edge.weight * 0.15)),
      )
      .force('charge', forceManyBody<GraphNode>().strength((node) => (node.kind === 'self' ? -700 : -260)))
      // Room for the label under each node, so names rarely sit on top of each other.
      .force('collide', forceCollide<GraphNode>((node) => radius(node) + 16))
      .force('x', forceX<GraphNode>(centre.x).strength(0.035))
      .force('y', forceY<GraphNode>(centre.y).strength(0.035))
      .alpha(1)
      .alphaDecay(0.028)
      .on('tick', () => {
        // Keep every node on the canvas; a lonely node has nothing but the weak centre pull.
        for (const node of graph.nodes) {
          const margin = radius(node) + 24;
          node.x = Math.max(margin, Math.min(size.width - margin, node.x ?? centre.x));
          node.y = Math.max(margin, Math.min(size.height - margin - 8, node.y ?? centre.y));
        }
        for (const edge of graph.edges) {
          const element = edgeElements.get(edge.id);
          const source = typeof edge.source === 'string' ? nodesById.get(edge.source) : edge.source;
          const target = typeof edge.target === 'string' ? nodesById.get(edge.target) : edge.target;
          if (!element || !source || !target) continue;
          element.setAttribute('x1', String(source.x ?? 0));
          element.setAttribute('y1', String(source.y ?? 0));
          element.setAttribute('x2', String(target.x ?? 0));
          element.setAttribute('y2', String(target.y ?? 0));
        }
        for (const node of graph.nodes) {
          nodeElements.get(node.id)?.setAttribute('transform', `translate(${node.x ?? 0} ${node.y ?? 0})`);
          memory.current.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
        }
      })
      .on('end', () => {
        if (fitted.current) return;
        fitted.current = true;
        fitToView();
      });
    simulation.current = sim;
    fitted.current = false;
    applyTransform();
    return () => {
      sim.stop();
      simulation.current = null;
    };
  }, [graph, nodesById, size]);

  /* ---------------------------------------------------------------------- */
  /* Pointer interactions: drag a node, pan the canvas, wheel to zoom.       */
  /* ---------------------------------------------------------------------- */

  const gesture = useRef<
    | { kind: 'drag'; node: GraphNode; startX: number; startY: number; moved: boolean }
    | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }
    | null
  >(null);

  const toGraph = (clientX: number, clientY: number) => {
    const rect = svg.current?.getBoundingClientRect();
    const { k, x, y } = transform.current;
    return { x: ((clientX - (rect?.left ?? 0)) - x) / k, y: ((clientY - (rect?.top ?? 0)) - y) / k };
  };

  function onNodePointerDown(event: ReactPointerEvent<SVGGElement>, node: GraphNode) {
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    gesture.current = { kind: 'drag', node, startX: event.clientX, startY: event.clientY, moved: false };
    const point = toGraph(event.clientX, event.clientY);
    node.fx = point.x;
    node.fy = point.y;
    simulation.current?.alphaTarget(0.25).restart();
  }

  function onBackgroundPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    svg.current?.setPointerCapture(event.pointerId);
    gesture.current = {
      kind: 'pan',
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.current.x,
      originY: transform.current.y,
    };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (!current) return;
    if (current.kind === 'drag') {
      const point = toGraph(event.clientX, event.clientY);
      current.node.fx = point.x;
      current.node.fy = point.y;
      if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 4) current.moved = true;
    } else {
      transform.current.x = current.originX + (event.clientX - current.startX);
      transform.current.y = current.originY + (event.clientY - current.startY);
      applyTransform();
    }
  }

  function onPointerUp() {
    const current = gesture.current;
    gesture.current = null;
    if (!current || current.kind !== 'drag') return;
    simulation.current?.alphaTarget(0);
    if (current.node.kind !== 'self') {
      current.node.fx = null;
      current.node.fy = null;
    }
    if (!current.moved) {
      if (current.node.kind === 'self') openOverview();
      else openEntry(current.node.id);
    }
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    const rect = svg.current?.getBoundingClientRect();
    const px = event.clientX - (rect?.left ?? 0);
    const py = event.clientY - (rect?.top ?? 0);
    const { k, x, y } = transform.current;
    const next = Math.min(3, Math.max(0.35, k * Math.exp(-event.deltaY * 0.0012)));
    // Zoom about the cursor: keep the graph point under it fixed.
    transform.current = { k: next, x: px - ((px - x) / k) * next, y: py - ((py - y) / k) * next };
    applyTransform();
  }

  function shake() {
    for (const node of graph.nodes) {
      if (node.kind !== 'self') {
        node.fx = null;
        node.fy = null;
      }
    }
    fitted.current = false;
    simulation.current?.alpha(0.8).restart();
    bump((n) => n + 1);
  }

  /* ---------------------------------------------------------------------- */
  /* Hover emphasis                                                          */
  /* ---------------------------------------------------------------------- */

  const neighbourhood = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover.id]);
    for (const edge of graph.edges) {
      const [a, b] = endpoints(edge);
      if (a === hover.id) set.add(b);
      if (b === hover.id) set.add(a);
    }
    return set;
  }, [hover, graph.edges]);

  // A small canvas cannot carry every name; hubs and the hovered neighbourhood keep theirs.
  const compact = size.width < 900;
  const showAllLabels = graph.nodes.length <= 90 && !compact;
  const labelDegree = compact ? 3 : 2;
  const hovered = hover ? nodesById.get(hover.id) : undefined;
  const counts = { people: 0, factions: 0, places: 0 };
  for (const node of graph.nodes) {
    if (node.typeId === 'people') counts.people += 1;
    else if (node.typeId === 'factions') counts.factions += 1;
    else if (node.typeId === 'places') counts.places += 1;
  }

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pane:px-8">
        <div>
          <p className="wj-eyebrow">Who knows whom</p>
          <h2 className="mt-1 font-display text-[1.75rem] leading-tight tracking-title text-ink">Web</h2>
          <p className="mt-1 text-2xs text-faint">
            {counts.people} people · {counts.factions} factions · {counts.places} places · {graph.edges.length} ties
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip label="Shake the web loose">
            <IconButton variant="secondary" size="sm" aria-label="Shake" onClick={shake}>
              <RefreshCw className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
          <Tooltip label="Fit to view">
            <IconButton variant="secondary" size="sm" aria-label="Fit to view" onClick={fitToView}>
              <Maximize2 className="h-3.5 w-3.5" />
            </IconButton>
          </Tooltip>
        </div>
      </header>

      {tagsInWeb.length > 0 ? (
        <div className="px-5 pt-3 pane:px-8">
          {/* One scrolling line on a narrow window; wraps freely when there is room. */}
          <div className="wj-scroll flex items-center gap-1 overflow-x-auto pb-1 pane:flex-wrap pane:overflow-visible pane:pb-0">
            {tagsInWeb.map((tag) => (
              <TagChip
                key={tag.id}
                tag={tag}
                size="sm"
                active={activeTagIds.includes(tag.id)}
                onClick={() => onToggleTag(tag.id)}
                className="shrink-0"
              />
            ))}
            {activeTagIds.length > 0 ? (
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-2xs text-faint" onClick={onClearTags}>
                clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div ref={container} className="min-h-0 flex-1 pb-9">
        {graph.nodes.length < 2 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={Waypoints}
              title="No web to weave yet"
              hint={
                activeTagIds.length
                  ? 'No people, factions or places carry every selected tag. Clear the filter to see everyone.'
                  : 'Write [[links]] between people, factions and places, note where people are usually found, and record dealings in the ledger — the web draws itself.'
              }
            />
          </div>
        ) : (
          <svg
            ref={svg}
            width={size.width}
            height={size.height}
            className="block h-full w-full touch-none select-none"
            onPointerDown={onBackgroundPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <defs>
              <radialGradient id="wj-web-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgb(var(--wj-gold) / 0.16)" />
                <stop offset="100%" stopColor="rgb(var(--wj-gold) / 0)" />
              </radialGradient>
            </defs>
            <g ref={layer}>
              <g>
                {graph.edges.map((edge) => {
                  const style = edgeStyle(edge);
                  const [a, b] = endpoints(edge);
                  const dim = neighbourhood ? !(neighbourhood.has(a) && neighbourhood.has(b) && (a === hover?.id || b === hover?.id)) : false;
                  return (
                    <line
                      key={edge.id}
                      data-edge-id={edge.id}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash}
                      strokeLinecap="round"
                      opacity={dim ? 0.12 : 1}
                      style={{ transition: 'opacity 150ms' }}
                    />
                  );
                })}
              </g>
              <g>
                {graph.nodes.map((node) => {
                  const r = radius(node);
                  const token = NODE_TOKEN[node.color] ?? '--wj-gold';
                  const isHover = hover?.id === node.id;
                  const dim = neighbourhood ? !neighbourhood.has(node.id) : false;
                  const label =
                    node.kind === 'self' || showAllLabels || node.degree >= labelDegree || (neighbourhood?.has(node.id) ?? false);
                  return (
                    <g
                      key={node.id}
                      data-node-id={node.id}
                      className="cursor-pointer"
                      opacity={dim ? 0.22 : 1}
                      style={{ transition: 'opacity 150ms' }}
                      onPointerDown={(event) => onNodePointerDown(event, node)}
                      onPointerEnter={(event) => setHover({ id: node.id, x: event.clientX, y: event.clientY })}
                      onPointerMove={(event) => setHover((current) => (current?.id === node.id ? { id: node.id, x: event.clientX, y: event.clientY } : current))}
                      onPointerLeave={() => setHover((current) => (current?.id === node.id ? null : current))}
                    >
                      {node.kind === 'self' ? <circle r={r + 26} fill="url(#wj-web-glow)" /> : null}
                      <circle
                        r={r}
                        fill={node.kind === 'self' ? `rgb(var(--wj-gold) / 0.28)` : `rgb(var(${token}) / ${isHover ? 0.45 : 0.22})`}
                        stroke={`rgb(var(${token}) / ${node.kind === 'self' ? 1 : 0.9})`}
                        strokeWidth={isHover ? 2.5 : node.kind === 'self' ? 1.75 : 1.25}
                      />
                      {node.portrait ? (
                        <image
                          href={node.portrait}
                          x={-r + 1}
                          y={-r + 1}
                          width={r * 2 - 2}
                          height={r * 2 - 2}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ clipPath: 'circle(50%)', pointerEvents: 'none' }}
                        />
                      ) : null}
                      {node.kind === 'self' && !node.portrait ? (
                        <text
                          textAnchor="middle"
                          dy="0.35em"
                          className="font-display"
                          style={{ fontSize: 11, letterSpacing: '0.08em', fill: 'rgb(var(--wj-gold))', pointerEvents: 'none' }}
                        >
                          {initials(node.title)}
                        </text>
                      ) : null}
                      {label ? (
                        <text
                          textAnchor="middle"
                          y={r + 13}
                          className={node.kind === 'self' ? 'font-display' : 'font-sans'}
                          style={{
                            fontSize: node.kind === 'self' ? 12.5 : 10.5,
                            letterSpacing: node.kind === 'self' ? '0.08em' : undefined,
                            fill: node.kind === 'self' ? 'rgb(var(--wj-gold))' : `rgb(var(--wj-ink) / ${isHover ? 1 : 0.78})`,
                            paintOrder: 'stroke',
                            stroke: 'rgb(var(--wj-bg) / 0.85)',
                            strokeWidth: 3,
                            strokeLinejoin: 'round',
                            pointerEvents: 'none',
                          }}
                        >
                          {node.title}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        )}
      </div>

      {hovered ? (
        <div
          className="pointer-events-none fixed z-20 max-w-[16rem] rounded border bg-panel px-2.5 py-1.5 shadow-lifted"
          style={{ left: hover!.x + 14, top: hover!.y + 14 }}
        >
          <p className={cn('text-sm', hovered.kind === 'self' ? 'font-display tracking-title text-gold' : 'text-ink')}>{hovered.title}</p>
          {hovered.subtitle ? <p className="text-2xs text-muted">{hovered.subtitle}</p> : null}
          <p className="mt-0.5 text-2xs text-faint">
            {hovered.degree} tie{hovered.degree === 1 ? '' : 's'}
            {hovered.standing ? ` · ${hovered.standing}` : ''}
            {hovered.secret ? ' · secret' : ''}
          </p>
        </div>
      ) : null}

      {graph.nodes.length >= 2 ? (
        <div className="pointer-events-none absolute bottom-3 left-5 right-3 z-10 flex items-center gap-x-4 overflow-hidden whitespace-nowrap text-2xs text-faint pane:left-8">
          <Legend color="gold" label="People" />
          <Legend color="frost" label="Factions" />
          <Legend color="sage" label="Places" />
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-ink/40" /> mentions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-sage/70" /> same place
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-px w-4 bg-gold/70" /> coin
          </span>
          <span className="hidden pane:inline">drag to move · wheel to zoom · click to open</span>
        </div>
      ) : null}
    </div>
  );
}

function Legend({ color, label }: { color: 'gold' | 'frost' | 'sage'; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', colorClasses(color).dot)} />
      {label}
    </span>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/[\s'-]+/).filter(Boolean);
  const first = words[0]?.[0] ?? '?';
  const last = words.length > 1 ? words[words.length - 1]?.[0] : undefined;
  return (last ? `${first}${last}` : first).toUpperCase();
}
