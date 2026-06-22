/**
 * 数据管理 — OCR 识别模块（OCR.space 直连版）
 * 浏览器直接调 OCR.space API，无需 server.js
 */
(function () {
    'use strict';

    var OCR_API_KEY = 'K89833219088957';

    var overlay = document.getElementById('ocrOverlay');
    var body = document.getElementById('ocrBody');
    var btnClose = document.getElementById('btnOcrClose');
    var btnCancel = document.getElementById('btnOcrCancel');
    var btnConfirm = document.getElementById('btnOcrConfirm');
    var btnOcrEntry = document.getElementById('btnOcrEntry');

    var ocrResult = null;
    var referenceCache = null;

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

    /** 打开上传界面 */
    function openUpload() {
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

    /** 处理文件 */
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

    // ========== OCR 文字提取 ==========

    function levenshtein(a, b) { var m=a.length,n=b.length; var dp=[]; for(var i=0;i<=m;i++){dp[i]=[];for(var j=0;j<=n;j++)dp[i][j]=i===0?j:j===0?i:0;} for(var i=1;i<=m;i++)for(var j=1;j<=n;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1])+1; return dp[m][n]; }
    function similarity(a, b) { var m=Math.max(a.length,b.length); if(m===0)return 1; return 1-levenshtein(a,b)/m; }

    function matchIndicator(name, refs) {
        var best=null, bestScore=0;
        var clean = name.replace(/[（(].*?[)）]/g,'').replace(/\s+/g,'').replace(/[^一-龥a-zA-Z0-9]/g,'').toLowerCase();
        refs.forEach(function(ref){
            var rc = ref.indicator_name.replace(/[（(].*?[)）]/g,'').replace(/\s+/g,'').replace(/[^一-龥a-zA-Z0-9]/g,'').toLowerCase();
            var s = similarity(clean, rc);
            if (clean.indexOf(rc)!==-1 || rc.indexOf(clean)!==-1) s = Math.max(s, 0.8);
            if (s > bestScore) { bestScore = s; best = ref; }
        });
        return { match: best, score: bestScore };
    }

    function extractPatientInfo(text) {
        var info = { name:'', gender:'', birthDate:'', age:'' };
        var pns = [/姓名[:：]\s*([^\n\r]+)/, /患者[:：]\s*([^\n\r]+)/, /姓名\s+([^\n\r]{2,4})/];
        for(var i=0;i<pns.length;i++){var m=text.match(pns[i]);if(m){info.name=m[1].trim();break;}}
        var gm=text.match(/性别[:：]\s*(男|女)/); if(gm)info.gender=gm[1];
        var am=text.match(/年龄[:：]\s*(\d+)/); if(am)info.age=am[1];
        var dm=text.match(/临床诊断[:：]\s*([^\n\r]+)/); if(dm&&!info.name)info.name='患者('+dm[1].trim()+')';
        return info;
    }

    function extractVisitInfo(text) {
        var info = { visitTime:'', sampleNo:'', dept:'' };
        var m=text.match(/(?:检验日期|采样日期|送检日期|报告日期|接收时间)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/); if(m)info.visitTime=m[1].replace(/[\/.]/g,'-');
        return info;
    }

    function extractIndicators(text) {
        var lines=text.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
        var start=0;
        for(var i=0;i<lines.length;i++){if(/^(项目名称|英文与方法|结果|单位|参考值)/.test(lines[i])){var j=i+1;while(j<lines.length&&lines[j].length<15&&!/[.*\d]/.test(lines[j]))j++;start=j;break;}}
        var inds=[], np=/^[\d.*]+|.*[一-龥]/;
        for(var i=start;i<lines.length-3;i++){
            var ln=lines[i]; if(!np.test(ln))continue;
            if(/^(检验|报告|项目|序号|编号|结果|参考|单位|正常|异常|临床|接收|送检)/.test(ln))continue;
            var name=ln.replace(/^[\d.*\s]+/,'').trim();
            var val=lines[i+2]||'', unit=lines[i+3]||'', ref=lines[i+4]||'';
            if(!/^[\d.]+$/.test(val))continue;
            if(!/[\d.<>～~]/.test(ref))continue;
            inds.push({name:name, value:unit?val+' '+unit:val, reference:ref});
            i+=4;
        }
        return inds;
    }

    async function loadReferenceData() {
        if (referenceCache) return referenceCache;
        try { var r=await fetch('/mock-data/reference-indicators.json'); referenceCache=await r.json(); } catch(e) { referenceCache=[]; }
        return referenceCache;
    }

    /** 调用 OCR.space API（前端直连） */
    async function recognizeImage(base64) {
        try {
            var backendRes = await fetch('/api/ocr/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 })
            });
            var backendData = await backendRes.json();
            if (!backendRes.ok || !backendData.success) throw new Error(backendData.message || 'OCR处理失败');

            ocrResult = backendData.data;
            renderResult();
            btnConfirm.style.display = '';
            toast('识别完成！请核对并修改数据后保存', 'success');
            return;

            var form = new FormData();
            form.append('apikey', OCR_API_KEY);
            form.append('base64Image', base64);
            form.append('language', 'chs');
            form.append('isOverlayRequired', 'false');

            var res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
            var data = await res.json();
            if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage || 'OCR处理失败');
            if (!data.ParsedResults || data.ParsedResults.length===0) throw new Error('未识别到文字');

            var ocrText = data.ParsedResults[0].ParsedText;
            var patientInfo = extractPatientInfo(ocrText);
            var visitInfo = extractVisitInfo(ocrText);
            var rawIndicators = extractIndicators(ocrText);
            var refData = await loadReferenceData();

            var matchedIndicators = rawIndicators.map(function(ind){
                var r = matchIndicator(ind.name, refData);
                return {
                    raw_name: ind.name, raw_value: ind.value, raw_reference: ind.reference,
                    matched: r.match && r.score>=0.4 ? r.match : null,
                    confidence: Math.round(r.score*100),
                    confidence_level: r.score>=0.7?'high':r.score>=0.4?'medium':'low',
                };
            });

            ocrResult = { raw_text: ocrText, patient: patientInfo, visit: visitInfo, indicators: matchedIndicators };
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

        html += '<h4 class="ocr-section-title"><i class="fas fa-user"></i> 患者信息</h4>';
        html += '<div class="ocr-form-row">';
        html += '<div class="form-group" style="flex:1;"><label>姓名</label><input type="text" id="ocrPatientName" value="' + escapeHtml(d.patient.name) + '"></div>';
        html += '<div class="form-group" style="flex:0 0 80px;"><label>性别</label><select id="ocrGender"><option value="男"' + (d.patient.gender === '男' ? ' selected' : '') + '>男</option><option value="女"' + (d.patient.gender === '女' ? ' selected' : '') + '>女</option></select></div>';
        html += '<div class="form-group" style="flex:0 0 100px;"><label>年龄</label><input type="text" id="ocrAge" value="' + escapeHtml(d.patient.age) + '"></div>';
        html += '</div>';

        html += '<h4 class="ocr-section-title"><i class="fas fa-calendar-alt"></i> 就诊信息</h4>';
        html += '<div class="ocr-form-row">';
        html += '<div class="form-group" style="flex:1;"><label>检验日期</label><input type="date" id="ocrVisitDate" value="' + escapeHtml(d.visit.visitTime) + '"></div>';
        html += '<div class="form-group" style="flex:1;"><label>样本号</label><input type="text" id="ocrSampleNo" value="' + escapeHtml(d.visit.sampleNo) + '"></div>';
        html += '</div>';

        html += '<h4 class="ocr-section-title"><i class="fas fa-flask"></i> 检验指标（' + d.indicators.length + ' 条）</h4>';
        html += '<div class="ocr-table-wrap"><table class="ocr-table"><thead><tr>' +
            '<th style="width:25px;">✓</th><th>OCR原始名称</th><th>检查值</th><th>参考值</th><th>匹配指标</th><th>置信度</th>' +
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
        var patientName = document.getElementById('ocrPatientName').value.trim();
        var gender = document.getElementById('ocrGender').value;
        var age = document.getElementById('ocrAge').value.trim();
        if (!patientName) { toast('请输入患者姓名', 'error'); return; }

        var visitDate = document.getElementById('ocrVisitDate').value;

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
            });
        });

        if (selectedRows.length === 0) { toast('请至少选择一条指标', 'error'); return; }

        try {
            var patients = await window.DataAPI.fetchPatients();
            var patient = patients.find(function (p) { return p.patient_name === patientName && p.status === 1; });
            if (!patient) {
                var birthDate = age ? (new Date().getFullYear() - parseInt(age)) + '-01-01' : '';
                patient = await window.DataAPI.createPatient({ patient_name: patientName, gender: gender, birth_date: birthDate });
                toast('已创建患者: ' + patientName);
            }
            var visit = await window.DataAPI.createVisit({ patient_code: patient.patient_code, visit_time: visitDate ? visitDate + 'T00:00:00' : new Date().toISOString().replace('T', ' ').substring(0, 19) });

            var created = 0;
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
                    } catch (e) { /* skip */ }
                }
            }
            closeDrawer();
            toast('保存成功！创建 ' + created + ' 条明细');
            if (window.PatientModule) window.PatientModule.reload();
            setTimeout(function () { if (window.VisitModule && window.VisitModule.loadVisits) window.VisitModule.loadVisits(patient.patient_code); }, 500);
        } catch (e) {
            toast('保存失败: ' + (e.message || '未知错误'), 'error');
        }
    }

    function closeDrawer() { overlay.classList.remove('show'); }

    btnOcrEntry.addEventListener('click', openUpload);
    btnClose.addEventListener('click', closeDrawer);
    btnCancel.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDrawer(); });
    btnConfirm.addEventListener('click', confirmSave);
})();
