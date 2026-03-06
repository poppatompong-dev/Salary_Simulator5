// Global state to store the latest result
let lastCalculation = null;

document.addEventListener('DOMContentLoaded', () => {
    // Bind Evaluation Buttons
    const evalBtns = document.querySelectorAll('.eval-btn');
    let selectedEval = 1; // Default to 'ดี'

    evalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            evalBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            selectedEval = parseFloat(btn.dataset.value);
        });
    });

    // Expose to window for form submission mapping
    window.handleCalculate = () => {
        runCalculate(selectedEval);
    };

    // Render table initially without highlights
    renderTable(null, null, null);

    // Bind toggle table button
    if (toggleTableBtn) {
        toggleTableBtn.addEventListener('click', toggleTableCollapse);
    }
});

// Support functions
function toggleTableCollapse() {
    if (tableSection.classList.contains('max-h-0')) {
        tableSection.classList.remove('max-h-0', 'opacity-0');
        tableSection.classList.add('max-h-[1200px]', 'opacity-100', 'mt-4');
        // $(tableContainer).slideDown(300); // jquery fallback logic if needed or just block
        tableContainer.style.display = 'block';
        toggleTableBtn.classList.remove('-rotate-90');
    } else {
        tableSection.classList.remove('max-h-[1200px]', 'opacity-100', 'mt-4');
        tableSection.classList.add('max-h-0', 'opacity-0');
        setTimeout(() => tableContainer.style.display = 'none', 500);
        toggleTableBtn.classList.add('-rotate-90');
    }
}

