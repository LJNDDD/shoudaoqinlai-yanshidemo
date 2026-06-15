const http = require('http');
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const Tesseract = require('tesseract.js');

const PORT = 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'mock-data', 'medical.db');

const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// ========== 数据库初始化 ==========
let SQL, db;

async function initDB() {
    SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('SQLite 已加载 →', DB_PATH);
    } else {
        console.log('数据库文件不存在，请先运行 node db/init.js');
        process.exit(1);
    }
}

function saveDB() {
    fs.writeFileSync(DB_PATH, db.export());
}

// ========== 工具函数 ==========

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
}

/** 将 sql.js exec 结果转为对象数组 */
function rowsToObjects(result) {
    if (!result || result.length === 0) return [];
    const cols = result[0].columns;
    return result[0].values.map(row => {
        const obj = {};
        cols.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
    });
}

function queryAll(sql, params) {
    if (params && params.length > 0) {
        // 参数化查询
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
    }
    return rowsToObjects(db.exec(sql));
}

function queryOne(sql, params) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function runSQL(sql, params) {
    db.run(sql, params);
    saveDB();
}

// ========== ID 生成 ==========

function generatePatientCode() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const prefix = 'P' + y + m + d;
    const rows = queryAll("SELECT patient_code FROM patients WHERE patient_code LIKE ?", [prefix + '%']);
    const maxNum = rows.reduce((max, p) => {
        const n = parseInt(p.patient_code.slice(-3), 10);
        return n > max ? n : max;
    }, 0);
    return prefix + String(maxNum + 1).padStart(3, '0');
}

function generateVisitSerialNo() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const prefix = 'VSN' + y + m + d;
    const rows = queryAll("SELECT visit_serial_no FROM visits WHERE visit_serial_no LIKE ?", [prefix + '%']);
    const maxNum = rows.reduce((max, v) => {
        const n = parseInt(v.visit_serial_no.slice(-4), 10);
        return n > max ? n : max;
    }, 0);
    return prefix + String(maxNum + 1).padStart(4, '0');
}

