export const formatChartDate = (value: string): string => {
  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}`;
  }
  return value;
};

export const buildAxisIndexes = (
  count: number,
  minLabels: number,
  maxLabels: number,
): Set<number> => {
  if (count <= 0) {
    return new Set();
  }
  if (count <= minLabels) {
    return new Set(Array.from({ length: count }, (_, index) => index));
  }

  const targetLabels = Math.min(maxLabels, Math.max(minLabels, count));
  const step = (count - 1) / (targetLabels - 1);
  const indexes = new Set<number>();
  for (let i = 0; i < targetLabels; i += 1) {
    indexes.add(Math.round(i * step));
  }
  indexes.add(count - 1);
  return indexes;
};

export const buildYAxisLabels = (
  min: number,
  max: number,
  minLabels: number,
  maxLabels: number,
  formatValue: (value: number) => string,
): string[] => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }

  const normalizedMin = Math.min(min, max);
  const normalizedMax = Math.max(min, max);
  const labelCount = Math.min(maxLabels, Math.max(minLabels, 4));

  if (normalizedMax === normalizedMin) {
    return Array.from({ length: labelCount }, () => formatValue(normalizedMax));
  }

  const range = normalizedMax - normalizedMin;
  return Array.from({ length: labelCount }, (_, index) => {
    const value = normalizedMax - (range * index) / (labelCount - 1);
    return formatValue(value);
  });
};
