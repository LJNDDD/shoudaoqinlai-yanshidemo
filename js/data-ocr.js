/**
 * 数据管理 — OCR 识别模块
 * 上传检验报告图片 → 识别 → 模糊匹配 → 用户编辑 → 保存
 */
(function () {
    'use strict';

    // OCR 抽屉元素
    var overlay = document.getElementById('ocrOverlay');
    var body = document.getElementById('ocrBody');
    var btnClose = document.getElementById('btnOcrClose');
    var btnCancel = document.getElementById('btnOcrCancel');
    var btnConfirm = document.getElementById('btnOcrConfirm');
    var btnOcrEntry = document.getElementById('btnOcrEntry');

    var ocrResult = null; // 当前识别结果

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function toast(msg, type) {
        var container = document.getElementById('toastContainer');
        var el = document.createElement('div');
        el.className = 'toast ' + (type || 'success');
        el.innerHTML = '<i class="fas fa-' + (type === 'error' ? 'exclamation-circle' : 'check-circle') + '"></i> ' + escapeHtml(msg);
        container.appendChild(el);
        setTimeout(function () { el.classList.add('fade-out'); setTimeout(function () { el.remove(); }, 300); }, 2500);
    }

    var currentMode = 'upload'; // upload | result

    /** 打开 OCR 抽屉 — 上传模式 */
    function openUpload() {
        currentMode = 'upload';
        ocrResult = null;
        btnConfirm.style.display = 'none';

        body.innerHTML = (
            '<div class="ocr-upload-area" id="ocrDropZone">' +
                '<i class="fas fa-cloud-upload-alt" style="font-size:3rem;color:#1661AB;opacity:0.4;"></i>' +
                '<p style="margin-top:1rem;font-size:0.9rem;color:#5B7A9A;">拖拽图片到此处 或 点击选择</p>' +
                '<p style="font-size:0.7rem;color:#8BA5C0;margin-top:0.3rem;">支持 JPG / PNG，检验报告单照片</p>' +
                '<input type="file" id="ocrFileInput" accept="image/*" style="display:none;">' +
                '<button class="btn btn-primary" id="btnOcrSelect" style="margin-top:1rem;">选择图片</button>' +
            '</div>' +
            '<div id="ocrLoading" style="display:none;text-align:center;padding:2rem;">' +
                '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#1661AB;"></i>' +
                '<p style="margin-top:1rem;color:#5B7A9A;">正在识别中...</p>' +
                '<p style="font-size:0.7rem;color:#8BA5C0;" id="ocrProgress"></p>' +
            '</div>'
        );

        overlay.classList.add('show');

        // 事件绑定
        var dropZone = document.getElementById('ocrDropZone');
        var fileInput = document.getElementById('ocrFileInput');
        var btnSelect = document.getElementById('btnOcrSelect');

        btnSelect.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function () { if (this.files[0]) handleFile(this.files[0]); });

        dropZone.addEventListener('click', function () { fileInput.click(); });
        dropZone.addEventListener('dragover', function (e) { e.preventDefault(); this.style.borderColor = '#1661AB'; });
        dropZone.addEventListener('dragleave', function (e) { this.style.borderColor = ''; });
        dropZone.addEventListener('drop', function (e) {
            e.preventDefault(); this.style.borderColor = '';
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        });
    }

    /** 处理文件上传 */
    function handleFile(file) {
        if (!file.type.match(/image\//)) { toast('请选择图片文件', 'error'); return; }

        var dropZone = document.getElementById('ocrDropZone');
        var loadingEl = document.getElementById('ocrLoading');
        var progressEl = document.getElementById('ocrProgress');

        dropZone.style.display = 'none';
        loadingEl.style.display = 'block';
        progressEl.textContent = '正在上传...';

        // 读取为 base64
        var reader = new FileReader();
        reader.onload = function () {
            progressEl.textContent = '正在 OCR 识别（可能需要 5-15 秒）...';
            recognizeImage(reader.result);
        };
        reader.readAsDataURL(file);
    }

    /** 调用 OCR API */
    async function recognizeImage(base64) {
        try {
            var res = await fetch('/api/ocr/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });
            var json = await res.json();
            if (!json.success) throw new Error(json.message);

            ocrResult = json.data;
            currentMode = 'result';
            renderResult();
            btnConfirm.style.display = '';
            toast('识别完成！请核对并修改数据后保存', 'success');
        } catch (e) {
            toast('OCR 识别失败: ' + (e.message || '请确保本地服务已启动'), 'error');
            openUpload(); // 回到上传模式
        }
    }

    /** 渲染识别结果编辑界面 */
    function renderResult() {
        var d = ocrResult;
        var html = '';

        // 患者信息
        html += '<h4 class="ocr-section-title"><i class="fas fa-user"></i> 患者信息</h4>';
        html += '<div class="ocr-form-row">';
        html += '<div class="form-group" style="flex:1;"><label>姓名</label><input type="text" id="ocrPatientName" value="' + escapeHtml(d.patient.name) + '"></div>';
        html += '<div class="form-group" style="flex:0 0 80px;"><label>性别</label><select id="ocrGender"><option value="男"' + (d.patient.gender === '男' ? ' selected' : '') + '>男</option><option value="女"' + (d.patient.gender === '女' ? ' selected' : '') + '>女</option></select></div>';
        html += '<div class="form-group" style="flex:0 0 100px;"><label>年龄</label><input type="text" id="ocrAge" value="' + escapeHtml(d.patient.age) + '"></div>';
        html += '</div>';

        // 就诊信息
        html += '<h4 class="ocr-section-title"><i class="fas fa-calendar-alt"></i> 就诊信息</h4>';
        html += '<div class="ocr-form-row">';
        html += '<div class="form-group" style="flex:1;"><label>检验日期</label><input type="date" id="ocrVisitDate" value="' + escapeHtml(d.visit.visitTime) + '"></div>';
        html += '<div class="form-group" style="flex:1;"><label>样本号</label><input type="text" id="ocrSampleNo" value="' + escapeHtml(d.visit.sampleNo) + '"></div>';
        html += '</div>';

        // 指标匹配表格
        html += '<h4 class="ocr-section-title"><i class="fas fa-flask"></i> 检验指标（' + d.indicators.length + ' 条）</h4>';
        html += '<div class="ocr-table-wrap"><table class="ocr-table"><thead><tr>' +
            '<th style="width:25px;">✓</th>' +
            '<th>OCR原始名称</th>' +
            '<th>检查值</th>' +
            '<th>参考值</th>' +
            '<th>匹配指标</th>' +
            '<th>置信度</th>' +
            '</tr></thead><tbody>';

        d.indicators.forEach(function (ind, i) {
            var confClass = ind.confidence_level === 'high' ? 'ocr-conf-high' : ind.confidence_level === 'medium' ? 'ocr-conf-medium' : 'ocr-conf-low';
            var confIcon = ind.confidence_level === 'high' ? '🟢' : ind.confidence_level === 'medium' ? '🟡' : '🔴';
            var matchedName = ind.matched ? ind.matched.indicator_name : '(未匹配)';
            var matchedCode = ind.matched ? ind.matched.indicator_code : '';
            html += '<tr class="ocr-row" data-idx="' + i + '">';
            html += '<td><input type="checkbox" class="ocr-row-cb" checked></td>';
            html += '<td><input type="text" class="ocr-edit-name" value="' + escapeHtml(ind.raw_name) + '" style="width:100%;"></td>';
            html += '<td><input type="text" class="ocr-edit-value" value="' + escapeHtml(ind.raw_value) + '" style="width:80px;"></td>';
            html += '<td><input type="text" class="ocr-edit-ref" value="' + escapeHtml(ind.raw_reference) + '" style="width:100px;"></td>';
            html += '<td><span class="ocr-matched-name" title="' + escapeHtml(matchedCode) + '">' + escapeHtml(matchedName) + '</span></td>';
            html += '<td><span class="ocr-conf-badge ' + confClass + '">' + confIcon + ' ' + ind.confidence + '%</span></td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';

        body.innerHTML = html;
    }

    /** 确认保存 */
    async function confirmSave() {
        if (!ocrResult) return;

        // 收集患者信息
        var patientName = document.getElementById('ocrPatientName').value.trim();
        var gender = document.getElementById('ocrGender').value;
        var age = document.getElementById('ocrAge').value.trim();

        if (!patientName) { toast('请输入患者姓名', 'error'); return; }

        // 收集就诊信息
        var visitDate = document.getElementById('ocrVisitDate').value;
        var sampleNo = document.getElementById('ocrSampleNo').value;

        // 收集选中的指标
        var selectedRows = [];
        body.querySelectorAll('.ocr-row-cb:checked').forEach(function (cb) {
            var row = cb.closest('.ocr-row');
            var idx = parseInt(row.getAttribute('data-idx'));
            var ind = ocrResult.indicators[idx];
            selectedRows.push({
                raw_name: row.querySelector('.ocr-edit-name').value,
                raw_value: row.querySelector('.ocr-edit-value').value,
                raw_reference: row.querySelector('.ocr-edit-ref').value,
                matched: ind.matched,
                confidence: ind.confidence,
            });
        });

        if (selectedRows.length === 0) { toast('请至少选择一条指标', 'error'); return; }

        try {
            // 1. 创建或查找患者
            var patients = await window.DataAPI.fetchPatients();
            var patient = patients.find(function (p) {
                return p.patient_name === patientName && p.status === 1;
            });

            if (!patient) {
                // 计算出生日期（根据年龄估算）
                var birthDate = '';
                if (age) {
                    var year = new Date().getFullYear() - parseInt(age);
                    birthDate = year + '-01-01';
                }
                patient = await window.DataAPI.createPatient({
                    patient_name: patientName,
                    gender: gender,
                    birth_date: birthDate,
                });
                toast('已创建患者: ' + patientName);
            }

            // 2. 创建就诊记录
            var visitTime = visitDate ? visitDate + 'T00:00:00' : new Date().toISOString().replace('T', ' ').substring(0, 19);
            var visit = await window.DataAPI.createVisit({
                patient_code: patient.patient_code,
                visit_time: visitTime,
            });

            // 3. 批量创建检查明细
            var created = 0, skipped = 0;
            for (var i = 0; i < selectedRows.length; i++) {
                var row = selectedRows[i];
                if (row.matched) {
                    try {
                        await window.DataAPI.createExamDetail({
                            visit_serial_no: visit.visit_serial_no,
                            exam_item_code: row.matched.exam_item_code,
                            exam_item_name: row.matched.exam_item_name,
                            indicator_code: row.matched.indicator_code,
                            indicator_name: row.matched.indicator_name,
                            exam_item_attr: '',
                            exam_value: row.raw_value,
                            reference_value: row.raw_reference,
                            qualitative_result: '',
                        });
                        created++;
                    } catch (e) { skipped++; }
                }
            }

            closeDrawer();
            toast('保存成功！创建 ' + created + ' 条明细' + (skipped > 0 ? '，跳过 ' + skipped + ' 条' : ''));

            // 刷新数据管理页面
            if (window.PatientModule) window.PatientModule.reload();
            if (window.VisitModule) {
                // 选中新创建的患者
                setTimeout(function () {
                    if (window.VisitModule.loadVisits) window.VisitModule.loadVisits(patient.patient_code);
                }, 500);
            }

        } catch (e) {
            toast('保存失败: ' + (e.message || '未知错误'), 'error');
        }
    }

    function closeDrawer() {
        overlay.classList.remove('show');
    }

    // 事件绑定
    btnOcrEntry.addEventListener('click', openUpload);
    btnClose.addEventListener('click', closeDrawer);
    btnCancel.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDrawer(); });
    btnConfirm.addEventListener('click', confirmSave);

})();
