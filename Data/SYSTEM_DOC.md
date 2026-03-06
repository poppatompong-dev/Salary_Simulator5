# SYSTEM_DOC: banji5_salary_calculator
version: 3.0
type: single-page-application
language: Thai (th-TH)
stack: HTML5 + CSS3 + Vanilla JavaScript (no dependencies)
source: บัญชีอัตราเงินเดือนพนักงานส่วนท้องถิ่น บัญชี ๕ (official PDF, สำนักงาน ก.จ. ก.ท. และ ก.อบต.)
scope: อบจ. / เทศบาล / อบต. — step-based salary system

---

## PURPOSE

Calculate the next salary step for Thai local government employees (พนักงานส่วนท้องถิ่น) under salary schedule บัญชี 5.

Given:
- position type (13 options across 4 groups)
- current salary (baht, exact match to table)
- performance evaluation result (5 levels)

Output:
- current step number
- new step number after promotion
- new salary amount (baht)
- difference (baht)
- whether salary ceiling was hit

---

## DATA MODEL

### Primary Table: `T`

```
Type: Array<Array<number|null>>
Shape: 63 rows × 14 columns
Index 0: step (float, range 1.0–32.5, increments of 0.5)
Index 1–13: salary in baht for each position type (integer or null)
Sort order: descending by step (row[0]=32.5 → row[62]=1.0)
```

**Column mapping (index → position type):**

```
index  posType  group              level_th              level_en
1      1        ทั่วไป              ปฏิบัติงาน            General / Operational
2      2        ทั่วไป              ชำนาญงาน              General / Skilled
3      3        ทั่วไป              อาวุโส                General / Senior
4      4        วิชาการ             ปฏิบัติการ             Professional / Practitioner
5      5        วิชาการ             ชำนาญการ              Professional / Expert
6      6        วิชาการ             ชำนาญการพิเศษ          Professional / Senior Expert
7      7        วิชาการ             เชี่ยวชาญ              Professional / Specialist  ← CRITICAL: 4th level, commonly missed
8      8        อำนวยการท้องถิ่น    ต้น                   Director Local / Junior
9      9        อำนวยการท้องถิ่น    กลาง                  Director Local / Mid
10     10       อำนวยการท้องถิ่น    สูง                   Director Local / Senior
11     11       บริหารท้องถิ่น      ต้น                   Executive Local / Junior
12     12       บริหารท้องถิ่น      กลาง                  Executive Local / Mid
13     13       บริหารท้องถิ่น      สูง                   Executive Local / Senior
```

> ⚠️ COMMON MISTAKE: วิชาการ has 4 levels (not 3). Index 7 = เชี่ยวชาญ.
> If you map วิชาการ as 3 levels, every column from index 7 onward shifts wrong.

**null semantics:**
- `null` = this step does not exist for this position type
- `null` is NOT missing data — it means the position cannot reach that step
- Example: c4 (วิชาการปฏิบัติการ) is null at step 30+ because the level caps below that

**Key null boundaries (approximate):**
```
c1  (ทั่วไปปฏิบัติงาน):   steps 1–31      null at 31.5, 32, 32.5
c4  (วิชาการปฏิบัติการ):  steps 1–29.5    null at 30+
c11 (บริหารต้น):           steps 2–32      null at 1, 1.5, 2.5
c13 (บริหารสูง):           steps 1–30      30.5–31.5 null, 32+ null
```

**Verified sample rows:**
```
step=29: [29, 23520, 38380, 49480, 29570, 44280, 61460, 69240, 44990, 62470, 70350, 45740, 63480, 78020]
step=15: [15, 14570, 24270, 31880, 18840, 28030, 38500, 44930, 28560, 39190, 45750, 29110, 39880, 49220]
step=1:  [1,  8750,  13470, 18010, 9740,  15050, 21550, 24400, 15430, 22140, 25080, null,  null,  25770]
```

---

## CALCULATION ENGINE

### Function: `calc(posType, salary, evalVal)`

**Inputs:**
```
posType  : integer 1–13  (maps directly to column index in T)
salary   : float         (exact baht value from pay slip)
evalVal  : float         one of: 0 | 0.5 | 1 | 1.5 | 2
```

