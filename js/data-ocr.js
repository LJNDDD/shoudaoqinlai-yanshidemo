/**
 * 数据管理 — OCR 识别模块（百度云直连版）
 * 浏览器直接调百度 OCR API，无需 server.js
 */
(function () {
    'use strict';

    // ========== 百度 OCR 配置（前端直连，密钥会公开在网页源码中） ==========
    var BAIDU_API_KEY = 'uySaKd9FIcALlt8EcJDbGKEb';
    var BAIDU_SECRET_KEY = 'Wjpo1ropGJpF5envhYiJKBcfWKLZtJjg';
    var BAIDU_TOKEN = null; // 临时缓存

    var overlay = document.getElementById('ocrOverlay');
    var body = document.getElementById('ocrBody');
    var btnClose = document.getElementById('btnOcrClose');
    var btnCancel = document.getElementById('btnOcrCancel');
    var btnConfirm = document.getElementById('btnOcrConfirm');
    var btnOcrEntry = document.getElementById('btnOcrEntry');

    var ocrResult = null;
    var referenceCache = null; // reference_data 缓存

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

    // ========== OCR 文字提取逻辑（从 server.js 移到前端） ==========

    function levenshtein(a, b) {
        var m = a.length, n = b.length;
        var dp = []; for (var i = 0; i <= m; i++) { dp[i] = []; for (var j = 0; j <= n; j++) dp[i][j] = i === 0 ? j : j === 0 ? i : 0; }
        for (var i = 1; i <= m; i++) for (var j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        return dp[m][n];
    }

    function similarity(a, b) {
        var maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1;
        return 1 - levenshtein(a, b) / maxLen;
    }

    function matchIndicator(ocrText, refData) {
        var best = null, bestScore = 0;
        var clean = ocrText.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '').replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();
        refData.forEach(function (ref) {
            var refClean = ref.indicator_name.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '').replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();
            var score = similarity(clean, refClean);
            if (clean.indexOf(refClean) !== -1 || refClean.indexOf(clean) !== -1) score = Math.max(score, 0.8);
            if (score > bestScore) { bestScore = score; best = ref; }
        });
        return { match: best, score: bestScore };
    }

    function extractPatientInfo(text) {
        var info = { name: '', gender: '', birthDate: '', age: '' };
        var patterns = [/姓名[:：]\s*([^\n\r]+)/, /患者[:：]\s*([^\n\r]+)/, /姓名\s+([^\n\r]{2,4})/];
        for (var i = 0; i < patterns.length; i++) { var m = text.match(patterns[i]); if (m) { info.name = m[1].trim(); break; } }
        var gm = text.match(/性别[:：]\s*(男|女)/); if (gm) info.gender = gm[1];
        var am = text.match(/年龄[:：]\s*(\d+)/); if (am) info.age = am[1];
        var bm = text.match(/(?:出生日期|生日)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/); if (bm) info.birthDate = bm[1].replace(/[\/.]/g, '-');
        var diagM = text.match(/临床诊断[:：]\s*([^\n\r]+)/); if (diagM && !info.name) info.name = '患者(' + diagM[1].trim() + ')';
        return info;
    }

    function extractVisitInfo(text) {
        var info = { visitTime: '', sampleNo: '', dept: '' };
        var dm = text.match(/(?:检验日期|采样日期|送检日期|报告日期|接收时间)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/); if (dm) info.visitTime = dm[1].replace(/[\/.]/g, '-');
        var sm = text.match(/(?:样本号|标本号|条码号|编号)[:：]\s*([^\n\r]+)/); if (sm) info.sampleNo = sm[1].trim();
        var depm = text.match(/(?:科室|送检科室|申请科室)[:：]\s*([^\n\r]+)/); if (depm) info.dept = depm[1].trim();
        return info;
    }

    function extractIndicators(text) {
        var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
        var startIdx = 0;
        for (var i = 0; i < lines.length; i++) {
            if (/^(项目名称|英文与方法|结果|单位|参考值)/.test(lines[i])) {
                var j = i + 1; while (j < lines.length && lines[j].length < 15 && !/[.*\d]/.test(lines[j])) j++;
                startIdx = j; break;
            }
        }
        var indicators = [];
        var namePattern = /^[\d.*]+|.*[一-龥]/;
        for (var i = startIdx; i < lines.length - 3; i++) {
            var line = lines[i];
            if (!namePattern.test(line)) continue;
            if (/^(检验|报告|项目|序号|编号|结果|参考|单位|正常|异常|临床|接收|送检)/.test(line)) continue;
            var name = line.replace(/^[\d.*\s]+/, '').trim();
            var value = lines[i + 2] || '';
            var unit = lines[i + 3] || '';
            var reference = lines[i + 4] || '';
            if (!/^[\d.]+$/.test(value)) continue;
            if (!/[\d.<>～~]/.test(reference)) continue;
            indicators.push({ name: name, value: unit ? value + ' ' + unit : value, reference: reference });
            i += 4;
        }
        return indicators;
    }

    // ========== 百度 OCR 直接调用 ==========

    async function getBaiduToken() {
        if (BAIDU_TOKEN) return BAIDU_TOKEN;
        var url = 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=' +
            encodeURIComponent(BAIDU_API_KEY) + '&client_secret=' + encodeURIComponent(BAIDU_SECRET_KEY);
        var res = await fetch(url);
        var data = await res.json();
        if (data.error) throw new Error(data.error_description || data.error);
        BAIDU_TOKEN = data.access_token;
        return BAIDU_TOKEN;
    }

    /** 加载 reference_data（用于模糊匹配） */
    async function loadReferenceData() {
        if (referenceCache) return referenceCache;
        try {
            var res = await fetch('/mock-data/reference-indicators.json');
            referenceCache = await res.json();
        } catch (e) {
            referenceCache = [];
        }
        return referenceCache;
    }

    var currentMode = 'upload';

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
        var reader = new FileReader();
        reader.onload = function () {
            progressEl.textContent = '正在 OCR 识别中...';
            recognizeImage(reader.result);
        };
        reader.readAsDataURL(file);
    }

    /** 调用 OCR + 解析 + 匹配（全前端完成） */
    async function recognizeImage(base64) {
        try {
        var rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

        // 1. 获取百度 token
        var token = await getBaiduToken();

        // 2. 调百度 OCR
        var formData = 'image=' + encodeURIComponent(rawBase64) + '&detect_direction=false&paragraph=false';
        var res = await fetch('https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=' + token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData,
        });
        var ocrData = await res.json();
        if (ocrData.error_code) throw new Error(ocrData.error_msg || ('错误码:' + ocrData.error_code));

        // 3. 拼接文本
        var words = (ocrData.words_result || []).map(function (w) { return w.words; });
        var ocrText = words.join('\n');

        // 4. 提取字段
        var patientInfo = extractPatientInfo(ocrText);
        var visitInfo = extractVisitInfo(ocrText);
        var rawIndicators = extractIndicators(ocrText);

        // 5. 模糊匹配
        var refData = await loadReferenceData();
        var matchedIndicators = rawIndicators.map(function (ind) {
            var result = matchIndicator(ind.name, refData);
            return {
                raw_name: ind.name,
                raw_value: ind.value,
                raw_reference: ind.reference,
                matched: result.match && result.score >= 0.4 ? result.match : null,
                confidence: Math.round(result.score * 100),
                confidence_level: result.score >= 0.7 ? 'high' : result.score >= 0.4 ? 'medium' : 'low',
            };
        });

        ocrResult = {
            raw_text: ocrText,
            patient: patientInfo,
            visit: visitInfo,
            indicators: matchedIndicators,
        };

        renderResult();
        btnConfirm.style.display = '';
        toast('识别完成！请核对并修改数据后保存', 'success');
    } catch (e) {
        toast('OCR 识别失败: ' + (e.message || '未知错误'), 'error');
        openUpload();
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
