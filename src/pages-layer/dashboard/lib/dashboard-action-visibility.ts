export function shouldShowBulkRecrawlButton(selectedCount: number) {
  return selectedCount > 0;
}

export function shouldShowSectionRecrawlButton(isActionable: boolean, selectedCount: number) {
  return isActionable && selectedCount > 0;
}