**evalVal lookup:**
```
2.0  → ดีเด่น   (Outstanding)   +2 steps
1.5  → ดีมาก    (Very Good)     +1.5 steps
1.0  → ดี       (Good)          +1 step      ← default
0.5  → พอใช้    (Fair)          +0.5 steps
0.0  → ต้องปรับปรุง (Poor)       +0 steps (no promotion)
```

**Algorithm:**
```
col = posType

step 1: FIND CURRENT ROW
  curIdx = T.findIndex(row => row[col] === salary)
  if curIdx === -1: ERROR "salary not found for this position type"
  curStep = T[curIdx][0]
  curSal  = T[curIdx][col]

step 2: COMPUTE TARGET STEP
  targetStep = curStep + evalVal

step 3: FIND NEW ROW
  newIdx = T.findIndex(row => row[0] === targetStep && row[col] !== null)

step 4: HANDLE CEILING
  if newIdx === -1:
    // targetStep exceeds max step for this column
    // find the highest valid step for this column above curIdx
    newIdx = last index i where i < curIdx and T[i][col] !== null
    if no such index: newIdx = curIdx
    hitCeiling = true
  else:
    hitCeiling = false

step 5: OUTPUT
  newStep = T[newIdx][0]
  newSal  = T[newIdx][col]
  diff    = newSal - curSal
  return { curStep, curSal, newStep, newSal, diff, hitCeiling }
```

**Ceiling behavior:**
- When `hitCeiling = true`, the employee gets the maximum salary for their position type
- `diff` may still be > 0 if the current step is not the maximum (partial ceiling)
- `diff = 0` only when already at the absolute ceiling step

---

## UI COMPONENTS

### Layout
```
.header          — title bar (dark navy #1a1a2e, gold border)
.grid            — two-column: [300px input panel] [1fr result panel]
  .panel#input   — form: posType select, salary input, evalVal select, submit button
  .panel#result  — receipt card + summary box + copy button
.tsec            — collapsible full salary table (all 63 rows × 13 data cols)
```

### Input Form (`#pos`, `#sal`, `#ev`)
```
#pos  : <select> value = string "1"–"13"   → parseInt → posType
#sal  : <input type="number">              → parseFloat → salary
#ev   : <select> value = "0"/"0.5"/"1"/"1.5"/"2" → parseFloat → evalVal
```

### Result Panel DOM targets
```
#rPos   — position name string
#rCS    — "ขั้น X" current step
#rCSal  — current salary + " บาท"
#rEv    — evaluation label
#rInc   — step increment string ("+1 ขั้น" or "ไม่เลื่อนขั้น" or "+1 ขั้น (ชนเพดาน)")
#rNS    — "ขั้น X" new step (+ "(เพดานสูงสุด)" if ceiling)
#rNSal  — new salary + " บาท"
#rDiff  — "+X,XXX" increase amount
#rNew   — new salary number (summary box)
```

### Table Highlight Classes
```
tr.hc   — row background #fef9c3 (current step row)
td:fc   — first cell of .hc row: background #fef08a
td.hcc  — specific salary cell: background #fbbf24, outline #d97706  (current salary cell)
tr.hn   — row background #dcfce7 (new step row)
td:fc   — first cell of .hn row: background #bbf7d0
td.hcn  — specific salary cell: background #22c55e, color #fff       (new salary cell)
```

### Error Display
```
#err    — hidden div, shown when:
          - posType not selected
          - salary is empty/NaN
          - salary value not found in T[col] (wrong position type or typo)
```

---

## FUNCTIONS REFERENCE

### `calc()` — main entry point
```
trigger: button#btn onclick
reads:   #pos, #sal, #ev
calls:   buildTable(curStep, newStep, col)
writes:  all #r* DOM targets
side-fx: opens table (.tscr.open), scrolls tr.hc into view after 200ms
```

### `buildTable(cs, ns, col)`
```
params:
  cs  : number|null  — curStep for row highlight (null = no highlight)
  ns  : number|null  — newStep for row highlight (null = no highlight)
  col : number|null  — column index for cell highlight (null = no highlight)
behavior:
  clears tbody#tb
  iterates T[] descending (already sorted desc)
  adds tr.hc when row[0] === cs
  adds tr.hn when row[0] === ns
  adds td.hcc when row[0]===cs && colIndex===col
  adds td.hcn when row[0]===ns && colIndex===col
  td.sep added at col indices in SEP = {4, 8, 11}  (group separator borders)
  null cells render as "—" with class .e
```

