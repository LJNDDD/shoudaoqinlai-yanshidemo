/**
 * 数据管理 — 右侧抽屉表单
 * 检查明细支持横向表格多行输入（项目→指标级联）
 */
(function () {
    'use strict';

    var overlay = document.getElementById('drawerOverlay');
    var titleEl = document.getElementById('drawerTitle');
    var bodyEl = document.getElementById('drawerBody');
    var btnCancel = document.getElementById('btnDrawerCancel');
    var btnSubmit = document.getElementById('btnDrawerSubmit');
    var btnClose = document.getElementById('btnDrawerClose');

    var currentOnSubmit = null;
    var examItemsCache = null;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    async function loadExamItems() {
        if (examItemsCache) return examItemsCache;
        try {
            var res = await fetch('/api/reference/exam-items');
            var json = await res.json();
            examItemsCache = json.data || [];
        } catch (e) {
            try {
                var res2 = await fetch('/mock-data/reference-exam-items.json');
                examItemsCache = await res2.json();
            } catch (e2) { return []; }
        }
        return examItemsCache;
    }

    async function loadIndicators(examItemCode) {
        if (!examItemCode) return [];
        try {
            var res = await fetch('/api/reference/indicators?exam_item_code=' + encodeURIComponent(examItemCode));
            var json = await res.json();
            return json.data || [];
        } catch (e) {
            try {
                var res2 = await fetch('/mock-data/reference-indicators.json');
                var all = await res2.json();
                return all.filter(function (ind) { return ind.exam_item_code === examItemCode; });
            } catch (e2) { return []; }
        }
    }

    function buildFormHTML(fields, data) {
        var html = '';
        fields.forEach(function (f) {
            html += '<div class="form-group">';
            html += '<label>' + f.label + '</label>';
            var val = data && data[f.name] !== undefined ? data[f.name] : (f.value || '');
            if (f.type === 'select') {
                html += '<select name="' + f.name + '" id="field_' + f.name + '"' + (f.readonly ? ' disabled' : '') + '>';
                if (f.placeholder) html += '<option value="">' + f.placeholder + '</option>';
                (f.options || []).forEach(function (opt) {
                    html += '<option value="' + escapeHtml(opt.value) + '"' + (String(val) === String(opt.value) ? ' selected' : '') + '>' + escapeHtml(opt.label) + '</option>';
                });
                html += '</select>';
                if (f.readonly) html += '<input type="hidden" name="' + f.name + '" value="' + escapeHtml(val) + '">';
            } else {
                html += '<input type="' + (f.type || 'text') + '" name="' + f.name + '" id="field_' + f.name + '" value="' + escapeHtml(val) + '"' + (f.readonly ? ' readonly' : '') + (f.placeholder ? ' placeholder="' + escapeHtml(f.placeholder) + '"' : '') + '>';
            }
            html += '</div>';
        });
        return html;
    }

    async function show(title, fields, data, onSubmit) {
        titleEl.textContent = title;
        bodyEl.innerHTML = buildFormHTML(fields, data);
        currentOnSubmit = onSubmit;
        overlay.classList.add('show');

        var examItemSelect = bodyEl.querySelector('#field_exam_item_code');
        if (examItemSelect) {
            examItemSelect.addEventListener('change', async function () {
                var indSelect = bodyEl.querySelector('#field_indicator_code');
                if (!indSelect) return;
                var indicators = await loadIndicators(this.value);
                indSelect.innerHTML = '<option value="">请选择指标</option>' +
                    indicators.map(function (i) { return '<option value="' + i.indicator_code + '">' + i.indicator_name + '</option>'; }).join('');
            });
            if (data && data.exam_item_code) {
                examItemSelect.value = data.exam_item_code;
                examItemSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    /** 带表格的检查明细表单（支持多行添加） */
    async function showExamTable(title, visitOptions, initVisitSerial, initExamCode, initRows, onSubmit) {
        titleEl.textContent = title;
        currentOnSubmit = onSubmit;

        var headerHtml = '<div class="form-group"><label>就诊流水号</label>' +
            '<select id="examTblVisit" style="width:100%;">' +
            (visitOptions || []).map(function (o) {
                return '<option value="' + o.value + '"' + (o.value === initVisitSerial ? ' selected' : '') + '>' + o.label + '</option>';
            }).join('') + '</select></div>';

        var examItems = await loadExamItems();
        headerHtml += '<div class="form-group"><label>检查项目</label>' +
            '<select id="examTblItem" style="width:100%;"><option value="">请选择检查项目</option>' +
            examItems.map(function (it) {
                return '<option value="' + it.exam_item_code + '"' + (it.exam_item_code === initExamCode ? ' selected' : '') + '>' + it.exam_item_name + '</option>';
            }).join('') + '</select></div>';

        bodyEl.innerHTML = headerHtml +
            '<hr style="margin:0.6rem 0;border-color:rgba(115,119,132,0.1);">' +
            '<div class="exam-table" id="examTable"></div>' +
            '<button class="btn btn-cancel" id="btnExamAddRow" style="width:100%;margin-top:0.4rem;"><i class="fas fa-plus"></i> 添加一行</button>';

        // 行数据
        var rows = initRows && initRows.length > 0 ? initRows : [{ indicator_code: '', indicator_name: '', exam_value: '', reference_value: '' }];
        var indicatorCache = {};

        async function renderTable() {
            var tbl = document.getElementById('examTable');
            if (!tbl) return;
            tbl.innerHTML = '<table style="width:100%;font-size:0.72rem;"><thead><tr>' +
                '<th style="width:35%;">检查指标</th><th style="width:25%;">检查值</th><th style="width:25%;">参考值</th><th style="width:40px;"></th>' +
                '</tr></thead><tbody>' + rows.map(function (r, i) {
                    var indOpts = '<option value="">请选择</option>';
                    Object.keys(indicatorCache).forEach(function (code) {
                        var ind = indicatorCache[code];
                        indOpts += '<option value="' + code + '"' + (code === r.indicator_code ? ' selected' : '') + '>' + ind.indicator_name + '</option>';
                    });
                    return '<tr><td><select class="exam-row-ind" data-idx="' + i + '" style="width:100%;">' + indOpts + '</select></td>' +
                        '<td><input type="text" class="exam-row-val" data-idx="' + i + '" value="' + escapeHtml(r.exam_value) + '" style="width:100%;"></td>' +
                        '<td><input type="text" class="exam-row-ref" data-idx="' + i + '" value="' + escapeHtml(r.reference_value) + '" style="width:100%;"></td>' +
                        '<td><button class="btn-icon-xs exam-row-del" data-idx="' + i + '" title="删除" ' + (rows.length <= 1 ? 'disabled' : '') + '><i class="fas fa-times"></i></button></td></tr>';
                }).join('') + '</tbody></table>';

            // 绑定事件
            tbl.querySelectorAll('.exam-row-del').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var idx = parseInt(this.getAttribute('data-idx'));
                    rows.splice(idx, 1);
                    renderTable();
                });
            });
            tbl.querySelectorAll('.exam-row-val, .exam-row-ref').forEach(function (inp) {
                inp.addEventListener('input', function () {
                    var idx = parseInt(this.getAttribute('data-idx'));
                    if (rows[idx]) {
                        if (this.classList.contains('exam-row-val')) rows[idx].exam_value = this.value;
                        else rows[idx].reference_value = this.value;
                    }
                });
            });
        }

        // 检查项目变化 → 加载指标选项
        document.getElementById('examTblItem').addEventListener('change', async function () {
            indicatorCache = {};
            var code = this.value;
            if (code) {
                var inds = await loadIndicators(code);
                inds.forEach(function (i) { indicatorCache[i.indicator_code] = i; });
            }
            // 清空已有行
            rows = [{ indicator_code: '', indicator_name: '', exam_value: '', reference_value: '' }];
            renderTable();
        });

        // 初始加载
        if (initExamCode) {
            var inds = await loadIndicators(initExamCode);
            inds.forEach(function (i) { indicatorCache[i.indicator_code] = i; });
        }
        renderTable();

        // 添加行
        document.getElementById('btnExamAddRow').addEventListener('click', function () {
            rows.push({ indicator_code: '', indicator_name: '', exam_value: '', reference_value: '' });
            renderTable();
        });

        // 重载 btnSubmit
        btnSubmit.onclick = async function () {
            // 收集数据
            var result = {
                visit_serial_no: document.getElementById('examTblVisit').value,
                exam_item_code: document.getElementById('examTblItem').value,
                rows: [],
            };
            bodyEl.querySelectorAll('.exam-row-ind').forEach(function (sel, i) {
                var code = sel.value;
                var name = sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
                result.rows.push({
                    indicator_code: code,
                    indicator_name: name,
                    exam_value: rows[i] ? rows[i].exam_value : '',
                    reference_value: rows[i] ? rows[i].reference_value : '',
                });
            });
            if (!result.visit_serial_no) { toast('请选择就诊流水号', 'error'); return; }
            if (!result.exam_item_code) { toast('请选择检查项目', 'error'); return; }
            if (onSubmit) onSubmit(result);
        };

        overlay.classList.add('show');

        function toast(msg, type) {
            var container = document.getElementById('toastContainer');
            var el = document.createElement('div');
            el.className = 'toast ' + (type || 'error');
            el.innerHTML = '<i class="fas fa-' + (type === 'error' ? 'exclamation-circle' : 'check-circle') + '"></i> ' + escapeHtml(msg);
            container.appendChild(el);
            setTimeout(function () { el.classList.add('fade-out'); setTimeout(function () { el.remove(); }, 300); }, 2500);
        }
    }

    function close() {
        overlay.classList.remove('show');
        currentOnSubmit = null;
        btnSubmit.onclick = function () { if (currentOnSubmit) currentOnSubmit(collectFormData()); };
    }

    function collectFormData() {
        var inputs = bodyEl.querySelectorAll('input, select, textarea');
        var data = {};
        inputs.forEach(function (el) { if (el.name) data[el.name] = el.value; });
        return data;
    }

    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    btnSubmit.addEventListener('click', function () {
        if (currentOnSubmit) currentOnSubmit(collectFormData());
    });

    window.ModalManager = {
        show: show, close: close, collectFormData: collectFormData,
        loadExamItems: loadExamItems,
        showExamTable: showExamTable,

        patientFields: function () {
            return [
                { name: 'patient_name', label: '患者姓名', type: 'text', placeholder: '请输入患者姓名' },
                { name: 'gender', label: '性别', type: 'select', options: [{ value: '男', label: '男' }, { value: '女', label: '女' }] },
                { name: 'birth_date', label: '出生日期', type: 'date' },
            ];
        },

        visitFields: function (patientOptions) {
            return [
                { name: 'patient_code', label: '患者', type: 'select', options: patientOptions || [] },
                { name: 'visit_time', label: '就诊时间', type: 'datetime-local' },
            ];
        },

        examFields: function (visitOptions) {
            return [
                { name: 'visit_serial_no', label: '就诊流水号', type: 'select', options: visitOptions || [] },
                { name: 'exam_item_code', label: '检查项目', type: 'select', placeholder: '请选择检查项目', options: [] },
            ];
        },
    };

})();
