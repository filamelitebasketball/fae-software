---
name: excel-via-excel-com-on-this-machine
description: This machine has no Python; build xlsx files by driving Excel 16.0 through PowerShell COM
metadata: 
  node_type: memory
  type: project
  originSessionId: ab203308-0207-4fac-9c71-b1aa2842bc87
  modified: 2026-08-31T09:37:56.702Z
---

No Python and no LibreOffice on this machine (only the Microsoft Store `python.exe` stub, which errors). Excel 16.0 IS installed and COM automation works, so build `.xlsx` deliverables with PowerShell COM instead of openpyxl.

Three PowerShell/COM traps that each cost a build cycle:

1. **A function returning a `Range` gets unrolled** into an object array, so `.Interior.Color` fails. Return it with `Write-Output -NoEnumerate $rng`.
2. **`SV` is a built-in alias for `Set-Variable`** and wins over a function of the same name. Don't name helpers `SV`/`SF`.
3. **The COM late binder caches the parameter type per property.** After writing a String to `.Value2`, writing a Double to it throws `0x800A03EC`. Write numbers as an invariant-culture string to `.Formula` instead; Excel parses them back into real numbers.

Also: `$home` and `$args` are read-only automatic variables. And build formula strings with **single quotes** — `"=B16*$B$7"` in double quotes silently loses `$B$7` and produces a wrong-but-error-free workbook.

Related: [[fae-league-cost-parameters]]
