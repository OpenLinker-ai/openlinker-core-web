function count(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

export function skillDirectoryCountState({
  directoryTotal,
  filteredTotal,
  shown,
  filterActive,
}) {
  const normalizedDirectoryTotal = count(directoryTotal);
  const normalizedFilteredTotal = filterActive
    ? Math.min(count(filteredTotal), normalizedDirectoryTotal)
    : normalizedDirectoryTotal;

  return {
    directoryTotal: normalizedDirectoryTotal,
    filteredTotal: normalizedFilteredTotal,
    shown: Math.min(count(shown), normalizedFilteredTotal),
    filterActive: Boolean(filterActive),
    allCount: normalizedDirectoryTotal,
    activeFilterCount: normalizedFilteredTotal,
  };
}
