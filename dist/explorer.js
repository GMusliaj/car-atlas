// Shared scene and interaction rules; no browser or renderer dependency.
export const systems = [
  {id: 'powertrain', name: 'Engine & transmission', color: '#8b7161', parts: ['engine', 'gearbox']},
  {id: 'transfer', name: 'Transfer case', color: '#528e84', parts: ['transfer', 'casecover', 'inputshaft', 'outputshaft', 'frontoutput', 'clutch', 'chain', 'actuator', 'ballramp', 'bearings']},
  {id: 'shafts', name: 'Propeller shafts', color: '#658baf', parts: ['frontshaft', 'rearshaft']},
  {id: 'axles', name: 'Axles & wheels', color: '#948366', parts: ['frontdiff', 'reardiff', 'wheels']},
  {id: 'chassis', name: 'Chassis & suspension', color: '#829476', parts: ['chassis']},
  {id: 'body', name: 'Body wireframe', color: '#9b7d91', parts: ['bodywork']},
];
export const systemFor = id => systems.find(system => system.parts.includes(id));
export const presets = {
  all: systems.map(system => system.id),
  drivetrain: ['powertrain', 'transfer', 'shafts', 'axles'],
  transfer: ['transfer'],
};
export function isPartVisible(id, {visible, selected, isolate}) {
  if (isolate && selected !== 'overview') {
    return id === selected || (selected === 'transfer' && systemFor(id)?.id === 'transfer');
  }
  return visible.includes(systemFor(id)?.id);
}
export function findParts(data, query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return data.filter(part => part[0] !== 'overview' && terms.every(term =>
    `${part[0]} ${part[1]} ${part[2]} ${systemFor(part[0])?.name}`.toLowerCase().includes(term)));
}
// A gesture that ever becomes a drag or multi-touch cannot become a tap again.
export function createTapTracker(threshold = 6) {
  let start = null, eligible = false;
  return {
    down(id, x, y, count) { if (count === 1) { start = {id, x, y}; eligible = true; } else eligible = false; },
    move(id, x, y) { if (start?.id === id && Math.hypot(x - start.x, y - start.y) > threshold) eligible = false; },
    up(id, x, y) { const tap = eligible && start?.id === id && Math.hypot(x - start.x, y - start.y) <= threshold; eligible = false; return tap; },
    cancel() { eligible = false; start = null; },
  };
}
