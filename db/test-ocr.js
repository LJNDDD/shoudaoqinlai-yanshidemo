/**
 * OCR 测试脚本
 * 用法：node db/test-ocr.js <图片路径>
 * 示例：node db/test-ocr.js report.jpg
 */
const Tesseract = require('tesseract.js');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const imgPath = process.argv[2];
if (!imgPath) {
    console.log('用法: node db/test-ocr.js <图片路径>');
    console.log('示例: node db/test-ocr.js D:/report.jpg');
    process.exit(1);
}

const DB_PATH = path.join(__dirname, '..', 'mock-data', 'medical.db');

// ========== 模糊匹配 ==========

/** Levenshtein 距离 */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
        }
    }
    return dp[m][n];
}

/** 字符串相似度 (0-1) */
function similarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(a, b) / maxLen;
}

/** 在 reference_data 中查找最匹配的指标 */
function matchIndicator(ocrText, referenceData) {
    let best = null, bestScore = 0;
    // 预处理 OCR 文本：去括号、去空格、去特殊符号
    const clean = ocrText.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '').replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();

    for (const ref of referenceData) {
        const refClean = ref.indicator_name.replace(/[（(].*?[)）]/g, '').replace(/\s+/g, '').replace(/[^一-龥a-zA-Z0-9]/g, '').toLowerCase();
        // 包含关系加分
        let score = similarity(clean, refClean);
        if (clean.includes(refClean) || refClean.includes(clean)) score = Math.max(score, 0.8);
        if (score > bestScore) {
            bestScore = score;
            best = ref;
        }
    }
    return { match: best, score: bestScore };
}

// ========== 文本解析 ==========

/** 从 OCR 文本中提取患者信息 */
function extractPatientInfo(text) {
    const info = { name: '', gender: '', birthDate: '', age: '' };

    // 姓名（常见模式）
    const namePatterns = [/姓名[:：]\s*([^\n\r]+)/, /患者[:：]\s*([^\n\r]+)/, /姓名\s+([^\n\r]{2,4})/];
    for (const p of namePatterns) {
        const m = text.match(p);
        if (m) { info.name = m[1].trim(); break; }
    }

    // 性别
    const genderM = text.match(/性别[:：]\s*(男|女)/);
    if (genderM) info.gender = genderM[1];

    // 年龄
    const ageM = text.match(/年龄[:：]\s*(\d+)/);
    if (ageM) info.age = ageM[1];

    // 出生日期
    const birthM = text.match(/(?:出生日期|生日)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/);
    if (birthM) info.birthDate = birthM[1].replace(/[\/.]/g, '-');

    return info;
}

/** 从 OCR 文本中提取就诊信息 */
function extractVisitInfo(text) {
    const info = { visitTime: '', sampleNo: '', dept: '' };

    const dateM = text.match(/(?:检验日期|采样日期|送检日期|报告日期)[:：]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/);
    if (dateM) info.visitTime = dateM[1].replace(/[\/.]/g, '-');

    const sampleM = text.match(/(?:样本号|标本号|条码号|编号)[:：]\s*([^\n\r]+)/);
    if (sampleM) info.sampleNo = sampleM[1].trim();

    const deptM = text.match(/(?:科室|送检科室|申请科室)[:：]\s*([^\n\r]+)/);
    if (deptM) info.dept = deptM[1].trim();

    return info;
}

/** 从 OCR 文本中提取指标行 */
function extractIndicators(text) {
    const lines = text.split('\n');
    const indicators = [];

    // 匹配模式：指标名 + 结果值 + 参考范围 + 单位
    // 如：白细胞计数    7.5    4.0-10.0    ×10⁹/L
    const pattern = /([一-龥a-zA-Z()（）]+?)\s+([\d.]+)\s+([<>\d.\-～~]+\s*\S*)/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 5) continue;
        // 跳过标题行
        if (/^(检验|报告|项目|序号|编号|结果|参考|单位|正常|异常)/.test(trimmed)) continue;

        const m = trimmed.match(pattern);
        if (m) {
            indicators.push({
                raw: trimmed,
                name: m[1].trim(),
                value: m[2].trim(),
                reference: m[3].trim(),
            });
        }
    }

    return indicators;
}