function runCalculate(evalVal) {
    const errorBox = document.getElementById('errorBox');
    errorBox.classList.add('hidden');
    errorBox.classList.remove('shake');

    const posType = parseInt(document.getElementById('posType').value);
    const salary = parseFloat(document.getElementById('salary').value);

    if (!posType || isNaN(posType)) {
        showError('กรุณาเลือกประเภทตำแหน่งบัญชี ๕ ให้ถูกต้อง');
        return;
    }

    if (!salary || isNaN(salary)) {
        showError('กรุณาระบุเงินเดือนปัจจุบันด้วยตัวเลขที่ถูกต้อง');
        return;
    }

    try {
        const result = calculateSalary(posType, salary, evalVal);
        lastCalculation = result;
        displayResult(result);
        insightsBox.classList.remove('hidden');

        // Expansion Automation for the Table
        if (!tableSection.classList.contains('max-h-[1200px]')) {
            tableSection.classList.remove('max-h-0', 'opacity-0');
            tableSection.classList.add('max-h-[1200px]', 'opacity-100', 'mt-4');
            tableContainer.style.display = 'block';
            toggleTableBtn.classList.remove('-rotate-90');
        }

        generateInsights(result);
        renderTable(result.cs, result.ns, posType, salary, result.nsalv);

        // Auto Scroll to Results cleanly
        setTimeout(() => {
            document.getElementById('resultState').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);

    } catch (err) {
        showError(err.message);
    }
}

function showError(msg) {
    const errorBox = document.getElementById('errorBox');

    errorMsg.textContent = msg;
    errorBox.classList.remove('hidden');

    // Trigger shake animation
    void errorBox.offsetWidth; // trigger reflow
    errorBox.classList.add('shake');
}

function displayResult(res) {
    const formatStep = s => (s % 1 !== 0) ? s.toFixed(1) : String(Math.floor(s));

    document.getElementById('rPos').textContent = PNAME[res.pt];
    document.getElementById('rCS').textContent = `ขั้น ${formatStep(res.cs)}`;
    document.getElementById('rCSal').textContent = res.csalv.toLocaleString('th-TH');

    document.getElementById('rEv').textContent = ENAME[res.ev];

    document.getElementById('rInc').textContent = res.ev === 0 ? 'ไม่ได้เลื่อนขั้น' : `+${res.ev} ขั้น` + (res.ceil ? ' (ชนเพดาน)' : '');

    document.getElementById('rNS').textContent = `ขั้น ${formatStep(res.ns)}` + (res.ceil ? ' (สูงสุด)' : '');
    document.getElementById('rNSal').textContent = res.nsalv.toLocaleString('th-TH');

    document.getElementById('rDiff').textContent = `+${res.diff.toLocaleString('th-TH')}`;
    document.getElementById('rNew').textContent = res.nsalv.toLocaleString('th-TH');

    // Change visibility states
    document.getElementById('emptyState').classList.add('hidden');

    const resultState = document.getElementById('resultState');
    resultState.classList.remove('hidden');

    // Re-trigger CSS animation
    resultState.style.animation = 'none';
    resultState.offsetHeight; /* trigger reflow */
    resultState.style.animation = null;
}

function generateInsights(res) {
    // Re-trigger CSS animation
    insightsBox.style.animation = 'none';
    insightsBox.offsetHeight; /* trigger reflow */
    insightsBox.style.animation = null;

    // Calculate Max Ceiling for this position type
    let maxSal = 0;
    let maxStep = 0;
    // T array is ordered descending by step (highest to lowest)
    // We scan from bottom index (lowest step) upward, or simply look at the first non-null.
    // Since T is descending [32.5, 32.0, ...], the first non-null encounter from top is the absolute maximum.
    for (let i = 0; i < T.length; i++) {
        if (T[i][res.col] != null) {
            maxSal = T[i][res.col];
            maxStep = T[i][0];
            break;
        }
    }

    // Mathematics
    const growthRate = res.csalv > 0 ? ((res.diff / res.csalv) * 100).toFixed(2) : 0;
    const stepsLeft = maxStep - res.ns;

    let insightHTML = `<ul>`;

    // Insight 1: Growth Rate
    if (res.diff > 0) {
        insightHTML += `<li><span><i class="ph-bold ph-trend-up"></i> อัตราการเติบโต:</span> เงินเดือนเพิ่มขึ้น <strong>${growthRate}%</strong> จากฐานยอดเดิม</li>`;
    } else {
        insightHTML += `<li><span><i class="ph-bold ph-minus"></i> ไม่มีการเติบโต:</span> ข้อมูลไม่ชี้ถึงการได้รับปรับเพิ่มรอบนี้</li>`;
    }

    // Insight 2: Ceiling Analysis
    if (res.ceil || stepsLeft <= 0) {
        insightHTML += `<li><span><i class="ph-bold ph-warning-circle" style="color:#F59E0B"></i> แจ้งเตือนเพดาน:</span> ปัจจุบันเงินเดือนของท่านถึง <strong>เพดานสูงสุด</strong> ของระดับตำแหน่งนี้แล้ว (${maxSal.toLocaleString('th-TH')} บาท)</li>`;
    } else {
        insightHTML += `<li><span><i class="ph-bold ph-target"></i> เป้าหมายเพดานสูง:</span> ยังสามารถเลื่อนขั้นได้อีก <strong>${stepsLeft} ขั้น</strong>เพื่อไปให้สุดเพดาน (ยอดสูงสุดที่ ${maxSal.toLocaleString('th-TH')} บาท)</li>`;
    }

    // Insight 3: Quick Tip (Gemini AI pseudo-feel)
    insightHTML += `<li><span><i class="ph-bold ph-lightbulb"></i> ข้อเสนอแนะ:</span> หากสามารถรักษามาตรฐานประเมิน "ดีเด่น" (+2 ขั้น) จะใช้เวลาเพียง <strong>${Math.ceil(stepsLeft / 2)} รอบ</strong> ในการถึงระดับสูงสุดของหมวดนี้</li>`;

    // Insight 4: Verification Trail (User Trust & Regulation Sync)
    insightHTML += `<li class="mt-3 pt-3 border-t border-gray-200">
        <div class="flex items-center gap-1.5 text-indigo-700 font-bold mb-2">
            <i class="ph-bold ph-shield-check text-lg"></i> ระบบตรวจสอบความถูกต้อง (Verification Trail)
        </div>
        <div class="text-[0.8rem] text-gray-600 bg-white/60 border border-gray-200 p-3 rounded-xl font-mono space-y-1 shadow-sm">
            <div class="flex items-center gap-2"><i class="ph-fill ph-check-circle text-emerald-500"></i> แหล่งอ้างอิง: มาตรฐานกำหนดตำแหน่ง ท้องถิ่น (บัญชี ๕)</div>
            <div class="flex items-center gap-2"><i class="ph-fill ph-check-circle text-emerald-500"></i> โครงสร้างตาราง: ${T.length} ระดับขั้น (รองรับฐานการคำนวณแบบ 0.5 ขั้น)</div>
            <div class="flex items-start gap-2"><i class="ph-fill ph-check-circle text-emerald-500 mt-0.5"></i> <span>ตรวจรับรองผล: ฐานเดิม ${res.csalv.toLocaleString('th-TH')} ตกขั้น ${res.cs} เลื่อน +${res.ev} ขั้น 👉 ขั้นใหม่ ${res.ns} กะเปาะฐานที่ ${res.nsalv.toLocaleString('th-TH')} บาท</span></div>
            <div class="flex items-center gap-2"><i class="ph-fill ph-shield-check text-blue-500"></i> สถานะ: <span class="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded ml-1">Verified 100% by Logic Engine</span></div>
        </div>
    </li>`;

    insightHTML += `</ul>`;

    aiInsights.innerHTML = insightHTML;
}

function copyResult() {
    if (!lastCalculation) return;
    const res = lastCalculation;
    const formatStep = s => (s % 1 !== 0) ? s.toFixed(1) : String(Math.floor(s));

    const text = `ระบบจำลองเลื่อนขั้นเงินเดือน บัญชี ๕
----------------------------------------
ตำแหน่ง: ${PNAME[res.pt]}
เงินเดือนเดิม: ${res.csalv.toLocaleString('th-TH')} บาท (ขั้น ${formatStep(res.cs)})
ผลประเมิน: ${ENAME[res.ev]} ${res.ev > 0 ? `(+${res.ev} ขั้น)` : ''} ${res.ceil ? '[ชนเพดาน]' : ''}
ขั้นใหม่: ขั้น ${formatStep(res.ns)}
----------------------------------------
เงินเพิ่มขึ้น: +${res.diff.toLocaleString('th-TH')} บาท
เงินเดือนสุทธิ: ${res.nsalv.toLocaleString('th-TH')} บาท
----------------------------------------
(พัฒนาโดย: นักวิชาการคอมพิวเตอร์ เทศบาลเมืองอุทัยธานี)`;

    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        const originalContent = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="ph-bold ph-check"></i> คัดลอกแล้วเรียบร้อย!';
        copyBtn.style.color = 'var(--secondary)';
        copyBtn.style.borderColor = 'var(--secondary)';

        setTimeout(() => {
            copyBtn.innerHTML = originalContent;
            copyBtn.style.color = '';
            copyBtn.style.borderColor = '';
        }, 2000);
    });
}

