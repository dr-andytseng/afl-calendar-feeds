// Final copy step: staged files -> docs/.
// NOTE: this is a SEQUENTIAL multi-file copy, not an atomic rename.
// If copyFn throws part-way through, some files in destRoot will already
// have been replaced and there is NO rollback. Callers must treat any
// throw as a fatal build failure (the workflow will not commit/push).

import { copyFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

export function copyStagedOutputs(stagingDir, destRoot, outputs, copyFn = copyFileSync) {
  const copied = [];
  for (const { relativePath } of outputs) {
    const dest = join(destRoot, relativePath);
    mkdirSync(dirname(dest), { recursive: true });
    copyFn(join(stagingDir, relativePath), dest);
    copied.push(relativePath);
  }
  return copied;
}
