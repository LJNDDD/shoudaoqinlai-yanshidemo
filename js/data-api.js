/**
 * 数据管理 — API 请求层
 * 优先调用 API（本地 server.js），失败时回退到静态 JSON 文件（GitHub Pages）
 */
(function () {
    'use strict';

    var BASE = '/api';
    var JSON_BASE = '/mock-data';
    var apiAvailable = true; // 首次成功后设为 true

    /** API 请求 */
    async function apiRequest(method, url, body) {
        var opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        var res = await fetch(url, opts);
        if (!res.ok) throw new Error('API ' + res.status);
        var json = await res.json();
        if (!json.success) throw new Error(json.message || '请求失败');
        apiAvailable = true;
        return json.data;
    }

    /** 从静态 JSON 文件加载数据 */
    async function loadJSON(filename) {
        var res = await fetch(JSON_BASE + '/' + filename);
        if (!res.ok) throw new Error('JSON file not found: ' + filename);
        return res.json();
    }

    /** 写操作不可用时的提示 */
    function readOnlyError() {
        throw new Error('当前为静态托管环境，不支持写入操作。请本地运行 server.js。');
    }

    // ========== 患者 API ==========

    async function fetchPatients() {
        try {
            return await apiRequest('GET', BASE + '/patients');
        } catch (e) {
            return loadJSON('patients.json');
        }
    }

    async function createPatient(data) {
        try { return await apiRequest('POST', BASE + '/patients', data); }
        catch (e) { throw readOnlyError(); }
    }

    async function updatePatient(code, data) {
        try { return await apiRequest('PUT', BASE + '/patients/' + encodeURIComponent(code), data); }
        catch (e) { throw readOnlyError(); }
    }

    async function togglePatientStatus(code) {
        try { return await apiRequest('PATCH', BASE + '/patients/' + encodeURIComponent(code)); }
        catch (e) { throw readOnlyError(); }
    }

    // ========== 就诊记录 API ==========

    async function fetchVisits(patientCode) {
        try {
            var url = BASE + '/visits';
            if (patientCode) url += '?patient_code=' + encodeURIComponent(patientCode);
            return await apiRequest('GET', url);
        } catch (e) {
            var all = await loadJSON('visits.json');
            if (patientCode) all = all.filter(function (v) { return v.patient_code === patientCode; });
            return all;
        }
    }

    async function createVisit(data) {
        try { return await apiRequest('POST', BASE + '/visits', data); }
        catch (e) { throw readOnlyError(); }
    }

    async function updateVisit(serialNo, data) {
        try { return await apiRequest('PUT', BASE + '/visits/' + encodeURIComponent(serialNo), data); }
        catch (e) { throw readOnlyError(); }
    }

    async function toggleVisitStatus(serialNo) {
        try { return await apiRequest('PATCH', BASE + '/visits/' + encodeURIComponent(serialNo)); }
        catch (e) { throw readOnlyError(); }
    }

    // ========== 检查明细 API ==========

    async function fetchExamDetails(visitSerialNo) {
        try {
            var url = BASE + '/exam-details';
            if (visitSerialNo) url += '?visit_serial_no=' + encodeURIComponent(visitSerialNo);
            return await apiRequest('GET', url);
        } catch (e) {
            var all = await loadJSON('exam-details.json');
            if (visitSerialNo) all = all.filter(function (d) { return d.visit_serial_no === visitSerialNo; });
            return all;
        }
    }

    async function createExamDetail(data) {
        try { return await apiRequest('POST', BASE + '/exam-details', data); }
        catch (e) { throw readOnlyError(); }
    }

    async function updateExamDetail(id, data) {
        try { return await apiRequest('PUT', BASE + '/exam-details/' + encodeURIComponent(id), data); }
        catch (e) { throw readOnlyError(); }
    }

    async function toggleExamDetailStatus(id) {
        try { return await apiRequest('PATCH', BASE + '/exam-details/' + encodeURIComponent(id)); }
        catch (e) { throw readOnlyError(); }
    }

    // ========== 暴露到全局 ==========

    window.DataAPI = {
        fetchPatients: fetchPatients,
        createPatient: createPatient,
        updatePatient: updatePatient,
        togglePatientStatus: togglePatientStatus,
        fetchVisits: fetchVisits,
        createVisit: createVisit,
        updateVisit: updateVisit,
        toggleVisitStatus: toggleVisitStatus,
        fetchExamDetails: fetchExamDetails,
        createExamDetail: createExamDetail,
        updateExamDetail: updateExamDetail,
        toggleExamDetailStatus: toggleExamDetailStatus,
    };

})();
