/**
 * 数据库初始化脚本
 * 从 mock-data/*.json 迁移数据到 SQLite（sql.js）
 * 运行：node db/init.js
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'mock-data', 'medical.db');
const PATIENTS_JSON = path.join(ROOT, 'mock-data', 'patients.json');
const VISITS_JSON = path.join(ROOT, 'mock-data', 'visits.json');
const EXAM_DETAILS_JSON = path.join(ROOT, 'mock-data', 'exam-details.json');

async function main() {
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    // ========== 建表 ==========
    db.run(`
        CREATE TABLE IF NOT EXISTS patients (
            patient_code TEXT PRIMARY KEY,
            patient_name TEXT NOT NULL,
            gender TEXT NOT NULL DEFAULT '男',
            birth_date TEXT,
            created_at TEXT NOT NULL,
            status INTEGER NOT NULL DEFAULT 1
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS visits (
            visit_serial_no TEXT PRIMARY KEY,
            patient_code TEXT NOT NULL,
            visit_time TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (patient_code) REFERENCES patients(patient_code)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS exam_details (
            id TEXT PRIMARY KEY,
            visit_serial_no TEXT NOT NULL,
            exam_item_code TEXT NOT NULL,
            exam_item_name TEXT NOT NULL,
            indicator_code TEXT NOT NULL,
            indicator_name TEXT NOT NULL,
            exam_item_attr TEXT,
            exam_value TEXT,
            reference_value TEXT,
            qualitative_result TEXT,
            status INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (visit_serial_no) REFERENCES visits(visit_serial_no)
        )
    `);

    // ========== 索引 ==========
    db.run('CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_code)');
    db.run('CREATE INDEX IF NOT EXISTS idx_exam_visit ON exam_details(visit_serial_no)');
    db.run('CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_exam_status ON exam_details(status)');

    // ========== 迁移数据 ==========
    const insertPatient = db.prepare(
        'INSERT OR IGNORE INTO patients (patient_code, patient_name, gender, birth_date, created_at, status) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertVisit = db.prepare(
        'INSERT OR IGNORE INTO visits (visit_serial_no, patient_code, visit_time, created_at, status) VALUES (?, ?, ?, ?, ?)'
    );
    const insertExam = db.prepare(
        'INSERT OR IGNORE INTO exam_details (id, visit_serial_no, exam_item_code, exam_item_name, indicator_code, indicator_name, exam_item_attr, exam_value, reference_value, qualitative_result, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    // 患者
    if (fs.existsSync(PATIENTS_JSON)) {
        const patients = JSON.parse(fs.readFileSync(PATIENTS_JSON, 'utf8'));
        patients.forEach(p => {
            insertPatient.run([p.patient_code, p.patient_name, p.gender, p.birth_date || '', p.created_at, p.status]);
        });
    }

    // 就诊
    if (fs.existsSync(VISITS_JSON)) {
        const visits = JSON.parse(fs.readFileSync(VISITS_JSON, 'utf8'));
        visits.forEach(v => {
            insertVisit.run([v.visit_serial_no, v.patient_code, v.visit_time, v.created_at, v.status]);
        });
    }

    // 明细
    if (fs.existsSync(EXAM_DETAILS_JSON)) {
        const details = JSON.parse(fs.readFileSync(EXAM_DETAILS_JSON, 'utf8'));
        details.forEach(d => {
            insertExam.run([d.id, d.visit_serial_no, d.exam_item_code, d.exam_item_name, d.indicator_code, d.indicator_name, d.exam_item_attr || '', d.exam_value || '', d.reference_value || '', d.qualitative_result || '', d.status]);
        });
    }

    insertPatient.free();
    insertVisit.free();
    insertExam.free();

    // ========== 写入数据库文件 ==========
    const buffer = db.export();
    fs.writeFileSync(DB_PATH, buffer);
    db.close();

    console.log('数据库初始化完成 →', DB_PATH);

    // 验证
    const verifyDb = new SQL.Database(fs.readFileSync(DB_PATH));
    const pCount = verifyDb.exec('SELECT COUNT(*) AS cnt FROM patients')[0].values[0][0];
    const vCount = verifyDb.exec('SELECT COUNT(*) AS cnt FROM visits')[0].values[0][0];
    const eCount = verifyDb.exec('SELECT COUNT(*) AS cnt FROM exam_details')[0].values[0][0];
    console.log(`患者 ${pCount} 条 | 就诊 ${vCount} 条 | 明细 ${eCount} 条`);
    verifyDb.close();
}

main().catch(err => { console.error('初始化失败:', err); process.exit(1); });
