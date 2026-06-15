/**
 * 数据管理 — API 请求层
 * 封装所有 fetch 请求，对上层暴露 async 函数
 */
(function () {
    'use strict';

    const BASE = '/api';

    async function request(method, url, body) {
        const opts = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        const json = await res.json();
        if (!json.success) throw new Error(json.message || '请求失败');
        return json.data;
    }

    // ========== 患者 API ==========

    async function fetchPatients() {
        return request('GET', BASE + '/patients');
    }

    async function createPatient(data) {
        return request('POST', BASE + '/patients', data);
    }

    async function updatePatient(code, data) {
        return request('PUT', BASE + '/patients/' + encodeURIComponent(code), data);
    }

    async function togglePatientStatus(code) {
        return request('PATCH', BASE + '/patients/' + encodeURIComponent(code));
    }

    // ========== 就诊记录 API ==========

    async function fetchVisits(patientCode) {
        var url = BASE + '/visits';
        if (patientCode) url += '?patient_code=' + encodeURIComponent(patientCode);
        return request('GET', url);
    }

    async function createVisit(data) {
        return request('POST', BASE + '/visits', data);
    }

    async function updateVisit(serialNo, data) {
        return request('PUT', BASE + '/visits/' + encodeURIComponent(serialNo), data);
    }

    async function toggleVisitStatus(serialNo) {
        return request('PATCH', BASE + '/visits/' + encodeURIComponent(serialNo));
    }

    // ========== 检查明细 API ==========

    async function fetchExamDetails(visitSerialNo) {
        var url = BASE + '/exam-details';
        if (visitSerialNo) url += '?visit_serial_no=' + encodeURIComponent(visitSerialNo);
        return request('GET', url);
    }

    async function createExamDetail(data) {
        return request('POST', BASE + '/exam-details', data);
    }

    async function updateExamDetail(id, data) {
        return request('PUT', BASE + '/exam-details/' + encodeURIComponent(id), data);
    }

    async function toggleExamDetailStatus(id) {
        return request('PATCH', BASE + '/exam-details/' + encodeURIComponent(id));
    }

    // ========== 暴露到全局 ==========

    window.DataAPI = {
        // 患者
        fetchPatients: fetchPatients,
        createPatient: createPatient,
        updatePatient: updatePatient,
        togglePatientStatus: togglePatientStatus,
        // 就诊
        fetchVisits: fetchVisits,
        createVisit: createVisit,
        updateVisit: updateVisit,
        toggleVisitStatus: toggleVisitStatus,
        // 明细
        fetchExamDetails: fetchExamDetails,
        createExamDetail: createExamDetail,
        updateExamDetail: updateExamDetail,
        toggleExamDetailStatus: toggleExamDetailStatus,
    };

})();
