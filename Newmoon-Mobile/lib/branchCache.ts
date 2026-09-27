import { deleteJsonItem, getJsonItem, setJsonItem } from './appStorage';

const BRANCH_CACHE_KEY = 'cached_branch_id';

export async function saveResolvedBranchId(branchId: string | number): Promise<void> {
  await setJsonItem(BRANCH_CACHE_KEY, {
    branchId: String(branchId),
    savedAt: new Date().toISOString(),
  });
}

export async function getResolvedBranchId(): Promise<string | null> {
  const cached = await getJsonItem<{ branchId: string }>(BRANCH_CACHE_KEY);
  return cached?.branchId ?? null;
}

export async function clearResolvedBranchId(): Promise<void> {
  await deleteJsonItem(BRANCH_CACHE_KEY);
}