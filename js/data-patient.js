/**
 * 数据管理 — 患者列表面板
 * 交互流程：选择患者 → 触发就诊记录加载
 */
(function () {
    'use strict';

    var listEl = document.getElementById('patientList');
    var searchEl = document.getElementById('patientSearch');
    var btnAdd = document.getElementById('btnAddPatient');
    var btnAddVisit = document.getElementById('btnAddVisit');

    var patientsCache = [];
    var currentCode = null;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /** 计算年龄 */
    function calcAge(birthDate) {
        if (!birthDate) return '';
        var birth = new Date(birthDate);
        var now = new Date();
        var age = now.getFullYear() - birth.getFullYear();
        var m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        return age + '岁';
    }

    /** Toast 通知 */
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

    /** 渲染患者列表 */
    function render() {
        var keyword = (searchEl.value || '').toLowerCase();
        var filtered = patientsCache.filter(function (p) {
            if (!keyword) return true;
            return p.patient_name.toLowerCase().includes(keyword) ||
                   p.patient_code.toLowerCase().includes(keyword);
        });

        listEl.innerHTML = filtered.map(function (p) {
            var isActive = p.patient_code === currentCode;
            var isDisabled = p.status === 0;
            var age = calcAge(p.birth_date);
            return (
                '<div class="patient-item' + (isActive ? ' active' : '') + (isDisabled ? ' disabled' : '') + '" data-code="' + escapeHtml(p.patient_code) + '">' +
                    '<div class="patient-info">' +
                        '<div class="name">' + escapeHtml(p.patient_name) + '</div>' +
                        '<div class="meta">' + escapeHtml(p.patient_code) + ' · ' + age + ' ' + escapeHtml(p.gender) + '</div>' +
                    '</div>' +
                    '<div class="patient-actions">' +
                        '<button class="btn-icon btn-edit" data-code="' + escapeHtml(p.patient_code) + '" title="编辑"><i class="fas fa-pen"></i></button>' +
                        '<button class="btn-icon btn-disable" data-code="' + escapeHtml(p.patient_code) + '" title="' + (isDisabled ? '启用' : '停用') + '"><i class="fas fa-' + (isDisabled ? 'toggle-on' : 'toggle-off') + '"></i></button>' +
                    '</div>' +
                '</div>'
            );
        }).join('');

        // 绑定点击事件
        listEl.querySelectorAll('.patient-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                // 如果点击的是操作按钮，不触发选择
                if (e.target.closest('.btn-icon')) return;
                selectPatient(this.getAttribute('data-code'));
            });
        });

        // 编辑按钮
        listEl.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var code = this.getAttribute('data-code');
                editPatient(code);
            });
        });

        // 停用/启用按钮
        listEl.querySelectorAll('.btn-disable').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var code = this.getAttribute('data-code');
                togglePatient(code);
            });
        });
    }

    /** 选择患者 */
    function selectPatient(code) {
        currentCode = code;
        render();
        // 启用就诊新增按钮
        btnAddVisit.disabled = false;
        // 通知就诊模块
        if (window.VisitModule) window.VisitModule.loadVisits(code);
    }

    /** 新增患者 */
    function addPatient() {
        window.ModalManager.show('新增患者', window.ModalManager.patientFields(), null, async function (data) {
            try {
                if (!data.patient_name.trim()) {
                    toast('请输入患者姓名', 'error');
                    return;
                }
                await window.DataAPI.createPatient(data);
                window.ModalManager.close();
                toast('患者新增成功');
                await reload();
            } catch (err) {
                toast('新增失败: ' + err.message, 'error');
            }
        });
    }

    /** 编辑患者 */
    function editPatient(code) {
        var patient = patientsCache.find(function (p) { return p.patient_code === code; });
        if (!patient) return;

        window.ModalManager.show('编辑患者', window.ModalManager.patientFields(), patient, async function (data) {
            try {
                if (!data.patient_name.trim()) {
                    toast('请输入患者姓名', 'error');
                    return;
                }
                await window.DataAPI.updatePatient(code, data);
                window.ModalManager.close();
                toast('患者编辑成功');
                await reload();
            } catch (err) {
                toast('编辑失败: ' + err.message, 'error');
            }
        });
    }

    /** 停用/启用患者 */
    async function togglePatient(code) {
        try {
            var result = await window.DataAPI.togglePatientStatus(code);
            toast(result.status === 0 ? '患者已停用' : '患者已启用');
            await reload();
        } catch (err) {
            toast('操作失败: ' + err.message, 'error');
        }
    }

    /** 重新加载数据 */
    async function reload() {
        try {
            patientsCache = await window.DataAPI.fetchPatients();
            render();
        } catch (err) {
            toast('加载患者数据失败: ' + err.message, 'error');
        }
    }

    // 事件绑定
    btnAdd.addEventListener('click', addPatient);
    searchEl.addEventListener('input', function () { render(); });

    // 初始加载
    reload();

    // 暴露到全局
    window.PatientModule = {
        reload: reload,
        getCurrentCode: function () { return currentCode; },
        getCache: function () { return patientsCache; },
    };

})();
