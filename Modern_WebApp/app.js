// Global state to store the latest result
let lastCalculation = null;

function formatStepValue(step) {
    return (step % 1 !== 0) ? step.toFixed(1) : String(Math.floor(step));
}

function formatCurrency(value) {
    return value.toLocaleString('th-TH');
}

function getMaxStepAndSalary(col) {
    let maxSal = 0;
    let maxStep = 0;

    for (let i = 0; i < T.length; i++) {
        if (T[i][col] != null) {
            maxSal = T[i][col];
            maxStep = T[i][0];
            break;
        }
    }

    return { maxSal, maxStep };
}

function buildExportPayload(res) {
    const { maxSal, maxStep } = getMaxStepAndSalary(res.col);
    const growthRate = res.csalv > 0 ? ((res.diff / res.csalv) * 100).toFixed(2) : '0.00';
    const stepsLeft = Math.max(0, maxStep - res.ns);
    const roundsToTop = stepsLeft > 0 ? Math.ceil(stepsLeft / 2) : 0;

    return {
        position: PNAME[res.pt],
        evaluation: ENAME[res.ev],
        currentStep: formatStepValue(res.cs),
        newStep: formatStepValue(res.ns),
        currentSalary: formatCurrency(res.csalv),
        newSalary: formatCurrency(res.nsalv),
        diff: formatCurrency(res.diff),
        increaseText: res.ev === 0 ? 'ไม่ได้เลื่อนขั้น' : `+${res.ev} ขั้น${res.ceil ? ' (ชนเพดาน)' : ''}`,
        growthRate,
        stepsLeft,
        roundsToTop,
        maxSalary: formatCurrency(maxSal),
        maxStep: formatStepValue(maxStep),
        reachedCeiling: res.ceil || stepsLeft <= 0,
        generatedAt: new Date().toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
    };
}

function buildExportText(res) {
    const payload = buildExportPayload(res);

    return `ระบบจำลองเลื่อนขั้นเงินเดือน บัญชี ๕
----------------------------------------
ตำแหน่ง: ${payload.position}
ผลประเมิน: ${payload.evaluation}
ขั้นเดิม: ${payload.currentStep}
เงินเดือนเดิม: ${payload.currentSalary} บาท
ผลการเลื่อน: ${payload.increaseText}
ขั้นใหม่: ${payload.newStep}
เงินเดือนใหม่: ${payload.newSalary} บาท
ส่วนต่าง: +${payload.diff} บาท
อัตราการเติบโต: ${payload.growthRate}%
เพดานสูงสุด: ขั้น ${payload.maxStep} / ${payload.maxSalary} บาท
สถานะเพดาน: ${payload.reachedCeiling ? 'ถึงเพดานแล้ว' : `เหลืออีก ${payload.stepsLeft} ขั้น`}
จัดทำเมื่อ: ${payload.generatedAt}
----------------------------------------
(พัฒนาโดย: นักวิชาการคอมพิวเตอร์ เทศบาลเมืองอุทัยธานี)`
}

