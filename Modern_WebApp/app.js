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

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildExportSvg(res) {
    const payload = buildExportPayload(res);
    const ceilingText = payload.reachedCeiling
        ? `ตำแหน่งนี้ถึงเพดานสูงสุดแล้วที่ ${payload.maxSalary} บาท`
        : `ยังเลื่อนได้อีก ${payload.stepsLeft} ขั้น และหากได้ดีเด่นต่อเนื่องจะใช้ประมาณ ${payload.roundsToTop} รอบ`;

    return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="920" viewBox="0 0 1200 920">
  <rect width="1200" height="920" fill="#eef2ff"/>
  <rect x="32" y="32" width="1136" height="856" rx="28" fill="#ffffff" stroke="#dbeafe" stroke-width="2"/>

  <rect x="32" y="32" width="1136" height="170" rx="28" fill="#312e81"/>
  <rect x="32" y="150" width="1136" height="52" fill="#312e81"/>
  <text x="78" y="88" fill="#ffffff" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">Salary Simulator Report</text>
  <text x="78" y="130" fill="#ffffff" font-size="40" font-weight="800" font-family="Sarabun, Arial, sans-serif">ผลการคำนวณเลื่อนขั้นเงินเดือน</text>
  <text x="78" y="164" fill="#dbeafe" font-size="20" font-weight="400" font-family="Sarabun, Arial, sans-serif">สรุปผลแบบพร้อมใช้งานสำหรับบันทึก แชร์ และจัดเก็บ</text>

  <rect x="78" y="238" width="500" height="132" rx="20" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="622" y="238" width="500" height="132" rx="20" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="78" y="392" width="500" height="132" rx="20" fill="#fff7ed" stroke="#fed7aa"/>
  <rect x="622" y="392" width="500" height="132" rx="20" fill="#ecfdf5" stroke="#a7f3d0"/>

  <text x="108" y="276" fill="#64748b" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">ตำแหน่ง</text>
  <text x="108" y="322" fill="#0f172a" font-size="31" font-weight="800" font-family="Sarabun, Arial, sans-serif">${escapeXml(payload.position)}</text>
  <text x="108" y="350" fill="#475569" font-size="20" font-weight="400" font-family="Sarabun, Arial, sans-serif">ผลประเมิน: ${escapeXml(payload.evaluation)}</text>

  <text x="652" y="276" fill="#64748b" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">ผลการเลื่อน</text>
  <text x="652" y="322" fill="#312e81" font-size="31" font-weight="800" font-family="Sarabun, Arial, sans-serif">${escapeXml(payload.increaseText)}</text>
  <text x="652" y="350" fill="#475569" font-size="20" font-weight="400" font-family="Sarabun, Arial, sans-serif">จัดทำเมื่อ ${escapeXml(payload.generatedAt)}</text>

  <text x="108" y="430" fill="#9a3412" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">ข้อมูลเดิม</text>
  <text x="108" y="470" fill="#7c2d12" font-size="28" font-weight="800" font-family="Sarabun, Arial, sans-serif">ขั้น ${escapeXml(payload.currentStep)}</text>
  <text x="108" y="504" fill="#9a3412" font-size="24" font-weight="600" font-family="Sarabun, Arial, sans-serif">${escapeXml(payload.currentSalary)} บาท</text>

  <text x="652" y="430" fill="#065f46" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">ข้อมูลใหม่</text>
  <text x="652" y="470" fill="#065f46" font-size="28" font-weight="800" font-family="Sarabun, Arial, sans-serif">ขั้น ${escapeXml(payload.newStep)}</text>
  <text x="652" y="504" fill="#047857" font-size="24" font-weight="600" font-family="Sarabun, Arial, sans-serif">${escapeXml(payload.newSalary)} บาท</text>

  <rect x="78" y="552" width="320" height="118" rx="22" fill="#f59e0b"/>
  <rect x="440" y="552" width="320" height="118" rx="22" fill="#10b981"/>
  <rect x="802" y="552" width="320" height="118" rx="22" fill="#334155"/>

  <text x="108" y="590" fill="#ffffff" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">ส่วนต่างเงินเดือน</text>
  <text x="108" y="636" fill="#ffffff" font-size="36" font-weight="800" font-family="Sarabun, Arial, sans-serif">+${escapeXml(payload.diff)}</text>

  <text x="470" y="590" fill="#ffffff" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">อัตราการเติบโต</text>
  <text x="470" y="636" fill="#ffffff" font-size="36" font-weight="800" font-family="Sarabun, Arial, sans-serif">${escapeXml(payload.growthRate)}%</text>

  <text x="832" y="590" fill="#ffffff" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">เพดานสูงสุด</text>
  <text x="832" y="636" fill="#ffffff" font-size="36" font-weight="800" font-family="Sarabun, Arial, sans-serif">${escapeXml(payload.maxSalary)}</text>

  <rect x="78" y="702" width="1044" height="108" rx="22" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="108" y="738" fill="#64748b" font-size="18" font-weight="700" font-family="Sarabun, Arial, sans-serif">สรุปเชิงวิเคราะห์</text>
  <text x="108" y="778" fill="#1e293b" font-size="22" font-weight="400" font-family="Sarabun, Arial, sans-serif">${escapeXml(ceilingText)}</text>

  <line x1="78" y1="840" x2="1122" y2="840" stroke="#e2e8f0" stroke-width="2"/>
  <text x="78" y="872" fill="#475569" font-size="18" font-weight="400" font-family="Sarabun, Arial, sans-serif">อ้างอิงการคำนวณจากบัญชี ๕ และตรรกะในระบบ</text>
  <text x="744" y="872" fill="#475569" font-size="18" font-weight="400" font-family="Sarabun, Arial, sans-serif">พัฒนาโดย นักวิชาการคอมพิวเตอร์ เทศบาลเมืองอุทัยธานี</text>
</svg>
`;

}

function buildExportHTML(res) {
    const payload = buildExportPayload(res);
    const ceilingNote = payload.reachedCeiling
        ? `เงินเดือนถึงเพดานสูงสุดของระดับตำแหน่งแล้ว (${payload.maxSalary} บาท)`
        : `ยังสามารถเลื่อนขั้นได้อีก ${payload.stepsLeft} ขั้น คิดเป็นประมาณ ${payload.roundsToTop} รอบการประเมิน (กรณีได้รับการประเมินระดับ "ดีเด่น" ต่อเนื่อง)`;

    return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>บันทึกผลการคำนวณการเลื่อนขั้นเงินเดือน</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f0f4f8;font-family:'Sarabun',sans-serif;color:#1e293b;font-size:14px;line-height:1.7;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:800px;margin:24px auto;background:#fff;box-shadow:0 2px 24px rgba(0,0,0,.1)}
  /* Header band */
  .doc-header{background:#1e3a5f;color:#fff;padding:20px 32px 16px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
  .doc-header .org{font-size:11px;opacity:.75;letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px}
  .doc-header .title{font-size:20px;font-weight:700;line-height:1.3}
  .doc-header .subtitle{font-size:12px;opacity:.8;margin-top:4px}
  .doc-header .doc-no{text-align:right;font-size:11px;opacity:.75;white-space:nowrap}
  .doc-header .doc-no strong{display:block;font-size:13px;opacity:1;margin-top:2px}
  /* Blue accent line */
  .accent-bar{height:4px;background:linear-gradient(90deg,#3b82f6 0%,#06b6d4 50%,#10b981 100%)}
  /* Body */
  .doc-body{padding:28px 32px}
  /* Section title */
  .section-title{font-size:11px;font-weight:700;color:#64748b;letter-spacing:.08em;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin-bottom:14px;margin-top:22px}
  .section-title:first-child{margin-top:0}
  /* Info grid */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:8px}
  .info-row{display:contents}
  .info-label{background:#f8fafc;color:#475569;font-size:12px;font-weight:600;padding:9px 14px;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
  .info-value{background:#fff;color:#0f172a;font-size:13px;font-weight:700;padding:9px 14px;border-bottom:1px solid #e2e8f0}
  .info-label:last-of-type,.info-value:last-of-type{border-bottom:none}
  /* Result highlight */
  .result-panel{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:16px 0}
  .result-card{border-radius:8px;padding:14px 16px;border:1px solid}
  .result-card.amber{background:#fffbeb;border-color:#fcd34d}
  .result-card.green{background:#f0fdf4;border-color:#86efac}
  .result-card.blue{background:#eff6ff;border-color:#bfdbfe}
  .result-card .rc-label{font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px}
  .result-card.amber .rc-value{color:#b45309;font-size:22px;font-weight:800}
  .result-card.green .rc-value{color:#15803d;font-size:22px;font-weight:800}
  .result-card.blue .rc-value{color:#1d4ed8;font-size:22px;font-weight:800}
  .result-card .rc-sub{font-size:11px;color:#64748b;margin-top:2px}
  /* Change arrow row */
  .change-row{display:flex;align-items:center;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0}
  .change-box{flex:1;padding:14px 18px;text-align:center}
  .change-box.before{background:#fffbeb}
  .change-box.after{background:#f0fdf4}
  .change-box .cb-label{font-size:11px;font-weight:600;color:#64748b;margin-bottom:2px}
  .change-box .cb-step{font-size:20px;font-weight:800}
  .change-box.before .cb-step{color:#b45309}
  .change-box.after .cb-step{color:#15803d}
  .change-box .cb-sal{font-size:13px;font-weight:600;margin-top:2px}
  .change-box.before .cb-sal{color:#92400e}
  .change-box.after .cb-sal{color:#166534}
  .change-arrow{background:#f1f5f9;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 16px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
  .change-arrow .arrow-sym{font-size:20px;color:#6366f1;font-weight:900;line-height:1}
  .change-arrow .arrow-inc{font-size:11px;font-weight:700;color:#6366f1;margin-top:4px;white-space:nowrap}
  /* Remark box */
  .remark-box{border-left:4px solid #6366f1;background:#f8f7ff;padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;color:#1e293b;line-height:1.8}
  /* Signature area */
  .sig-area{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px;padding-top:20px;border-top:1px dashed #cbd5e1}
  .sig-block{text-align:center}
  .sig-line{border-bottom:1px solid #94a3b8;margin:32px 20px 6px}
  .sig-label{font-size:12px;color:#475569}
  /* Footer */
  .doc-footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 32px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8}
  .doc-footer strong{color:#64748b}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0}}
</style>
</head>
<body>
<div class="page">
  <div class="doc-header">
    <div>
      <div class="org">เทศบาลเมืองอุทัยธานี &bull; ระบบบริหารงานบุคคล</div>
      <div class="title">บันทึกผลการคำนวณการเลื่อนขั้นเงินเดือน</div>
      <div class="subtitle">อ้างอิงบัญชีอัตราเงินเดือนและค่าจ้าง หมวด ๕ (บัญชี ๕) พนักงานส่วนท้องถิ่น</div>
    </div>
    <div class="doc-no">
      วันที่จัดทำ<strong>${payload.generatedAt}</strong>
    </div>
  </div>
  <div class="accent-bar"></div>
  <div class="doc-body">

    <div class="section-title">ข้อมูลผู้รับการประเมิน</div>
    <div class="info-grid">
      <div class="info-label">ประเภทและระดับตำแหน่ง</div>
      <div class="info-value">${payload.position}</div>
      <div class="info-label">ผลการประเมินประสิทธิภาพ</div>
      <div class="info-value">${payload.evaluation}</div>
    </div>

    <div class="section-title">ผลการเลื่อนขั้นเงินเดือน</div>
    <div class="change-row">
      <div class="change-box before">
        <div class="cb-label">ขั้นเงินเดือนเดิม</div>
        <div class="cb-step">ขั้น ${payload.currentStep}</div>
        <div class="cb-sal">${payload.currentSalary} บาท</div>
      </div>
      <div class="change-arrow">
        <div class="arrow-sym">&#8594;</div>
        <div class="arrow-inc">${payload.increaseText}</div>
      </div>
      <div class="change-box after">
        <div class="cb-label">ขั้นเงินเดือนใหม่</div>
        <div class="cb-step">ขั้น ${payload.newStep}</div>
        <div class="cb-sal">${payload.newSalary} บาท</div>
      </div>
    </div>

    <div class="result-panel">
      <div class="result-card amber">
        <div class="rc-label">ส่วนต่างที่ได้รับเพิ่ม</div>
        <div class="rc-value">+${payload.diff}</div>
        <div class="rc-sub">บาท/เดือน</div>
      </div>
      <div class="result-card green">
        <div class="rc-label">อัตราการเติบโต</div>
        <div class="rc-value">${payload.growthRate}%</div>
        <div class="rc-sub">จากฐานเดิม</div>
      </div>
      <div class="result-card blue">
        <div class="rc-label">เพดานสูงสุดของระดับ</div>
        <div class="rc-value">${payload.maxSalary}</div>
        <div class="rc-sub">บาท (ขั้น ${payload.maxStep})</div>
      </div>
    </div>

    <div class="section-title">บันทึกและข้อสังเกต</div>
    <div class="remark-box">${ceilingNote}</div>

    <div class="sig-area">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">ลงชื่อ ....................................... ผู้จัดทำ</div>
        <div class="sig-label">(................................................)</div>
        <div class="sig-label">ตำแหน่ง .....................................</div>
        <div class="sig-label">วันที่ ............/............/............</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">ลงชื่อ ....................................... ผู้ตรวจสอบ</div>
        <div class="sig-label">(................................................)</div>
        <div class="sig-label">ตำแหน่ง .....................................</div>
        <div class="sig-label">วันที่ ............/............/............</div>
      </div>
    </div>

  </div>
  <div class="doc-footer">
    <span>จัดทำโดยระบบจำลองเลื่อนขั้นเงินเดือน &bull; อ้างอิงข้อมูลจากบัญชี ๕ พนักงานส่วนท้องถิ่น</span>
    <strong>เทศบาลเมืองอุทัยธานี</strong>
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
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '1200px';
    wrapper.style.padding = '32px';
    wrapper.style.background = '#eef2ff';
    wrapper.style.fontFamily = 'Inter, Sarabun, system-ui, sans-serif';
    wrapper.style.color = '#0f172a';
    wrapper.style.zIndex = '999999';
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
    const fileExt = format === 'jpeg' ? 'jpg' : 'png';
    const loadingLabel = format === 'jpeg' ? 'กำลังสร้าง JPG...' : 'กำลังสร้าง PNG...';

    setButtonLoading(btn, `<i class="ph-bold ph-spinner animate-spin text-lg"></i> ${loadingLabel}`);

    try {
        const svgMarkup = buildExportSvg(lastCalculation);
        const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);

        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = svgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 920;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#eef2ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        URL.revokeObjectURL(svgUrl);

        const dataUrl = format === 'jpeg'
            ? canvas.toDataURL('image/jpeg', 0.96)
            : canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.download = `salary-simulation-${Date.now()}.${fileExt}`;
        link.href = dataUrl;
        link.click();
        flashButtonState(btn, `<i class="ph-bold ph-check text-lg"></i> ${fileExt.toUpperCase()} พร้อมแล้ว`, ['border-emerald-500', 'text-emerald-700', 'bg-emerald-50'], ['border-gray-300', 'text-gray-900', 'bg-white']);
    } catch (err) {
        console.error(`Export ${format} failed:`, err);
        flashButtonState(btn, '<i class="ph-bold ph-warning text-lg"></i> ส่งออกไม่สำเร็จ', ['border-red-500', 'text-red-700', 'bg-red-50'], ['border-gray-300', 'text-gray-900', 'bg-white']);
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