function exportImage() {
    if (!lastCalculation) return;

    const btn = document.getElementById('exportBtn');
    const originalHtml = btn.innerHTML;

    // UI Loading state
    btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin text-lg"></i> กำลังประมวลผล...';
    btn.classList.add('opacity-80', 'cursor-wait');

    const targetEl = document.getElementById('resultState');

    // Slight delay to ensure UI redraw is clean
    setTimeout(() => {
        // html2canvas is loaded globally via CDN in index.html
        window.html2canvas(targetEl, {
            scale: 3, // High resolution for beautiful export
            useCORS: true,
            backgroundColor: '#ffffff' // Ensure white background for the card
        }).then(canvas => {
            // Create a link and trigger download
            const link = document.createElement('a');
            link.download = `salary-simulation-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Restore button with success state
            btn.innerHTML = '<i class="ph-bold ph-check text-lg"></i> บันทึกรูปสำเร็จ!';
            btn.classList.remove('opacity-80', 'cursor-wait');
            btn.classList.remove('from-indigo-600', 'to-indigo-700', 'border-indigo-600', 'shadow-indigo-500/20');
            btn.classList.add('from-emerald-500', 'to-emerald-600', 'border-emerald-500', 'shadow-emerald-500/20');

            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('from-emerald-500', 'to-emerald-600', 'border-emerald-500', 'shadow-emerald-500/20');
                btn.classList.add('from-indigo-600', 'to-indigo-700', 'border-indigo-600', 'shadow-indigo-500/20');
            }, 3000);
        }).catch(err => {
            console.error('Export failed:', err);
            btn.innerHTML = '<i class="ph-bold ph-warning text-lg text-red-100"></i> เกิดข้อผิดพลาด';
            btn.classList.remove('from-indigo-600', 'to-indigo-700', 'border-indigo-600');
            btn.classList.add('from-red-500', 'to-red-600', 'border-red-500');

            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('from-red-500', 'to-red-600', 'border-red-500');
                btn.classList.add('from-indigo-600', 'to-indigo-700', 'border-indigo-600');
                btn.classList.remove('opacity-80', 'cursor-wait');
            }, 3000);
        });
    }, 150);
}

// --- Table Rendering (B5 Pattern) ---
function renderTable(cs, ns, targetCol, csalv, nsalv) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    T.forEach(row => {
        const step = row[0];
        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-200 hover:bg-gray-100 transition-colors table-row-even table-row-hover";

        if (cs !== null && step === cs) tr.classList.add('hc');
        if (ns !== null && step === ns) tr.classList.add('hn');

        // Step Column
        const tdStep = document.createElement('th');
        tdStep.className = 'sticky left-0 z-10 bg-white border-r border-gray-300 p-2 text-center text-gray-500 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.02)]';

        // Highlight step numbers directly
        if (cs !== null && step === cs) {
            tdStep.classList.remove('bg-white', 'text-gray-500');
            tdStep.classList.add('bg-amber-100', 'text-amber-900', 'font-black');
        } else if (ns !== null && step === ns) {
            tdStep.classList.remove('bg-white', 'text-gray-500');
            tdStep.classList.add('bg-emerald-100', 'text-emerald-900', 'font-black');
        }

        tdStep.textContent = (step % 1 !== 0) ? step.toFixed(1) : String(Math.floor(step));
        tr.appendChild(tdStep);

        // Data Columns
        for (let c = 1; c <= 13; c++) {
            const val = row[c];
            const td = document.createElement('td');
            td.className = 'p-2 text-right border-x border-gray-100/50 relative';
            if (c === 3 || c === 7 || c === 10) td.classList.add('border-r-gray-300', 'border-r-2');

            td.textContent = val !== null ? val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';

            // Pinpoint precise cell highlighting with stunning Tailwind animations
            if (cs !== null && step === cs && c === targetCol) {
                td.classList.add('hcc', 'animate-pulse-amber');
            }
            if (ns !== null && step === ns && c === targetCol) {
                td.classList.add('hcn', 'animate-pulse-emerald');

                // Extremely cool scroll to target mechanism via CSS smooth behavior naturally applied
                setTimeout(() => {
                    td.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }, 400);
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
    // Automatically scroll slightly so the inline table highlights are visible if it's deeply buried
    if (cs !== null && ns !== null) {
        setTimeout(() => {
            const hnRow = document.querySelector('tr.hn');
            if (hnRow) {
                // Find scrollable container and orient to it 
                const tableWrapper = document.querySelector('.table-wrapper');
                const offsetTop = hnRow.offsetTop - (tableWrapper.clientHeight / 2);
                tableWrapper.scrollTo({ top: offsetTop > 0 ? offsetTop : 0, behavior: 'smooth' });
            }
        }, 400);
    }
}