function generateExamDetailId() {
    const rows = queryAll("SELECT id FROM exam_details ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return 'VD001';
    const maxNum = parseInt(rows[0].id.replace('VD', ''), 10);
    return 'VD' + String(maxNum + 1).padStart(3, '0');
}

// ========== API 路由处理 ==========

async function handleAPI(req, res, method, pathParts) {
    try {
        // === 患者 API ===
        if (pathParts[1] === 'patients') {
            if (method === 'GET') {
                const rows = queryAll('SELECT * FROM patients ORDER BY created_at DESC');
                return sendJSON(res, 200, { success: true, data: rows });
            }

            if (method === 'POST') {
                const body = await parseBody(req);
                const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const code = generatePatientCode();
                runSQL('INSERT INTO patients (patient_code, patient_name, gender, birth_date, created_at, status) VALUES (?, ?, ?, ?, ?, 1)',
                    [code, body.patient_name || '', body.gender || '男', body.birth_date || '', now]);
                const row = queryOne('SELECT * FROM patients WHERE patient_code = ?', [code]);
                return sendJSON(res, 201, { success: true, data: row });
            }

            if ((method === 'PUT' || method === 'PATCH') && pathParts[2]) {
                const code = pathParts[2];
                const exists = queryOne('SELECT * FROM patients WHERE patient_code = ?', [code]);
                if (!exists) return sendJSON(res, 404, { success: false, message: '患者不存在' });

                if (method === 'PATCH') {
                    const newStatus = exists.status === 1 ? 0 : 1;
                    runSQL('UPDATE patients SET status = ? WHERE patient_code = ?', [newStatus, code]);
                } else {
                    const body = await parseBody(req);
                    runSQL('UPDATE patients SET patient_name = ?, gender = ?, birth_date = ? WHERE patient_code = ?',
                        [body.patient_name || '', body.gender || '男', body.birth_date || '', code]);
                }
                const row = queryOne('SELECT * FROM patients WHERE patient_code = ?', [code]);
                return sendJSON(res, 200, { success: true, data: row });
            }
        }

        // === 就诊记录 API ===
        if (pathParts[1] === 'visits') {
            if (method === 'GET') {
                const url = new URL(req.url, 'http://localhost');
                const patientCode = url.searchParams.get('patient_code');
                const rows = patientCode
                    ? queryAll('SELECT * FROM visits WHERE patient_code = ? ORDER BY visit_time DESC', [patientCode])
                    : queryAll('SELECT * FROM visits ORDER BY visit_time DESC');
                return sendJSON(res, 200, { success: true, data: rows });
            }

            if (method === 'POST') {
                const body = await parseBody(req);
                const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const serialNo = generateVisitSerialNo();
                runSQL('INSERT INTO visits (visit_serial_no, patient_code, visit_time, created_at, status) VALUES (?, ?, ?, ?, 1)',
                    [serialNo, body.patient_code || '', body.visit_time || now, now]);
                const row = queryOne('SELECT * FROM visits WHERE visit_serial_no = ?', [serialNo]);
                return sendJSON(res, 201, { success: true, data: row });
            }

            if ((method === 'PUT' || method === 'PATCH') && pathParts[2]) {
                const serialNo = pathParts[2];
                const exists = queryOne('SELECT * FROM visits WHERE visit_serial_no = ?', [serialNo]);
                if (!exists) return sendJSON(res, 404, { success: false, message: '就诊记录不存在' });

                if (method === 'PATCH') {
                    const newStatus = exists.status === 1 ? 0 : 1;
                    runSQL('UPDATE visits SET status = ? WHERE visit_serial_no = ?', [newStatus, serialNo]);
                } else {
                    const body = await parseBody(req);
                    runSQL('UPDATE visits SET patient_code = ?, visit_time = ? WHERE visit_serial_no = ?',
                        [body.patient_code || '', body.visit_time || '', serialNo]);
                }
                const row = queryOne('SELECT * FROM visits WHERE visit_serial_no = ?', [serialNo]);
                return sendJSON(res, 200, { success: true, data: row });
            }
        }

        // === 检查明细 API ===
        if (pathParts[1] === 'exam-details') {
            if (method === 'GET') {
                const url = new URL(req.url, 'http://localhost');
                const visitSerialNo = url.searchParams.get('visit_serial_no');
                const rows = visitSerialNo
                    ? queryAll('SELECT * FROM exam_details WHERE visit_serial_no = ? ORDER BY id', [visitSerialNo])
                    : queryAll('SELECT * FROM exam_details ORDER BY id');
                return sendJSON(res, 200, { success: true, data: rows });
            }

            if (method === 'POST') {
                const body = await parseBody(req);
                const id = generateExamDetailId();
                runSQL('INSERT INTO exam_details (id, visit_serial_no, exam_item_code, exam_item_name, indicator_code, indicator_name, exam_item_attr, exam_value, reference_value, qualitative_result, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
                    [id, body.visit_serial_no || '', body.exam_item_code || '', body.exam_item_name || '', body.indicator_code || '', body.indicator_name || '', body.exam_item_attr || '', body.exam_value || '', body.reference_value || '', body.qualitative_result || '']);
                const row = queryOne('SELECT * FROM exam_details WHERE id = ?', [id]);
                return sendJSON(res, 201, { success: true, data: row });
            }

            if ((method === 'PUT' || method === 'PATCH') && pathParts[2]) {
                const id = pathParts[2];
                const exists = queryOne('SELECT * FROM exam_details WHERE id = ?', [id]);
                if (!exists) return sendJSON(res, 404, { success: false, message: '检查明细不存在' });

                if (method === 'PATCH') {
                    const newStatus = exists.status === 1 ? 0 : 1;
                    runSQL('UPDATE exam_details SET status = ? WHERE id = ?', [newStatus, id]);
                } else {
                    const body = await parseBody(req);
                    runSQL('UPDATE exam_details SET visit_serial_no=?, exam_item_code=?, exam_item_name=?, indicator_code=?, indicator_name=?, exam_item_attr=?, exam_value=?, reference_value=?, qualitative_result=? WHERE id=?',
                        [body.visit_serial_no || '', body.exam_item_code || '', body.exam_item_name || '', body.indicator_code || '', body.indicator_name || '', body.exam_item_attr || '', body.exam_value || '', body.reference_value || '', body.qualitative_result || '', id]);
                }
                const row = queryOne('SELECT * FROM exam_details WHERE id = ?', [id]);
                return sendJSON(res, 200, { success: true, data: row });
            }
        }

        // === OCR 识别 API ===
        if (pathParts[1] === 'ocr' && pathParts[2] === 'recognize' && method === 'POST') {
            const body = await parseBody(req);
            if (!body.image) return sendJSON(res, 400, { success: false, message: '缺少图片数据' });

            try {
                // base64 解码
                const base64 = body.image.replace(/^data:image\/\w+;base64,/, '');
                const imgBuffer = Buffer.from(base64, 'base64');

                // 写临时文件
                const tmpPath = path.join(ROOT, 'mock-data', '_ocr_tmp.png');
                fs.writeFileSync(tmpPath, imgBuffer);

                // OCR 识别
                const { data: { text } } = await Tesseract.recognize(tmpPath, 'chi_sim+eng');

                // 清理临时文件
                try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }

                // 提取字段
                const patientInfo = extractPatientInfo(text);
                const visitInfo = extractVisitInfo(text);
                const rawIndicators = extractIndicators(text);

                // 从 reference_data 模糊匹配
                const refData = queryAll('SELECT exam_item_code, exam_item_name, indicator_code, indicator_name FROM reference_data');
                const matchedIndicators = rawIndicators.map(ind => {
                    const { match, score } = matchIndicator(ind.name, refData);
                    return {
                        raw_name: ind.name,
                        raw_value: ind.value,
                        raw_reference: ind.reference,
                        matched: match && score >= 0.4 ? match : null,
                        confidence: Math.round(score * 100),
                        confidence_level: score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low',
                    };
                });

                return sendJSON(res, 200, {
                    success: true,
                    data: {
                        raw_text: text,
                        patient: patientInfo,
                        visit: visitInfo,
                        indicators: matchedIndicators,
                    },
                });

            } catch (ocrErr) {
                console.error('OCR Error:', ocrErr);
                return sendJSON(res, 500, { success: false, message: 'OCR识别失败: ' + ocrErr.message });
            }
        }

        // === 参考数据 API（假数据.xlsx） ===
        if (pathParts[1] === 'reference') {
            if (pathParts[2] === 'exam-items' && method === 'GET') {
                const rows = queryAll('SELECT DISTINCT exam_item_code, exam_item_name, exam_attr FROM reference_data ORDER BY exam_item_name');
                return sendJSON(res, 200, { success: true, data: rows });
            }
            if (pathParts[2] === 'indicators' && method === 'GET') {
                const url = new URL(req.url, 'http://localhost');
                const examItemCode = url.searchParams.get('exam_item_code');
                if (!examItemCode) return sendJSON(res, 400, { success: false, message: '缺少 exam_item_code 参数' });
                const rows = queryAll('SELECT indicator_code, indicator_name, specimen_type, result_attr FROM reference_data WHERE exam_item_code = ? ORDER BY indicator_name', [examItemCode]);
                return sendJSON(res, 200, { success: true, data: rows });
            }
        }

        sendJSON(res, 404, { success: false, message: 'API route not found' });

    } catch (err) {
        console.error('API Error:', err);
        sendJSON(res, 500, { success: false, message: err.message || 'Internal Server Error' });
    }
}