// ========== 主流程 ==========

(async () => {
    console.log('=== OCR 识别测试 ===');
    console.log('图片:', imgPath);
    console.log('');

    // 1. OCR 识别
    console.log('⏳ 正在识别（首次运行需下载中文语言包约 10MB）...');
    const startTime = Date.now();
    const { data: { text } } = await Tesseract.recognize(imgPath, 'chi_sim+eng', {
        logger: m => {
            if (m.status === 'recognizing text') {
                process.stdout.write('\r  进度: ' + Math.round(m.progress * 100) + '%');
            }
        },
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\r✅ 识别完成，耗时 ' + elapsed + 's\n');

    console.log('=== 原始识别文本 ===');
    console.log(text);
    console.log('');

    // 2. 提取患者信息
    const patientInfo = extractPatientInfo(text);
    console.log('=== 患者信息 ===');
    console.log('  姓名:', patientInfo.name || '(未识别)');
    console.log('  性别:', patientInfo.gender || '(未识别)');
    console.log('  年龄:', patientInfo.age || '(未识别)');
    console.log('  出生日期:', patientInfo.birthDate || '(未识别)');
    console.log('');

    // 3. 提取就诊信息
    const visitInfo = extractVisitInfo(text);
    console.log('=== 就诊信息 ===');
    console.log('  检验日期:', visitInfo.visitTime || '(未识别)');
    console.log('  样本号:', visitInfo.sampleNo || '(未识别)');
    console.log('  科室:', visitInfo.dept || '(未识别)');
    console.log('');

    // 4. 提取指标
    const indicators = extractIndicators(text);
    console.log('=== 识别到 ' + indicators.length + ' 条指标 ===');

    // 5. 加载 reference_data 并模糊匹配
    let referenceData = [];
    if (fs.existsSync(DB_PATH)) {
        const SQL = await initSqlJs();
        const db = new SQL.Database(fs.readFileSync(DB_PATH));
        const refResult = db.exec('SELECT exam_item_code, exam_item_name, indicator_code, indicator_name FROM reference_data');
        if (refResult[0]) {
            referenceData = refResult[0].values.map(r => ({
                exam_item_code: r[0],
                exam_item_name: r[1],
                indicator_code: r[2],
                indicator_name: r[3],
            }));
        }
        db.close();
    }

    if (referenceData.length > 0) {
        console.log('\n=== 指标匹配结果（与 reference_data 模糊匹配） ===');
        console.log('OCR名称 | 检查值 | 参考值 | 匹配指标 | 检查项目 | 相似度');
        console.log('--------|--------|--------|----------|----------|--------');

        for (const ind of indicators) {
            const { match, score } = matchIndicator(ind.name, referenceData);
            const scoreStr = (score * 100).toFixed(0) + '%';
            const icon = score >= 0.7 ? '🟢' : score >= 0.4 ? '🟡' : '🔴';
            if (match && score >= 0.4) {
                console.log(`${ind.name} | ${ind.value} | ${ind.reference} | ${match.indicator_name} | ${match.exam_item_name} | ${icon} ${scoreStr}`);
            } else {
                console.log(`${ind.name} | ${ind.value} | ${ind.reference} | (未匹配) | - | 🔴 ${scoreStr}`);
            }
        }
    } else {
        console.log('\n⚠️  未找到 reference_data，跳过匹配');
        console.log('=== 原始指标列表 ===');
        indicators.forEach(ind => {
            console.log(`  ${ind.name} | 值:${ind.value} | 参考:${ind.reference}`);
        });
    }

    console.log('\n=== 测试完成 ===');
    console.log('将图片路径作为参数传入即可测试: node db/test-ocr.js <图片路径>');
})();
