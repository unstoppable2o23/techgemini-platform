node : (node:8868) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of 
file:///C:/Users/Uni/Documents/techgemini-platform/src/lib/university-matching/engine.ts is not specified and it 
doesn't parse as CommonJS.
At line:1 char:48
+ ... mini-platform; node scripts/audit-score-distribution.mjs 2>&1 | Out-F ...
+                    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: ((node:8868) [MO...se as CommonJS.:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to \\?\C:\Users\Uni\Documents\techgemini-platform\package.json.
(Use `node --trace-warnings ...` to show where the warning was created)
# Score Distribution Report ÔÇö Phase 20 Audit

**Date:** 2026-08-28
**Engine:** Phase 16 program-aware, verified > curated > category, 9 dimensions

## Computer Vision Engineer
- Total candidates: 30
- MatchScores: 86, 86, 86, 83, 83, 83, 83, 83, 83, 83 ... (20 total)
- Confidences: 95, 95, 95, 92, 92, 92, 92, 92, 92, 92
- Bases: verified-program
- Range: 80ÔÇô86, avg 82.2

## Medicine
- Total candidates: 4
- MatchScores: 81, 81, 80, 80
- Confidences: 95, 95, 92, 92
- Bases: verified-program
- Range: 80ÔÇô81, avg 80.5

## Biotechnology Research
- Total candidates: 102
- MatchScores: 83, 80, 56, 56, 56, 56, 56, 56, 56, 56 ... (20 total)
- Confidences: 92, 92, 57, 57, 57, 57, 57, 57, 57, 57
- Bases: verified-program, institutionType-category
- Range: 56ÔÇô83, avg 58.5

## Business Management
- Total candidates: 105
- MatchScores: 86, 81, 81, 81, 80, 61, 61, 61, 61, 61 ... (20 total)
- Confidences: 95, 95, 95, 95, 92, 57, 57, 57, 57, 57
- Bases: verified-program, institutionType-category
- Range: 61ÔÇô86, avg 66.2

## Product Design
- Total candidates: 5337
- MatchScores: 56, 56, 56, 56, 56, 56, 56, 56, 56, 56 ... (20 total)
- Confidences: 57, 57, 57, 57, 57, 57, 57, 57, 57, 57
- Bases: institutionType-category
- Range: 56ÔÇô56, avg 56.0

## Mechanical Engineering
- Total candidates: 102
- MatchScores: 83, 80, 56, 56, 56, 56, 56, 56, 56, 56 ... (20 total)
- Confidences: 92, 92, 57, 57, 57, 57, 57, 57, 57, 57
- Bases: verified-program, institutionType-category
- Range: 56ÔÇô83, avg 58.5

## Law
- Total candidates: 3
- MatchScores: 83, 81, 80
- Confidences: 92, 95, 92
- Bases: verified-program
- Range: 80ÔÇô83, avg 81.3

## Psychology
- Total candidates: 0
- MatchScores: 
- Confidences: 
- Bases: 

## Overall distribution (107 scores across 8 careers)
- Min: 56, Max: 86, Avg: 65.4
- P25: 56, P50 (median): 56, P75: 80, P90: 83
- Histogram (10 bins):
  0-9: 0 (0.0%)
  10-19: 0 (0.0%)
  20-29: 0 (0.0%)
  30-39: 0 (0.0%)
  40-49: 0 (0.0%)
  50-59: 56 (52.3%)
  60-69: 15 (14.0%)
  70-79: 0 (0.0%)
  80-89: 36 (33.6%)
  90-99: 0 (0.0%)

**Natural cluster boundaries (from data):**
- High cluster: 80ÔÇô100 (verified programs, strong country/preference alignment)
- Mid cluster: 60ÔÇô79 (curated or verified with missing dimensions)
- Low cluster: 40ÔÇô59 (category-based, partial alignment)
- Weak: 0ÔÇô39 (no evidence, category fallback)

**Existing dimensions (9):**
- educationPathway (0.30), specialization (0.15), careerAlignment (0.10), academicFit (0.15), location (0.10), country (0.05), budget (0.05), institutionQuality (0.05), studentPreferences (0.05)
- Weights sum to 1, scores 0ÔÇô100 per dimension, applied = score * weight

## Student context variations

- India student (Karnataka, India): avg 82.2
- USA student (Karnataka, USA): avg 81.3
- No state (India): avg 82.2
