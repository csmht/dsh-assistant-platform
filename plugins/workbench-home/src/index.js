export const name = '@liang/dsh-workbench-home'
export const inject = []

/**
 * The package is intentionally client-only. Keeping a valid Host plugin makes
 * it a normal DSH Bundle without adding filesystem, process, or network access.
 */
export function apply() {}
