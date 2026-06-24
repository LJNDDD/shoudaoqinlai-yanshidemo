/**
 * 数据管理 — 检查明细面板
 * 检查项目为分组标题，指标为表格行，支持锚点导航，支持推送数据
 */
(function () {
    'use strict';

    var contentEl = document.getElementById('examContent');
    var navEl = document.getElementById('examNav');
    var titleEl = document.getElementById('examTitle');
    var subtitleEl = document.getElementById('examSubtitle');
    var btnAdd = document.getElementById('btnAddExam');
    var btnPush = document.getElementById('btnPushData');

    // 推送抽屉元素
    var pushOverlay = document.getElementById('pushOverlay');
    var pushBody = document.getElementById('pushBody');
    var btnPushClose = document.getElementById('btnPushClose');
    var btnPushCancel = document.getElementById('btnPushCancel');
    var btnPushConfirm = document.getElementById('btnPushConfirm');

    var detailsCache = [];
    var currentVisitSerial = null;
    var currentPatientCode = null;
    var pushCheckedState = {}; // 推送抽屉选中状态

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
        setTimeout(function () {
            el.classList.add('fade-out');
            setTimeout(function () { el.remove(); }, 300);
        }, 2500);
    }

    function getPatientName(code) {
        var cache = window.PatientModule ? window.PatientModule.getCache() : [];
        var p = cache.find(function (item) { return item.patient_code === code; });
        return p ? p.patient_name : code;
    }

    /** 按检查项目分组 */
    function groupByExam(details) {
        var groups = [];
        var map = {};
        details.forEach(function (d) {
            var key = d.exam_item_code || d.exam_item_name;
            if (!map[key]) {
                map[key] = {
                    examItemCode: d.exam_item_code,
                    examItemName: d.exam_item_name,
                    items: []
                };
                groups.push(map[key]);
            }
            map[key].items.push(d);
        });
        return groups;
    }

    /** 加载检查明细 */
    async function loadDetails(visitSerialNo, patientCode) {
        currentVisitSerial = visitSerialNo;
        currentPatientCode = patientCode;
        btnAdd.disabled = false;

        var patientName = getPatientName(patientCode);
        titleEl.textContent = patientName + ' · 检验检查结果';
        subtitleEl.textContent = visitSerialNo;
        btnPush.disabled = false;

        try {
            detailsCache = await window.DataAPI.fetchExamDetails(visitSerialNo);
            render();
        } catch (err) {
            toast('加载检查明细失败: ' + err.message, 'error');
        }
    }

    /** 清空面板 */
    function clear() {
        currentVisitSerial = null;
        currentPatientCode = null;
        detailsCache = [];
        btnAdd.disabled = true;
        btnPush.disabled = true;
        titleEl.textContent = '检验检查结果';
        subtitleEl.textContent = '请选择就诊记录';
        navEl.style.display = 'none';
        navEl.innerHTML = '';
        contentEl.innerHTML = (
            '<div class="exam-empty">' +
                '<i class="fas fa-microscope"></i>' +
                '<span>请选择就诊记录查看明细</span>' +
            '</div>'
        );
    }

    /** 滚动到指定锚点 */
    function scrollToSection(anchorId) {
        var el = document.getElementById(anchorId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // 标记当前激活的导航按钮
        navEl.querySelectorAll('.exam-nav-btn').forEach(function (btn) {
            btn.classList.remove('active');
        });
        var activeBtn = navEl.querySelector('[data-anchor="' + anchorId + '"]');
        if (activeBtn) activeBtn.classList.add('active');
    }

    /** 渲染检查明细（按检查项目分组） */
    function render() {
        if (detailsCache.length === 0) {
            navEl.style.display = 'none';
            navEl.innerHTML = '';
            contentEl.innerHTML = (
                '<div class="exam-empty">' +
                    '<i class="fas fa-clipboard-list"></i>' +
                    '<span>暂无检查明细数据</span>' +
                '</div>'
            );
            return;
        }

        var groups = groupByExam(detailsCache);

        // 渲染导航按钮
        var navHtml = '';
        groups.forEach(function (g, i) {
            var anchorId = 'exam-section-' + i;
            navHtml += '<button class="exam-nav-btn" data-anchor="' + anchorId + '" onclick="document.getElementById(\'' + anchorId + '\').scrollIntoView({behavior:\'smooth\',block:\'start\'})">' +
                escapeHtml(g.examItemName) + '</button>';
        });
        navEl.innerHTML = navHtml;
        navEl.style.display = 'flex';

        // 导航按钮点击事件（更新激活状态）
        navEl.querySelectorAll('.exam-nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var anchor = this.getAttribute('data-anchor');
                var el = document.getElementById(anchor);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                navEl.querySelectorAll('.exam-nav-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
            });
        });
        // 默认激活第一个
        if (navEl.querySelector('.exam-nav-btn')) {
            navEl.querySelector('.exam-nav-btn').classList.add('active');
        }

        // 渲染内容：每个检查项目一个小标题 + 指标表格
        var contentHtml = '';
        groups.forEach(function (g, i) {
            var anchorId = 'exam-section-' + i;
            contentHtml += '<div class="exam-section" id="' + anchorId + '">';
            contentHtml += '<h4 class="exam-section-title">' +
                '<i class="fas fa-flask"></i> ' +
                escapeHtml(g.examItemName) +
                ' <span class="exam-section-code">(' + escapeHtml(g.examItemCode) + ')</span>' +
                '</h4>';
            contentHtml += '<div class="overflow-x-auto"><table class="data-table"><thead><tr>' +
                '<th>指标名称</th><th>属性</th><th>检查值</th><th>参考值</th><th>定性结果</th><th>操作</th>' +
                '</tr></thead><tbody>';

            g.items.forEach(function (d) {
                var isAbnormal = d.qualitative_result === '偏高' || d.qualitative_result === '偏低' || d.qualitative_result === '异常';
                var isDisabled = d.status === 0;
                var resultClass = isAbnormal ? 'exam-result-abnormal' : 'exam-result-normal';
                var rowClass = (isAbnormal ? ' abnormal' : '') + (isDisabled ? ' disabled' : '');
                contentHtml += '<tr class="' + rowClass + '">';
                contentHtml += '<td><strong>' + escapeHtml(d.indicator_name) + '</strong></td>';
                contentHtml += '<td>' + escapeHtml(d.exam_item_attr) + '</td>';
                contentHtml += '<td class="' + (isAbnormal ? 'exam-result-abnormal' : '') + '">' + escapeHtml(d.exam_value) + '</td>';
                contentHtml += '<td>' + escapeHtml(d.reference_value) + '</td>';
                contentHtml += '<td class="' + resultClass + '">' + escapeHtml(d.qualitative_result) + '</td>';
                contentHtml += '<td><div class="row-actions">' +
                    '<button class="btn-icon-xs btn-edit-exam" data-id="' + escapeHtml(d.id) + '" title="编辑"><i class="fas fa-pen"></i></button>' +
                    '<button class="btn-icon-xs btn-disable btn-toggle-exam" data-id="' + escapeHtml(d.id) + '" title="' + (isDisabled ? '启用' : '停用') + '"><i class="fas fa-' + (isDisabled ? 'toggle-on' : 'toggle-off') + '"></i></button>' +
                    '</div></td>';
                contentHtml += '</tr>';
            });

            contentHtml += '</tbody></table></div></div>';
        });

        contentEl.innerHTML = contentHtml;

        // 编辑按钮
        contentEl.querySelectorAll('.btn-edit-exam').forEach(function (btn) {
            btn.addEventListener('click', function () {
                editDetail(this.getAttribute('data-id'));
            });
        });

        // 停用/启用按钮
        contentEl.querySelectorAll('.btn-toggle-exam').forEach(function (btn) {
            btn.addEventListener('click', function () {
                toggleDetail(this.getAttribute('data-id'));
            });
        });

        // 监听滚动，高亮对应导航按钮
        contentEl.addEventListener('scroll', function () {
            var sections = contentEl.querySelectorAll('.exam-section');
            var scrollTop = contentEl.scrollTop + 80;
            var currentAnchor = null;
            sections.forEach(function (sec) {
                if (sec.offsetTop <= scrollTop) {
                    currentAnchor = sec.id;
                }
            });
            if (currentAnchor) {
                navEl.querySelectorAll('.exam-nav-btn').forEach(function (btn) {
                    btn.classList.toggle('active', btn.getAttribute('data-anchor') === currentAnchor);
                });
            }
        });
    }

    /** 构建就诊下拉选项 */
    function buildVisitOptions() {
        var visits = window.VisitModule ? window.VisitModule.getCache() : [];
        return visits.filter(function (v) { return v.status === 1; }).map(function (v) {
            return { value: v.visit_serial_no, label: v.visit_serial_no + (v.visit_time ? ' (' + v.visit_time.substring(0, 10) + ')' : '') };
        });
    }

    /** 构建检查项目下拉选项（从 reference_data） */
    async function buildExamItemOptions() {
        try {
            var items = await window.ModalManager.loadExamItems();
            return items.map(function (it) {
                return { value: it.exam_item_code, label: it.exam_item_name + ' (' + it.exam_item_code + ')' };
            });
        } catch (e) {
            return [];
        }
    }

    /** 新增明细 */
    async function addDetail() {
        var visitOptions = buildVisitOptions();
        if (visitOptions.length === 0) {
            toast('无可用就诊记录，请先新增就诊', 'error');
            return;
        }
        window.ModalManager.showExamTable('新增检查明细', visitOptions, currentVisitSerial, '', null, async function (result) {
            try {
                // 先查出检查项目名称
                var examItems = await window.ModalManager.loadExamItems();
                var examItem = examItems.find(function (it) { return it.exam_item_code === result.exam_item_code; });
                var examItemName = examItem ? examItem.exam_item_name : result.exam_item_code;

                var created = 0;
                for (var i = 0; i < result.rows.length; i++) {
                    var row = result.rows[i];
                    if (!row.indicator_code) continue;
                    await window.DataAPI.createExamDetail({
                        visit_serial_no: result.visit_serial_no,
                        exam_item_code: result.exam_item_code,
                        exam_item_name: examItemName,
                        indicator_code: row.indicator_code,
                        indicator_name: row.indicator_name,
                        exam_item_attr: '',
                        exam_value: row.exam_value,
                        reference_value: row.reference_value,
                        qualitative_result: '',
                    });
                    created++;
                }
                window.ModalManager.close();
                toast('新增 ' + created + ' 条检查明细');
                if (result.visit_serial_no !== currentVisitSerial) await window.VisitModule.reload();
                await loadDetails(result.visit_serial_no, currentPatientCode);
            } catch (err) {
                toast('新增失败: ' + err.message, 'error');
            }
        });
    }

    /** 编辑明细 */
    async function editDetail(id) {
        var detail = detailsCache.find(function (d) { return d.id === id; });
        if (!detail) return;
        var visitOptions = buildVisitOptions();
        var initRows = [{
            indicator_code: detail.indicator_code, indicator_name: detail.indicator_name,
            exam_value: detail.exam_value, reference_value: detail.reference_value,
        }];
        window.ModalManager.showExamTable('编辑检查明细', visitOptions, detail.visit_serial_no, detail.exam_item_code, initRows, async function (result) {
            try {
                var row = result.rows[0];
                if (!row || !row.indicator_code) { toast('请选择指标', 'error'); return; }
                var examItems = await window.ModalManager.loadExamItems();
                var examItem = examItems.find(function (it) { return it.exam_item_code === result.exam_item_code; });
                await window.DataAPI.updateExamDetail(id, {
                    visit_serial_no: result.visit_serial_no,
                    exam_item_code: result.exam_item_code,
                    exam_item_name: examItem ? examItem.exam_item_name : result.exam_item_code,
                    indicator_code: row.indicator_code,
                    indicator_name: row.indicator_name,
                    exam_value: row.exam_value,
                    reference_value: row.reference_value,
                });
                window.ModalManager.close();
                toast('检查明细编辑成功');
                await loadDetails(currentVisitSerial, currentPatientCode);
            } catch (err) {
                toast('编辑失败: ' + err.message, 'error');
            }
        });
    }

    /** 停用/启用明细 */
    async function toggleDetail(id) {
        try {
            var result = await window.DataAPI.toggleExamDetailStatus(id);
            toast(result.status === 0 ? '检查明细已停用' : '检查明细已启用');
            await loadDetails(currentVisitSerial, currentPatientCode);
        } catch (err) {
            toast('操作失败: ' + err.message, 'error');
        }
    }

    btnAdd.addEventListener('click', addDetail);

    // ========== 推送数据功能 ==========

    /** 打开推送抽屉（支持患者所有就诊 Tab 切换） */
    async function openPushDrawer() {
        if (!currentPatientCode) {
            toast('请先选择患者', 'error');
            return;
        }

        // 加载该患者的所有就诊及明细
        var patientName = getPatientName(currentPatientCode);
        var visitsData, allDetailsMap = {}, visitSerialNos = [];

        try {
            visitsData = await window.DataAPI.fetchVisits(currentPatientCode);
            visitsData = visitsData.filter(function (v) { return v.status === 1; });
            for (var i = 0; i < visitsData.length; i++) {
                var sn = visitsData[i].visit_serial_no;
                visitSerialNos.push(sn);
                allDetailsMap[sn] = await window.DataAPI.fetchExamDetails(sn);
            }
        } catch (e) {
            toast('加载数据失败: ' + e.message, 'error');
            return;
        }

        if (visitSerialNos.length === 0) {
            toast('该患者暂无就诊记录', 'error');
            return;
        }

        // 合计总条数
        var totalCount = 0;
        visitSerialNos.forEach(function (sn) { totalCount += allDetailsMap[sn].length; });

        var html = '';

        // 患者信息
        html += '<div class="push-section">';
        html += '<div class="push-section-title"><i class="fas fa-user-circle"></i> 推送信息</div>';
        html += '<div style="font-size:0.72rem;color:#5B7A9A;">';
        html += '患者：<strong>' + escapeHtml(patientName) + '</strong>（' + escapeHtml(currentPatientCode) + '）<br>';
        html += '就诊次数：<strong>' + visitSerialNos.length + '</strong> 次，合计 <strong>' + totalCount + '</strong> 条数据';
        html += '</div></div>';

        // 客户端选择
        html += '<div class="push-section">';
        html += '<div class="push-section-title"><i class="fas fa-laptop-medical"></i> 选择推送客户端</div>';
        html += '<div class="push-client-group" id="pushClientGroup">';
        html += '<label class="push-client-option"><input type="checkbox" value="智能主检" class="push-client-cb"> 智能主检</label>';
        html += '<label class="push-client-option"><input type="checkbox" value="健康指数" class="push-client-cb"> 健康指数</label>';
        html += '</div></div>';

        // 就诊 Tab
        var activeTab = visitSerialNos.indexOf(currentVisitSerial);
        if (activeTab < 0) activeTab = 0;
        html += '<div class="push-section">';
        html += '<div class="push-section-title"><i class="fas fa-list-check"></i> 选择推送数据</div>';
        html += '<div class="push-tabs" id="pushTabs">';
        visitSerialNos.forEach(function (sn, idx) {
            html += '<button class="push-tab-btn' + (idx === activeTab ? ' active' : '') + '" data-tab="' + idx + '">' +
                escapeHtml(sn) + '<br><small>' + allDetailsMap[sn].length + ' 条</small></button>';
        });
        html += '</div>';

        // 全选（对当前 tab）
        html += '<label class="push-select-all"><input type="checkbox" id="pushSelectAll" checked> 全选 / 取消全选（当前就诊）</label>';

        // 数据列表容器
        html += '<div class="push-list" id="pushList"></div></div>';

        // 汇总
        html += '<div class="push-summary" id="pushSummary">';
        html += '已选择 <strong id="pushCount">' + totalCount + '</strong> 条数据（共 ' + totalCount + ' 条）';
        html += '</div>';

        pushBody.innerHTML = html;
        pushOverlay.classList.add('show');

        // ====== 状态管理 ======
        // 用对象存储选中状态，key 为 detail ID，跨 Tab 保持
        pushCheckedState = {};
        visitSerialNos.forEach(function (sn) {
            allDetailsMap[sn].forEach(function (d) { pushCheckedState[d.id] = true; });
        });

        var currentTabIdx = activeTab;

        /** 渲染当前 Tab 的数据列表 */
        function renderTabList() {
            var sn = visitSerialNos[currentTabIdx];
            var details = allDetailsMap[sn];
            var groups = groupByExam(details);
            var listHtml = '';

            groups.forEach(function (g) {
                g.items.forEach(function (d) {
                    var isAbnormal = d.qualitative_result === '偏高' || d.qualitative_result === '偏低' || d.qualitative_result === '异常';
                    var resultClass = isAbnormal ? 'abnormal' : 'normal';
                    var checked = pushCheckedState[d.id] ? ' checked' : '';
                    listHtml += '<label class="push-list-item">';
                    listHtml += '<input type="checkbox" class="push-item-cb" value="' + escapeHtml(d.id) + '"' + checked + '>';
                    listHtml += '<span class="push-item-name">' + escapeHtml(d.indicator_name) + '</span>';
                    listHtml += '<span class="push-item-value">' + escapeHtml(d.exam_value) + '</span>';
                    listHtml += '<span class="push-item-result ' + resultClass + '">' + escapeHtml(d.qualitative_result) + '</span>';
                    listHtml += '</label>';
                });
            });

            var pushList = document.getElementById('pushList');
            if (pushList) pushList.innerHTML = listHtml;

            // 绑定 checkbox 事件
            var itemCbs = pushBody.querySelectorAll('.push-item-cb');
            itemCbs.forEach(function (cb) {
                cb.addEventListener('change', function () {
                    pushCheckedState[this.value] = this.checked;
                    updateGlobalCount();
                });
            });

            // 更新全选框
            var selectAllCb = document.getElementById('pushSelectAll');
            if (selectAllCb) {
                var allChecked = Array.from(itemCbs).every(function (c) { return c.checked; });
                var noneChecked = Array.from(itemCbs).every(function (c) { return !c.checked; });
                selectAllCb.checked = allChecked;
                selectAllCb.indeterminate = !allChecked && !noneChecked;
            }
        }

        /** 更新全局选中计数 */
        function updateGlobalCount() {
            var count = 0;
            Object.keys(pushCheckedState).forEach(function (id) { if (pushCheckedState[id]) count++; });
            var pushCountEl = document.getElementById('pushCount');
            if (pushCountEl) pushCountEl.textContent = count;
            var selectAllCb = document.getElementById('pushSelectAll');
            if (selectAllCb) {
                var itemCbs = pushBody.querySelectorAll('.push-item-cb');
                var allChecked = itemCbs.length > 0 && Array.from(itemCbs).every(function (c) { return c.checked; });
                selectAllCb.checked = allChecked;
            }
        }

        // 初始渲染
        renderTabList();

        // Tab 切换
        pushBody.querySelectorAll('.push-tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                pushBody.querySelectorAll('.push-tab-btn').forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');
                currentTabIdx = parseInt(this.getAttribute('data-tab'));
                renderTabList();
            });
        });

        // 全选/取消全选联动（当前 Tab）
        var selectAllCb = document.getElementById('pushSelectAll');
        if (selectAllCb) {
            selectAllCb.addEventListener('change', function () {
                var itemCbs = pushBody.querySelectorAll('.push-item-cb');
                itemCbs.forEach(function (cb) {
                    cb.checked = selectAllCb.checked;
                    pushCheckedState[cb.value] = selectAllCb.checked;
                });
                updateGlobalCount();
            });
        }

        // 客户端选项样式联动
        pushBody.querySelectorAll('.push-client-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
                this.parentElement.classList.toggle('checked', this.checked);
            });
        });
    }

    /** 关闭推送抽屉 */
    function closePushDrawer() {
        pushOverlay.classList.remove('show');
    }

    /** 确认推送 */
    function confirmPush() {
        var selectedItems = [];
        Object.keys(pushCheckedState).forEach(function (id) {
            if (pushCheckedState[id]) selectedItems.push(id);
        });

        var selectedClients = [];
        pushBody.querySelectorAll('.push-client-cb:checked').forEach(function (cb) {
            selectedClients.push(cb.value);
        });

        if (selectedClients.length === 0) {
            toast('请至少选择一个推送客户端', 'error');
            return;
        }

        if (selectedItems.length === 0) {
            toast('请至少选择一条数据', 'error');
            return;
        }

        closePushDrawer();
        toast(
            '已推送到 ' + selectedClients.join('、') + '，共 ' + selectedItems.length + ' 条数据（前端模拟）',
            'success'
        );
        console.log('=== 模拟推送 ===');
        console.log('客户端:', selectedClients);
        console.log('患者:', currentPatientCode, getPatientName(currentPatientCode));
        console.log('就诊:', currentVisitSerial);
        console.log('数据IDs:', selectedItems);
    }

    // 推送按钮事件
    btnPush.addEventListener('click', openPushDrawer);
    btnPushClose.addEventListener('click', closePushDrawer);
    btnPushCancel.addEventListener('click', closePushDrawer);
    pushOverlay.addEventListener('click', function (e) {
        if (e.target === pushOverlay) closePushDrawer();
    });
    btnPushConfirm.addEventListener('click', confirmPush);

    window.ExamModule = {
        loadDetails: loadDetails,
        clear: clear,
        getCache: function () { return detailsCache; },
    };

})();
