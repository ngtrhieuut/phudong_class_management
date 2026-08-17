export interface LevelDefinition {
  name: string;
  minScore: number;
  maxScore?: number | null;
  sortOrder?: number;
}

export const DEFAULT_LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  { name: 'Giai đoạn 1', minScore: 0, maxScore: 49, sortOrder: 1 },
  { name: 'Giai đoạn 2', minScore: 50, maxScore: 149, sortOrder: 2 },
  { name: 'Giai đoạn 3', minScore: 150, maxScore: 299, sortOrder: 3 },
  { name: 'Giai đoạn 4', minScore: 300, maxScore: 499, sortOrder: 4 },
  { name: 'Giai đoạn 5', minScore: 500, maxScore: null, sortOrder: 5 },
];

function validateScore(score: number): void {
  if (!Number.isInteger(score) || score < 0) {
    throw new RangeError('lifetimeScore must be a non-negative integer.');
  }
}

function validateDefinition(definition: LevelDefinition): void {
  if (!definition.name.trim()) {
    throw new RangeError('A level name must not be blank.');
  }
  if (!Number.isInteger(definition.minScore) || definition.minScore < 0) {
    throw new RangeError('A level minScore must be a non-negative integer.');
  }
  if (
    definition.maxScore !== null &&
    definition.maxScore !== undefined &&
    (!Number.isInteger(definition.maxScore) || definition.maxScore < definition.minScore)
  ) {
    throw new RangeError('A level maxScore must be greater than or equal to minScore.');
  }
}

/** Resolve a level without mutating the definitions supplied by the caller. */
export function resolveLevel(
  lifetimeScore: number,
  definitions: readonly LevelDefinition[] = DEFAULT_LEVEL_DEFINITIONS,
): LevelDefinition | null {
  validateScore(lifetimeScore);
  definitions.forEach(validateDefinition);

  const sortedDefinitions = [...definitions].sort(
    (left, right) => right.minScore - left.minScore || (left.sortOrder ?? 0) - (right.sortOrder ?? 0),
  );

  return (
    sortedDefinitions.find(
      (definition) =>
        definition.minScore <= lifetimeScore &&
        (definition.maxScore === null ||
          definition.maxScore === undefined ||
          lifetimeScore <= definition.maxScore),
    ) ??
    sortedDefinitions.find((definition) => definition.minScore <= lifetimeScore) ??
    null
  );
}

export const resolveCurrentLevel = resolveLevel;

export function getNextLevel(
  lifetimeScore: number,
  definitions: readonly LevelDefinition[] = DEFAULT_LEVEL_DEFINITIONS,
): LevelDefinition | null {
  validateScore(lifetimeScore);
  definitions.forEach(validateDefinition);
  return (
    [...definitions]
      .filter((definition) => definition.minScore > lifetimeScore)
      .sort((left, right) => left.minScore - right.minScore)[0] ?? null
  );
}
