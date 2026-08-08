export type SkillDirectoryCountState = {
  directoryTotal: number;
  filteredTotal: number;
  shown: number;
  filterActive: boolean;
  allCount: number;
  activeFilterCount: number;
};

export function skillDirectoryCountState(input: {
  directoryTotal: number;
  filteredTotal: number;
  shown: number;
  filterActive: boolean;
}): SkillDirectoryCountState;
