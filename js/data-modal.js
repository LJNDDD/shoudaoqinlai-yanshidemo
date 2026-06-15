/**
 * 数据管理 — 右侧抽屉表单
 * 检查明细表单支持级联下拉（项目→指标）
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
    var examItemsCache = null; // 参考数据缓存

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /** 加载参考数据（检查项目列表） */
    async function loadExamItems() {
        if (examItemsCache) return examItemsCache;
        try {
            var res = await fetch('/api/reference/exam-items');
            var json = await res.json();
            examItemsCache = json.data || [];
            return examItemsCache;
        } catch (e) {
            console.error('加载检查项目失败:', e);
            return [];
        }
    }

    /** 加载指定项目下的指标 */
    async function loadIndicators(examItemCode) {
        if (!examItemCode) return [];
        try {
            var res = await fetch('/api/reference/indicators?exam_item_code=' + encodeURIComponent(examItemCode));
            var json = await res.json();
            return json.data || [];
        } catch (e) {
            console.error('加载指标失败:', e);
            return [];
        }
    }

    /** 渲染表单字段 */
    function buildFormHTML(fields, data) {
        var html = '';
        fields.forEach(function (f) {
            html += '<div class="form-group">';
            html += '<label>' + f.label + '</label>';
            var val = data && data[f.name] !== undefined ? data[f.name] : (f.value || '');
            if (f.type === 'select') {
                html += '<select name="' + f.name + '" id="field_' + f.name + '"' + (f.readonly ? ' disabled' : '') + (f.onchange ? ' onchange="' + f.onchange + '"' : '') + '>';
                var opts = f.options || [];
                if (f.placeholder) {
                    html += '<option value="">' + f.placeholder + '</option>';
                }
                opts.forEach(function (opt) {
                    var selected = String(val) === String(opt.value) ? ' selected' : '';
                    html += '<option value="' + escapeHtml(opt.value) + '"' + selected + '>' + escapeHtml(opt.label) + '</option>';
                });
                html += '</select>';
                if (f.readonly) html += '<input type="hidden" name="' + f.name + '" value="' + escapeHtml(val) + '">';
            } else if (f.type === 'textarea') {
                html += '<textarea name="' + f.name + '" id="field_' + f.name + '" rows="3"' + (f.readonly ? ' readonly' : '') + '>' + escapeHtml(val) + '</textarea>';
            } else if (f.type === 'hidden') {
                html += '<input type="hidden" name="' + f.name + '" id="field_' + f.name + '" value="' + escapeHtml(val) + '">';
            } else {
                var inputType = f.type || 'text';
                html += '<input type="' + inputType + '" name="' + f.name + '" id="field_' + f.name + '" value="' + escapeHtml(val) + '"' + (f.readonly ? ' readonly' : '') + (f.placeholder ? ' placeholder="' + escapeHtml(f.placeholder) + '"' : '') + '>';
            }
            html += '</div>';
        });
        return html;
    }

    /** 打开抽屉 */
    async function show(title, fields, data, onSubmit) {
        titleEl.textContent = title;
        bodyEl.innerHTML = buildFormHTML(fields, data);
        currentOnSubmit = onSubmit;
        overlay.classList.add('show');

        // 如果是检查明细表单，绑定级联下拉事件
        var examItemSelect = bodyEl.querySelector('#field_exam_item_code');
        if (examItemSelect) {
            examItemSelect.addEventListener('change', async function () {
                await updateIndicatorDropdown(this.value, data);
            });
            // 编辑模式下，如果有初始值，加载对应指标
            if (data && data.exam_item_code) {
                await updateIndicatorDropdown(data.exam_item_code, data);
            }
        }
    }

    /** 级联更新指标下拉 */
    async function updateIndicatorDropdown(examItemCode, editData) {
        var indicatorSelect = bodyEl.querySelector('#field_indicator_code');
        if (!indicatorSelect) return;

        // 加载指标
        var indicators = await loadIndicators(examItemCode);
        var currentVal = editData ? editData.indicator_code : '';

        var optsHtml = '<option value="">请选择指标</option>';
        indicators.forEach(function (ind) {
            var sel = (editData && ind.indicator_code === currentVal) ? ' selected' : '';
            optsHtml += '<option value="' + escapeHtml(ind.indicator_code) + '"' + sel + '>' + escapeHtml(ind.indicator_name) + '</option>';
        });
        indicatorSelect.innerHTML = optsHtml;
    }

    /** 关闭抽屉 */
    function close() {
        overlay.classList.remove('show');
        currentOnSubmit = null;
    }

    /** 收集表单数据（自动从下拉选项提取名称） */
    function collectFormData() {
        var inputs = bodyEl.querySelectorAll('input, select, textarea');
        var data = {};
        inputs.forEach(function (el) {
            if (el.name) data[el.name] = el.value;
        });

        // 从检查项目下拉提取项目名称和属性
        var examSelect = bodyEl.querySelector('#field_exam_item_code');
        if (examSelect && examSelect.selectedIndex >= 0) {
            var opt = examSelect.selectedOptions[0];
            if (opt && opt.value) {
                data.exam_item_name = opt.textContent;
                // 从 reference_data 缓存查属性（由 loadExamItems 缓存）
                if (examItemsCache) {
                    var found = examItemsCache.find(function (it) { return it.exam_item_code === opt.value; });
                    if (found) {
                        data.exam_item_name = found.exam_item_name;
                        data.exam_item_attr = found.exam_attr || '';
                    }
                }
            }
        }

        // 从指标下拉提取指标名称
        var indSelect = bodyEl.querySelector('#field_indicator_code');
        if (indSelect && indSelect.selectedIndex >= 0) {
            var iopt = indSelect.selectedOptions[0];
            if (iopt && iopt.value) {
                data.indicator_name = iopt.textContent;
            }
        }

        // 定性结果不开放自选，默认空（后续自动判断）
        if (!data.qualitative_result) data.qualitative_result = '';

        return data;
    }

    btnCancel.addEventListener('click', close);
    btnClose.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close();
    });
    btnSubmit.addEventListener('click', function () {
        if (currentOnSubmit) currentOnSubmit(collectFormData());
    });

    // 暴露到全局
    window.ModalManager = {
        show: show,
        close: close,
        collectFormData: collectFormData,
        loadExamItems: loadExamItems,

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

        /** 检查明细表单：隐藏编码字段，项目/指标从参考数据级联 */
        examFields: function (visitOptions) {
            return [
                { name: 'visit_serial_no', label: '就诊流水号', type: 'select', options: visitOptions || [] },
                { name: 'exam_item_code', label: '检查项目', type: 'select', placeholder: '请选择检查项目', options: [] },
                { name: 'indicator_code', label: '检查指标', type: 'select', placeholder: '请先选择检查项目', options: [] },
                { name: 'exam_value', label: '检查值', type: 'text', placeholder: '如 7.5' },
                { name: 'reference_value', label: '检查参考值', type: 'text', placeholder: '如 4.0-10.0' },
            ];
        },
    };

})();