### `doCopy()`
```
reads:   global `last` object set by calc()
output:  plain text copied to clipboard
format:
  บัญชีอัตราเงินเดือน บัญชี ๕ — ผลการคำนวณ
  ────────────────────────────────────────────
  ตำแหน่ง       : {posName}
  เงินเดือนเดิม  : {curSal} บาท (ขั้น {curStep})
  ผลประเมิน     : {evalLabel} (+{evalVal} ขั้น) [ชนเพดาน]?
  ขั้นใหม่       : ขั้น {newStep}
  ────────────────────────────────────────────
  เงินที่ได้เพิ่ม  : +{diff} บาท
  เงินเดือนใหม่  : {newSal} บาท
  ────────────────────────────────────────────
```

### `showErr(msg)` / `toggleT(btn)`
```
showErr  : sets #err.textContent, sets #err.style.display = "block"
toggleT  : toggles .tscr.open class, updates button label
```

---

## GLOBAL STATE

```javascript
last = {
  pt     : posType (integer 1–13),
  sal    : input salary (float),
  cs     : curStep (float),
  ns     : newStep (float),
  csalv  : curSal (integer),
  nsalv  : newSal (integer),
  diff   : nsalv - csalv (integer),
  ev     : evalVal (float),
  ceil   : hitCeiling (boolean),
  col    : column index = posType (integer)
}
```

Set by `calc()`. Read by `doCopy()`. `null` before first calculation.

---

## CONSTANTS

```javascript
PNAME = {
  1: 'ทั่วไป ปฏิบัติงาน',
  2: 'ทั่วไป ชำนาญงาน',
  3: 'ทั่วไป อาวุโส',
  4: 'วิชาการ ปฏิบัติการ',
  5: 'วิชาการ ชำนาญการ',
  6: 'วิชาการ ชำนาญการพิเศษ',
  7: 'วิชาการ เชี่ยวชาญ',
  8: 'อำนวยการท้องถิ่น ต้น',
  9: 'อำนวยการท้องถิ่น กลาง',
  10: 'อำนวยการท้องถิ่น สูง',
  11: 'บริหารท้องถิ่น ต้น',
  12: 'บริหารท้องถิ่น กลาง',
  13: 'บริหารท้องถิ่น สูง'
}

ENAME = { 2: 'ดีเด่น', 1.5: 'ดีมาก', 1: 'ดี', 0.5: 'พอใช้', 0: 'ต้องปรับปรุง' }

SEP = Set { 4, 8, 11 }  // column indices that get left-border separator in table
```

---

## ERROR CONDITIONS & EDGE CASES

### salary not found (`curIdx === -1`)
```
cause:   user entered salary that does not exist in T[col]
         OR selected wrong position type for their actual salary
message: "ไม่พบเงินเดือน {X} บาท ในตาราง บัญชี ๕ สำหรับ "{posName}" กรุณาตรวจสอบตัวเลขจากสลิป"
action:  show #err, return early, do not update results
```

### ceiling hit (`hitCeiling = true`)
```
cause:   targetStep > max valid step for this column
         OR targetStep exists in T but T[targetStep][col] === null
action:  scan upward from curIdx to find last row where T[i][col] !== null
display: rInc shows "+X ขั้น (ชนเพดาน)", rNS shows "ขั้น X (เพดานสูงสุด)"
```

### evalVal = 0 (no promotion)
```
targetStep = curStep + 0 = curStep
newIdx === curIdx
diff = 0
display: rInc shows "ไม่เลื่อนขั้น"
table still renders with hc highlight (same row for both hc and hn)
```

### half-step targets (e.g. step 15.5)
```
T contains rows for x.5 steps (1.5, 2.5, ... 32.5)
these are valid targets when evalVal = 0.5 or 1.5
float comparison T[i][0] === targetStep works correctly for all .0 and .5 values
```

---

## KNOWN DATA ISSUES

### OCR-corrupted cells (from PDF extraction)
```
step=27.5, c9 (อำนวยการกลาง): PDF OCR read "59.SOO" → corrected to 59500
step=1,   c12 (บริหารกลาง):   PDF OCR read "·""700" → set to null (unresolvable)
step=1.5, c12 (บริหารกลาง):   PDF OCR read "23~"    → set to null (unresolvable)
step=1.5, c11 (บริหารต้น):    PDF OCR read "I~"     → set to null (unresolvable)
```