// ========== OCR 辅助函数 ==========

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
    return dp[m][n];
}

function similarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
}

function matchIndicator(ocrText, refData) {
    let best = null, bestScore = 0;
    const clean = ocrText.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '').replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();
    for (const ref of refData) {
        const refClean = ref.indicator_name.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '').replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();
        let score = similarity(clean, refClean);
        if (clean.includes(refClean) || refClean.includes(clean)) score = Math.max(score, 0.8);
        if (score > bestScore) { bestScore = score; best = ref; }
    }
    return { match: best, score: bestScore };
}

function extractPatientInfo(text) {
    const info = { name: '', gender: '', birthDate: '', age: '' };
    const namePatterns = [/姓名[:：]\s*([^\n\r]+)/, /患者[:：]\s*([^\n\r]+)/, /姓名\s+([^\n\r]{2,4})/];
    for (const p of namePatterns) { const m = text.match(p); if (m) { info.name = m[1].trim(); break; } }
    const gm = text.match(/性别[:：]\s*(男|女)/);
    if (gm) info.gender = gm[1];
    const am = text.match(/年龄[:：]\s*(\d+)/);
    if (am) info.age = am[1];
    const bm = text.match(/(?:出生日期|生日)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/);
    if (bm) info.birthDate = bm[1].replace(/[\/.]/g, '-');
    return info;
}

function extractVisitInfo(text) {
    const info = { visitTime: '', sampleNo: '', dept: '' };
    const dm = text.match(/(?:检验日期|采样日期|送检日期|报告日期)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/);
    if (dm) info.visitTime = dm[1].replace(/[\/.]/g, '-');
    const sm = text.match(/(?:样本号|标本号|条码号|编号)[:：]\s*([^\n\r]+)/);
    if (sm) info.sampleNo = sm[1].trim();
    const depm = text.match(/(?:科室|送检科室|申请科室)[:：]\s*([^\n\r]+)/);
    if (depm) info.dept = depm[1].trim();
    return info;
}

function extractIndicators(text) {
    const lines = text.split('\n');
    const indicators = [];
    const pattern = /([一-龥a-zA-Zβγδ()（）α]+?)\s+([\d.]+)\s+([<>\d.\-～~]+\s*\S*)/;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 5) continue;
        if (/^(检验|报告|项目|序号|编号|结果|参考|单位|正常|异常)/.test(trimmed)) continue;
        const m = trimmed.match(pattern);
        if (m) indicators.push({ name: m[1].trim(), value: m[2].trim(), reference: m[3].trim() });
    }
    return indicators;
}

// ========== 主服务器 ==========

(async function start() {
    await initDB();

    http.createServer((req, res) => {
        const urlPath = req.url.split('?')[0];
        const method = req.method.toUpperCase();
        const pathParts = urlPath.split('/').filter(Boolean);

        if (method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            });
            return res.end();
        }

        if (pathParts[0] === 'api') {
            return handleAPI(req, res, method, pathParts);
        }

        let filePath;
        if (urlPath === '/' || urlPath === '/index.html') {
            filePath = path.join(ROOT, 'index.html');
        } else if (urlPath === '/demo' || urlPath === '/demo/') {
            filePath = path.join(ROOT, 'demo', 'index.html');
        } else {
            filePath = path.join(ROOT, urlPath);
        }

        const ext = path.extname(filePath);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
            } else {
                res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
                res.end(data);
            }
        });
    }).listen(PORT, () => {
        console.log(`手到擒来产品中心已启动 → http://localhost:${PORT}/`);
    });
})();
