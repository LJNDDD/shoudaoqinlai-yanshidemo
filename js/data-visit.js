/**
 * 数据管理 — 就诊记录列表面板
 * 交互流程：选择就诊 → 触发检查明细加载
 */
(function () {
    'use strict';

    var listEl = document.getElementById('visitList');
    var titleEl = document.getElementById('visitTitle');
    var subtitleEl = document.getElementById('visitSubtitle');
    var btnAdd = document.getElementById('btnAddVisit');
    var btnAddExam = document.getElementById('btnAddExam');

    var visitsCache = [];
    var currentSerialNo = null;
    var currentPatientCode = null;

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

    /** 获取患者名称 */
    function getPatientName(code) {
        var cache = window.PatientModule ? window.PatientModule.getCache() : [];
        var p = cache.find(function (item) { return item.patient_code === code; });
        return p ? p.patient_name : code;
    }

    /** 加载就诊记录 */
    async function loadVisits(patientCode) {
        currentPatientCode = patientCode;
        currentSerialNo = null;
        btnAdd.disabled = false;
        btnAddExam.disabled = true;
        // 清空检查明细
        if (window.ExamModule) window.ExamModule.clear();

        var patientName = getPatientName(patientCode);
        titleEl.textContent = '就诊记录 · ' + patientName;

        try {
            visitsCache = await window.DataAPI.fetchVisits(patientCode);
            subtitleEl.textContent = '共 ' + visitsCache.length + ' 条就诊记录';
            render();
        } catch (err) {
            subtitleEl.textContent = '加载失败';
            toast('加载就诊记录失败: ' + err.message, 'error');
        }
    }

    /** 渲染就诊列表 */
    function render() {
        listEl.innerHTML = visitsCache.map(function (v) {
            var isActive = v.visit_serial_no === currentSerialNo;
            var isDisabled = v.status === 0;
            var visitDate = v.visit_time ? v.visit_time.substring(0, 10) : '-';
            var visitTime = v.visit_time || '-';
            return (
                '<div class="visit-card' + (isActive ? ' active' : '') + (isDisabled ? ' disabled' : '') + '" data-serial="' + escapeHtml(v.visit_serial_no) + '">' +
                    '<div class="visit-row">' +
                        '<span class="visit-label">就诊时间</span>' +
                        '<span class="visit-value">' + visitDate + '</span>' +
                    '</div>' +
                    '<div class="visit-row">' +
                        '<span class="visit-label">创建时间</span>' +
                        '<span>' + (v.created_at ? v.created_at.substring(0, 16) : '-') + '</span>' +
                    '</div>' +
                    '<div class="visit-actions">' +
                        '<button class="btn-icon-sm btn-edit-visit" data-serial="' + escapeHtml(v.visit_serial_no) + '" title="编辑"><i class="fas fa-pen"></i></button>' +
                        '<button class="btn-icon-sm btn-disable btn-toggle-visit" data-serial="' + escapeHtml(v.visit_serial_no) + '" title="' + (isDisabled ? '启用' : '停用') + '"><i class="fas fa-' + (isDisabled ? 'toggle-on' : 'toggle-off') + '"></i></button>' +
                    '</div>' +
                '</div>'
            );
        }).join('');

        // 绑定点击
        listEl.querySelectorAll('.visit-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.closest('.btn-icon-sm')) return;
                selectVisit(this.getAttribute('data-serial'));
            });
        });

        // 编辑
        listEl.querySelectorAll('.btn-edit-visit').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                editVisit(this.getAttribute('data-serial'));
            });
        });

        // 停用/启用
        listEl.querySelectorAll('.btn-toggle-visit').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleVisit(this.getAttribute('data-serial'));
            });
        });
    }

    /** 选择就诊 */
    function selectVisit(serialNo) {
        currentSerialNo = serialNo;
        render();
        btnAddExam.disabled = false;
        if (window.ExamModule) window.ExamModule.loadDetails(serialNo, currentPatientCode);
    }

    /** 构建患者下拉选项（仅启用状态的患者） */
    function buildPatientOptions() {
        var patients = window.PatientModule ? window.PatientModule.getCache() : [];
        return patients.filter(function (p) { return p.status === 1; }).map(function (p) {
            return { value: p.patient_code, label: p.patient_code + ' — ' + p.patient_name };
        });
    }

    /** 新增就诊 */
    function addVisit() {
        var options = buildPatientOptions();
        if (options.length === 0) {
            toast('无可用患者，请先新增患者', 'error');
            return;
        }
        // 如果当前已选中患者，默认选中
        var initData = currentPatientCode ? { patient_code: currentPatientCode } : null;
        window.ModalManager.show('新增就诊记录', window.ModalManager.visitFields(options), initData, async function (data) {
            try {
                if (!data.patient_code) {
                    toast('请选择患者', 'error');
                    return;
                }
                await window.DataAPI.createVisit(data);
                window.ModalManager.close();
                toast('就诊记录新增成功');
                await loadVisits(data.patient_code);
                // 同步更新患者选中
                if (currentPatientCode !== data.patient_code && window.PatientModule) {
                    // 需要重新加载就诊列表
                }
            } catch (err) {
                toast('新增失败: ' + err.message, 'error');
            }
        });
    }

    /** 编辑就诊 */
    function editVisit(serialNo) {
        var visit = visitsCache.find(function (v) { return v.visit_serial_no === serialNo; });
        if (!visit) return;
        var options = buildPatientOptions();
        window.ModalManager.show('编辑就诊记录', window.ModalManager.visitFields(options), visit, async function (data) {
            try {
                await window.DataAPI.updateVisit(serialNo, data);
                window.ModalManager.close();
                toast('就诊记录编辑成功');
                await loadVisits(currentPatientCode);
            } catch (err) {
                toast('编辑失败: ' + err.message, 'error');
            }
        });
    }

    /** 停用/启用就诊 */
    async function toggleVisit(serialNo) {
        try {
            var result = await window.DataAPI.toggleVisitStatus(serialNo);
            toast(result.status === 0 ? '就诊记录已停用' : '就诊记录已启用');
            // 如果停用的是当前选中的就诊，清空明细
            if (result.status === 0 && serialNo === currentSerialNo && window.ExamModule) {
                window.ExamModule.clear();
                btnAddExam.disabled = true;
                currentSerialNo = null;
            }
            await loadVisits(currentPatientCode);
        } catch (err) {
            toast('操作失败: ' + err.message, 'error');
        }
    }

    btnAdd.addEventListener('click', addVisit);

    // 暴露到全局
    window.VisitModule = {
        loadVisits: loadVisits,
        getCurrentSerialNo: function () { return currentSerialNo; },
        getCache: function () { return visitsCache; },
        reload: function () { return loadVisits(currentPatientCode); },
    };

})();