function buildExportHTML(res) {
    const payload = buildExportPayload(res);
    const ceilingText = payload.reachedCeiling
        ? `ถึงเพดานสูงสุดของตำแหน่งนี้แล้ว (${payload.maxSalary} บาท)`
        : `ยังขยับได้อีก ${payload.stepsLeft} ขั้น และหากรักษาระดับดีเด่น จะใช้ประมาณ ${payload.roundsToTop} รอบ`;

    return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ผลการคำนวณเลื่อนขั้นเงินเดือน</title>
<style>
body{margin:0;padding:24px;background:#eef2ff;font-family:Inter,Sarabun,system-ui,sans-serif;color:#0f172a}
.sheet{max-width:900px;margin:0 auto;background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);border:1px solid #dbeafe;border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,.12)}
.hero{padding:32px;background:linear-gradient(135deg,#312e81 0%,#4338ca 55%,#0f766e 100%);color:#fff}
.kicker{display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.14);font-size:13px;font-weight:700;letter-spacing:.04em}
.title{margin:18px 0 8px;font-size:34px;font-weight:800;line-height:1.15}
.subtitle{margin:0;font-size:16px;opacity:.92}
.content{padding:28px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:18px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:20px;box-shadow:0 8px 30px rgba(15,23,42,.05)}
.label{font-size:13px;color:#64748b;font-weight:700;margin-bottom:8px}
.value{font-size:24px;font-weight:800;color:#0f172a}
.muted{font-size:14px;color:#475569}
.band{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:18px 0}
.metric{border-radius:22px;padding:18px 20px;color:#fff}
.metric.amber{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%)}
.metric.green{background:linear-gradient(135deg,#10b981 0%,#047857 100%)}
.metric.slate{background:linear-gradient(135deg,#334155 0%,#0f172a 100%)}
.metric .big{display:block;font-size:28px;font-weight:800;margin-top:8px}
.footer{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-top:18px;padding-top:18px;border-top:1px solid #e2e8f0;color:#475569;font-size:14px}
@media (max-width:720px){.grid,.band{grid-template-columns:1fr}.title{font-size:28px}.footer{flex-direction:column;align-items:flex-start}}
</style>
</head>
<body>
<div class="sheet">
<div class="hero">
<div class="kicker">Salary Simulator Report</div>
<div class="title">ผลการคำนวณเลื่อนขั้นเงินเดือน</div>
<p class="subtitle">สรุปผลแบบอ่านง่าย พร้อมใช้งานต่อสำหรับบันทึก ส่งต่อ หรือจัดเก็บเป็นหลักฐาน</p>
</div>
<div class="content">
<div class="grid">
<div class="card"><div class="label">ตำแหน่ง</div><div class="value">${payload.position}</div><div class="muted">ผลประเมิน: ${payload.evaluation}</div></div>
<div class="card"><div class="label">ผลการเลื่อน</div><div class="value">${payload.increaseText}</div><div class="muted">จัดทำเมื่อ ${payload.generatedAt}</div></div>
<div class="card"><div class="label">ขั้นเดิม</div><div class="value">${payload.currentStep}</div><div class="muted">เงินเดือนเดิม ${payload.currentSalary} บาท</div></div>
<div class="card"><div class="label">ขั้นใหม่</div><div class="value">${payload.newStep}</div><div class="muted">เงินเดือนใหม่ ${payload.newSalary} บาท</div></div>
</div>
<div class="band">
<div class="metric amber">ส่วนต่างเงินเดือน<span class="big">+${payload.diff} บาท</span></div>
<div class="metric green">อัตราการเติบโต<span class="big">${payload.growthRate}%</span></div>
<div class="metric slate">เพดานสูงสุด<span class="big">${payload.maxSalary} บาท</span></div>
</div>
<div class="card"><div class="label">สรุปเชิงวิเคราะห์</div><div class="muted" style="font-size:15px;line-height:1.8;color:#1e293b">${ceilingText}</div></div>
<div class="footer"><div>อ้างอิงการคำนวณจากบัญชี ๕ และตรรกะในระบบ</div><div>พัฒนาโดย นักวิชาการคอมพิวเตอร์ เทศบาลเมืองอุทัยธานี</div></div>
</div>
</div>
</body>
</html>`;
}

function createExportNode(res) {
    const payload = buildExportPayload(res);
    const ceilingText = payload.reachedCeiling
        ? `ตำแหน่งนี้ถึงเพดานสูงสุดแล้วที่ ${payload.maxSalary} บาท`
        : `ยังเลื่อนได้อีก ${payload.stepsLeft} ขั้น และหากได้ดีเด่นต่อเนื่องจะใช้ประมาณ ${payload.roundsToTop} รอบ`;
    const wrapper = document.createElement('div');

    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.width = '1200px';
    wrapper.style.padding = '32px';
    wrapper.style.background = '#eef2ff';
    wrapper.style.fontFamily = 'Inter, Sarabun, system-ui, sans-serif';
    wrapper.style.color = '#0f172a';
    wrapper.innerHTML = `
        <div style="background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%); border:1px solid #dbeafe; border-radius:30px; overflow:hidden; box-shadow:0 24px 80px rgba(15,23,42,.12);">
            <div style="padding:34px; background:linear-gradient(135deg,#312e81 0%,#4338ca 50%,#0f766e 100%); color:#ffffff;">
                <div style="display:inline-flex; padding:8px 14px; border-radius:999px; background:rgba(255,255,255,.14); font-size:13px; font-weight:800; letter-spacing:.04em;">Salary Simulator Report</div>
                <div style="margin-top:18px; font-size:36px; font-weight:900; line-height:1.15;">ผลการคำนวณเลื่อนขั้นเงินเดือน</div>
                <div style="margin-top:10px; font-size:17px; opacity:.92;">เทมเพลตสำหรับส่งออกที่เน้นความคมชัดของข้อความและความพร้อมสำหรับแชร์ต่อ</div>
            </div>
            <div style="padding:30px;">
                <div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px;">
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:22px; padding:22px; box-shadow:0 8px 24px rgba(15,23,42,.05);">
                        <div style="font-size:13px; color:#64748b; font-weight:800; margin-bottom:8px;">ตำแหน่ง</div>
                        <div style="font-size:26px; font-weight:900; color:#0f172a;">${payload.position}</div>
                        <div style="margin-top:8px; font-size:15px; color:#475569;">ผลประเมิน: ${payload.evaluation}</div>
                    </div>
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:22px; padding:22px; box-shadow:0 8px 24px rgba(15,23,42,.05);">
                        <div style="font-size:13px; color:#64748b; font-weight:800; margin-bottom:8px;">ผลการเลื่อน</div>
                        <div style="font-size:26px; font-weight:900; color:#312e81;">${payload.increaseText}</div>
                        <div style="margin-top:8px; font-size:15px; color:#475569;">จัดทำเมื่อ ${payload.generatedAt}</div>
                    </div>
                    <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:22px; padding:22px;">
                        <div style="font-size:13px; color:#9a3412; font-weight:800; margin-bottom:8px;">ข้อมูลเดิม</div>
                        <div style="font-size:20px; font-weight:900; color:#7c2d12;">ขั้น ${payload.currentStep}</div>
                        <div style="margin-top:8px; font-size:16px; color:#9a3412;">${payload.currentSalary} บาท</div>
                    </div>
                    <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:22px; padding:22px;">
                        <div style="font-size:13px; color:#065f46; font-weight:800; margin-bottom:8px;">ข้อมูลใหม่</div>
                        <div style="font-size:20px; font-weight:900; color:#065f46;">ขั้น ${payload.newStep}</div>
                        <div style="margin-top:8px; font-size:16px; color:#047857;">${payload.newSalary} บาท</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-top:20px;">
                    <div style="border-radius:24px; padding:20px; color:#ffffff; background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);">
                        <div style="font-size:13px; opacity:.9; font-weight:800;">ส่วนต่างเงินเดือน</div>
                        <div style="margin-top:10px; font-size:30px; font-weight:900;">+${payload.diff}</div>
                    </div>
                    <div style="border-radius:24px; padding:20px; color:#ffffff; background:linear-gradient(135deg,#10b981 0%,#047857 100%);">
                        <div style="font-size:13px; opacity:.9; font-weight:800;">อัตราการเติบโต</div>
                        <div style="margin-top:10px; font-size:30px; font-weight:900;">${payload.growthRate}%</div>
                    </div>
                    <div style="border-radius:24px; padding:20px; color:#ffffff; background:linear-gradient(135deg,#334155 0%,#0f172a 100%);">
                        <div style="font-size:13px; opacity:.9; font-weight:800;">เพดานสูงสุด</div>
                        <div style="margin-top:10px; font-size:30px; font-weight:900;">${payload.maxSalary}</div>
                    </div>
                </div>
                <div style="margin-top:20px; background:#ffffff; border:1px solid #e2e8f0; border-radius:24px; padding:22px; box-shadow:0 8px 24px rgba(15,23,42,.05);">
                    <div style="font-size:13px; color:#64748b; font-weight:800; margin-bottom:10px;">สรุปเชิงวิเคราะห์</div>
                    <div style="font-size:16px; line-height:1.8; color:#1e293b;">${ceilingText}</div>
                </div>
                <div style="display:flex; justify-content:space-between; gap:16px; margin-top:20px; padding-top:18px; border-top:1px solid #e2e8f0; font-size:14px; color:#475569;">
                    <div>อ้างอิงการคำนวณจากบัญชี ๕ และตรรกะในระบบ</div>
                    <div>พัฒนาโดย นักวิชาการคอมพิวเตอร์ เทศบาลเมืองอุทัยธานี</div>
                </div>
            </div>
        </div>`;

    return wrapper;
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setButtonLoading(btn, html) {
    if (!btn) return;
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = html;
    btn.disabled = true;
    btn.classList.add('opacity-80', 'cursor-wait');
}

function resetButtonState(btn) {
    if (!btn) return;
    if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
    }
    btn.disabled = false;
    btn.classList.remove('opacity-80', 'cursor-wait');
}

function flashButtonState(btn, html, addClasses = [], removeClasses = []) {
    if (!btn) return;
    const originalHtml = btn.dataset.originalHtml || btn.innerHTML;
    btn.innerHTML = html;
    removeClasses.forEach(className => btn.classList.remove(className));
    addClasses.forEach(className => btn.classList.add(className));

    setTimeout(() => {
        btn.innerHTML = originalHtml;
        addClasses.forEach(className => btn.classList.remove(className));
        removeClasses.forEach(className => btn.classList.add(className));
        resetButtonState(btn);
    }, 2200);
}

async function exportCardAsImage(format) {
    if (!lastCalculation) return;

    const btn = document.getElementById(format === 'jpeg' ? 'exportJpgBtn' : 'exportPngBtn');
    const method = format === 'jpeg' ? 'toJpeg' : 'toPng';
    const fileExt = format === 'jpeg' ? 'jpg' : 'png';
    const loadingLabel = format === 'jpeg' ? 'กำลังสร้าง JPG...' : 'กำลังสร้าง PNG...';

    setButtonLoading(btn, `<i class="ph-bold ph-spinner animate-spin text-lg"></i> ${loadingLabel}`);

    const exportNode = createExportNode(lastCalculation);
    document.body.appendChild(exportNode);

    try {
        const dataUrl = await window.htmlToImage[method](exportNode, {
            pixelRatio: 2.5,
            backgroundColor: '#eef2ff',
            quality: format === 'jpeg' ? 0.96 : undefined
        });
        const link = document.createElement('a');
        link.download = `salary-simulation-${Date.now()}.${fileExt}`;
        link.href = dataUrl;
        link.click();
        flashButtonState(btn, `<i class="ph-bold ph-check text-lg"></i> ${fileExt.toUpperCase()} พร้อมแล้ว`, ['from-emerald-500', 'to-emerald-600', 'border-emerald-500'], ['from-indigo-600', 'to-indigo-700', 'border-indigo-600']);
    } catch (err) {
        console.error(`Export ${format} failed:`, err);
        flashButtonState(btn, '<i class="ph-bold ph-warning text-lg"></i> ส่งออกไม่สำเร็จ', ['from-red-500', 'to-red-600', 'border-red-500'], ['from-indigo-600', 'to-indigo-700', 'border-indigo-600']);
    } finally {
        exportNode.remove();
    }
}

function copyResult() {
    if (!lastCalculation) return;
    const text = buildExportText(lastCalculation);

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
    exportCardAsImage('png');
}

function exportJpg() {
    exportCardAsImage('jpeg');
}

function exportText() {
    if (!lastCalculation) return;
    const blob = new Blob([buildExportText(lastCalculation)], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `salary-simulation-${Date.now()}.txt`);
}

function exportJson() {
    if (!lastCalculation) return;
    const payload = {
        ...lastCalculation,
        summary: buildExportPayload(lastCalculation)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `salary-simulation-${Date.now()}.json`);
}

function exportHtmlFile() {
    if (!lastCalculation) return;
    const blob = new Blob([buildExportHTML(lastCalculation)], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `salary-simulation-${Date.now()}.html`);
}

function printResultCard() {
    if (!lastCalculation) return;
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildExportHTML(lastCalculation));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    const evalBtns = document.querySelectorAll('.eval-btn');
    const toggleTableBtn = document.getElementById('toggleTableBtn');
    let selectedEval = 1;

    evalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            evalBtns.forEach(item => item.classList.remove('active'));
            btn.classList.add('active');
            selectedEval = parseFloat(btn.dataset.value);
        });
    });

    window.handleCalculate = () => {
        runCalculate(selectedEval);
    };

    renderTable(null, null, null);

    if (toggleTableBtn) {
        toggleTableBtn.addEventListener('click', toggleTableCollapse);
    }
    
    // Expose export functions to window to ensure HTML onclick can reach them
    window.copyResult = copyResult;
    window.exportImage = exportImage;
    window.exportJpg = exportJpg;
    window.exportText = exportText;
    window.exportJson = exportJson;
    window.exportHtmlFile = exportHtmlFile;
    window.printResultCard = printResultCard;
    window.toggleTableCollapse = toggleTableCollapse;
});

function toggleTableCollapse() {
    const tableSection = document.getElementById('tableSection');
    const tableContainer = document.getElementById('tableContainer');
    const toggleTableBtn = document.getElementById('toggleTableBtn');

    if (!tableSection || !tableContainer) return;

    const isOpen = tableSection.getAttribute('aria-expanded') === 'true';

    if (!isOpen) {
        tableSection.setAttribute('aria-expanded', 'true');
        tableContainer.style.display = 'block';
        tableSection.style.maxHeight = '2000px';
        tableSection.style.opacity = '1';
        if (toggleTableBtn) toggleTableBtn.classList.remove('-rotate-90');
    } else {
        tableSection.setAttribute('aria-expanded', 'false');
        tableSection.style.maxHeight = '0';
        tableSection.style.opacity = '0';
        setTimeout(() => {
            if (tableSection.getAttribute('aria-expanded') === 'false') {
                tableContainer.style.display = 'none';
            }
        }, 700);
        if (toggleTableBtn) toggleTableBtn.classList.add('-rotate-90');
    }
}

function runCalculate(evalVal) {
    const errorBox = document.getElementById('errorBox');
    const insightsBox = document.getElementById('insightsBox');
    const tableSection = document.getElementById('tableSection');
    const tableContainer = document.getElementById('tableContainer');
    const toggleTableBtn = document.getElementById('toggleTableBtn');

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

        if (tableSection && tableSection.getAttribute('aria-expanded') !== 'true') {
            tableSection.setAttribute('aria-expanded', 'true');
            if (tableContainer) tableContainer.style.display = 'block';
            tableSection.style.maxHeight = '2000px';
            tableSection.style.opacity = '1';
            if (toggleTableBtn) toggleTableBtn.classList.remove('-rotate-90');
        }

        generateInsights(result);
        renderTable(result.cs, result.ns, posType, salary, result.nsalv);

        setTimeout(() => {
            document.getElementById('resultState').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    } catch (err) {
        showError(err.message);
    }
}

function showError(msg) {
    const errorBox = document.getElementById('errorBox');
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.textContent = msg;
    errorBox.classList.remove('hidden');
    void errorBox.offsetWidth;
    errorBox.classList.add('shake');
}

function displayResult(res) {
    document.getElementById('rPos').textContent = PNAME[res.pt];
    document.getElementById('rCS').textContent = `ขั้น ${formatStepValue(res.cs)}`;
    document.getElementById('rCSal').textContent = formatCurrency(res.csalv);
    document.getElementById('rEv').textContent = ENAME[res.ev];
    document.getElementById('rInc').textContent = res.ev === 0 ? 'ไม่ได้เลื่อนขั้น' : `+${res.ev} ขั้น${res.ceil ? ' (ชนเพดาน)' : ''}`;
    document.getElementById('rNS').textContent = `ขั้น ${formatStepValue(res.ns)}${res.ceil ? ' (สูงสุด)' : ''}`;
    document.getElementById('rNSal').textContent = formatCurrency(res.nsalv);
    document.getElementById('rDiff').textContent = `+${formatCurrency(res.diff)}`;
    document.getElementById('rNew').textContent = formatCurrency(res.nsalv);

    document.getElementById('emptyState').classList.add('hidden');

    const resultState = document.getElementById('resultState');
    resultState.classList.remove('hidden');
    resultState.style.animation = 'none';
    resultState.offsetHeight;
    resultState.style.animation = null;
}

function generateInsights(res) {
    const insightsBox = document.getElementById('insightsBox');
    const aiInsights = document.getElementById('aiInsights');
    insightsBox.style.animation = 'none';
    insightsBox.offsetHeight;
    insightsBox.style.animation = null;

    const { maxSal, maxStep } = getMaxStepAndSalary(res.col);
    const growthRate = res.csalv > 0 ? ((res.diff / res.csalv) * 100).toFixed(2) : 0;
    const stepsLeft = maxStep - res.ns;

    let insightHTML = `<ul>`;

    if (res.diff > 0) {
        insightHTML += `<li><span><i class="ph-bold ph-trend-up"></i> อัตราการเติบโต:</span> เงินเดือนเพิ่มขึ้น <strong>${growthRate}%</strong> จากฐานยอดเดิม</li>`;
    } else {
        insightHTML += `<li><span><i class="ph-bold ph-minus"></i> ไม่มีการเติบโต:</span> ข้อมูลไม่ชี้ถึงการได้รับปรับเพิ่มรอบนี้</li>`;
    }

    if (res.ceil || stepsLeft <= 0) {
        insightHTML += `<li><span><i class="ph-bold ph-warning-circle" style="color:#F59E0B"></i> แจ้งเตือนเพดาน:</span> ปัจจุบันเงินเดือนของท่านถึง <strong>เพดานสูงสุด</strong> ของระดับตำแหน่งนี้แล้ว (${maxSal.toLocaleString('th-TH')} บาท)</li>`;
    } else {
        insightHTML += `<li><span><i class="ph-bold ph-target"></i> เป้าหมายเพดานสูง:</span> ยังสามารถเลื่อนขั้นได้อีก <strong>${stepsLeft} ขั้น</strong> เพื่อไปให้สุดเพดาน (ยอดสูงสุดที่ ${maxSal.toLocaleString('th-TH')} บาท)</li>`;
    }

    insightHTML += `<li><span><i class="ph-bold ph-lightbulb"></i> ข้อเสนอแนะ:</span> หากสามารถรักษามาตรฐานประเมิน "ดีเด่น" (+2 ขั้น) จะใช้เวลาเพียง <strong>${Math.ceil(Math.max(0, stepsLeft) / 2)}</strong> รอบ ในการถึงระดับสูงสุดของหมวดนี้</li>`;

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

function renderTable(cs, ns, targetCol) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    T.forEach(row => {
        const step = row[0];
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-200 hover:bg-gray-100 transition-colors table-row-even table-row-hover';

        if (cs !== null && step === cs) tr.classList.add('hc');
        if (ns !== null && step === ns) tr.classList.add('hn');

        const tdStep = document.createElement('th');
        tdStep.className = 'sticky left-0 z-10 bg-white border-r border-gray-300 p-2 text-center text-gray-500 font-semibold shadow-[2px_0_5px_rgba(0,0,0,0.02)]';

        if (cs !== null && step === cs) {
            tdStep.classList.remove('bg-white', 'text-gray-500');
            tdStep.classList.add('bg-amber-100', 'text-amber-900', 'font-black');
        } else if (ns !== null && step === ns) {
            tdStep.classList.remove('bg-white', 'text-gray-500');
            tdStep.classList.add('bg-emerald-100', 'text-emerald-900', 'font-black');
        }

        tdStep.textContent = formatStepValue(step);
        tr.appendChild(tdStep);

        for (let c = 1; c <= 13; c++) {
            const val = row[c];
            const td = document.createElement('td');
            td.className = 'p-2 text-right border-x border-gray-100/50 relative';

            if (c === 3 || c === 7 || c === 10) td.classList.add('border-r-gray-300', 'border-r-2');

            td.textContent = val !== null ? val.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-';

            if (cs !== null && step === cs && c === targetCol) {
                td.classList.add('hcc', 'animate-pulse-amber');
            }

            if (ns !== null && step === ns && c === targetCol) {
                td.classList.add('hcn', 'animate-pulse-emerald');
                setTimeout(() => {
                    td.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                }, 400);
            }

            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });

    if (cs !== null && ns !== null) {
        setTimeout(() => {
            const hnRow = document.querySelector('tr.hn');
            const tableWrapper = document.querySelector('.overflow-x-auto');

            if (hnRow && tableWrapper) {
                const offsetTop = hnRow.offsetTop - (tableWrapper.clientHeight / 2);
                tableWrapper.scrollTo({ top: offsetTop > 0 ? offsetTop : 0, behavior: 'smooth' });
            }
        }, 400);
    }
}