### Step 28.5 OCR error (FIXED)
```
PDF OCR read step label as "285" (missing decimal point)
Corrected to 28.5 in parser. Data is correct in T[].
```

### Unresolved nulls at low steps for บริหาร group
```
T[1.5][11] = null   (บริหารต้น at step 1.5)
T[1.5][12] = null   (บริหารกลาง at step 1.5)
T[1][11]   = null   (บริหารต้น at step 1)
T[1][12]   = null   (บริหารกลาง at step 1)
T[2.5][11] = null   (บริหารต้น at step 2.5)
T[2.5][12] = null   (บริหารกลาง at step 2.5)
T[2.5][13] = null   (บริหารสูง at step 2.5)

ACTION NEEDED: Verify against physical PDF document pages 1–5
               (page 6 OCR is the primary data source used here)
```

---

## EXTENSION HOOKS

### Adding บัญชี 6 (percentage-based system, effective 10 Jan 2026+)
```
บัญชี 6 uses a different formula:
  newSalary = currentSalary + round(currentSalary × percentage / 100)
  clamped to [floorSalary, ceilingSalary] for each position band

Required new data:
  BANJI6_BANDS[posType] = { floor: number, ceiling: number, percentage: number }

New function:
  calcBanji6(posType, salary, evalVal) → { newSal, diff, hitCeiling, hitFloor }
```

### Replacing hardcoded T[] with an API
```
Current: T[] is embedded in HTML — no network call
Proposed endpoint: GET /api/banji5/salary?col={posType}&step={step}
                   GET /api/banji5/lookup?col={posType}&salary={salary}
Response shape: { step: number, salary: number|null }

No other code changes needed — replace T.findIndex() calls with await fetch()
```

### Adding multi-employee batch mode
```
Input: CSV with columns: name, posType(1-13), salary, evalVal
Processing: run calc() logic for each row
Output: CSV with added columns: newStep, newSal, diff, hitCeiling
UI hook: add <input type="file" accept=".csv"> and a download button
```

### Print / PDF export
```
Add CSS @media print:
  hide: .tbtn, .copybtn, .header .badge, .tsec toggle button
  show: .tscroll always (remove display:none override)
  page-break-before: always on .tsec
Use window.print() for browser print dialog (saves as PDF)
```

---

## CSS DESIGN TOKENS

```css
--ink:    #1a1a2e   /* header bg, panel header bg, button bg */
--paper:  #f7f4ed   /* page bg, panel bg */
--paper2: #eeeade   /* hover state, alternating table rows */
--rule:   #c8c0b0   /* all borders */
--gold:   #8b6914   /* label text, accent text */
--gold2:  #c49a28   /* focus rings, header border */
--goldhi: #f5d060   /* text on dark backgrounds */
--green:  #1a6b3a   /* new step / new salary values */
--red:    #8b1a1a   /* error messages */
```

---

## TEST CASES

```
# Format: posType, salary → expected: curStep, newStep (evalVal=1), newSal

posType=1  salary=11960  → curStep=10   newStep=11   newSal=12470   diff=510
posType=5  salary=41550  → curStep=27   newStep=28   newSal=42890   diff=1340
posType=7  salary=24400  → curStep=1    newStep=1.5  newSal=25080   diff=680
posType=8  salary=47990  → curStep=31   newStep=32   newSal=49480   diff=1490
posType=13 salary=78020  → curStep=29   newStep=30   newSal=80450   diff=2430

# Ceiling test (evalVal=2)
posType=3  salary=53310  → curStep=31.5 targetStep=33.5 → ceiling → newStep=32 newSal=54090

# No promotion (evalVal=0)
posType=2  salary=31760  → curStep=23   newStep=23   newSal=31760   diff=0
```

---

## FILE MANIFEST

```
banji5_v3.html         — complete application (single file, self-contained)
SYSTEM_DOC.md          — this document (AI-readable specification)
```

---

## VERSION HISTORY

```
v1.0  — initial build, WRONG: used percentage formula (บัญชี 6 logic) instead of step lookup
v2.0  — fixed to step-based lookup, WRONG: mapped วิชาการ as 3 levels → all columns c7–c12 off by one
v3.0  — CORRECT: 13 data columns, วิชาการเชี่ยวชาญ at c7, all column mappings verified against PDF x-coordinates
```
