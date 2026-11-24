import { CanonicalSchema, SchemaTable } from '@schemapilot/shared-types';

export interface TopologyResult {
  orderedTables: SchemaTable[];
  hasCycles: boolean;
  cycleNodes: string[];
}

/**
 * Sorts tables in dependency order (referenced parent tables before child tables with FKs)
 * using Kahn's algorithm so DDL statements execute cleanly without FK errors.
 */
export function sortTablesByDependency(schema: CanonicalSchema): TopologyResult {
  const tableMap = new Map<string, SchemaTable>();
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, Set<string>>();

  for (const table of schema.tables) {
    tableMap.set(table.name, table);
    inDegree.set(table.name, 0);
    adjacency.set(table.name, new Set());
  }

  for (const rel of schema.relationships) {
    // sourceTable has the FK pointing to targetTable (or vice versa depending on convention)
    // In our model: sourceTable.sourceColumn -> targetTable.targetColumn (targetTable is parent)
    if (rel.sourceTable === rel.targetTable) continue; // self-referencing FK
    if (!tableMap.has(rel.sourceTable) || !tableMap.has(rel.targetTable)) continue;

    const children = adjacency.get(rel.targetTable)!;
    if (!children.has(rel.sourceTable)) {
      children.add(rel.sourceTable);
      inDegree.set(rel.sourceTable, (inDegree.get(rel.sourceTable) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(name);
  }

  const orderedNames: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    orderedNames.push(current);

    for (const child of adjacency.get(current) || []) {
      const nextDeg = (inDegree.get(child) || 1) - 1;
      inDegree.set(child, nextDeg);
      if (nextDeg === 0) {
        queue.push(child);
      }
    }
  }

  const orderedSet = new Set(orderedNames);
  const cycleNodes = schema.tables
    .map((t) => t.name)
    .filter((name) => !orderedSet.has(name));

  const orderedTables = [
    ...orderedNames.map((n) => tableMap.get(n)!),
    ...cycleNodes.map((n) => tableMap.get(n)!),
  ];

  return {
    orderedTables,
    hasCycles: cycleNodes.length > 0,
    cycleNodes,
  };
}

/**
 * Computes clean grid/layered positions for tables in an ER diagram.
 */
export function autoLayoutTables(schema: CanonicalSchema): CanonicalSchema {
  const { orderedTables } = sortTablesByDependency(schema);
  const cols = Math.max(2, Math.ceil(Math.sqrt(orderedTables.length)));
  const xSpacing = 360;
  const ySpacing = 320;

  const positioned = orderedTables.map((table, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...table,
      position: {
        x: 60 + col * xSpacing,
        y: 60 + row * ySpacing,
      },
    };
  });

  return {
    ...schema,
    tables: positioned,
  };
}
