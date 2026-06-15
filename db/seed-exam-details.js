const initSqlJs = require('sql.js');
const fs = require('fs');

(async () => {
    const SQL = await initSqlJs();
    const dbPath = 'd:/润达文件/产品/体检/05.原型/统一演示平台/mock-data/medical.db';
    const db = new SQL.Database(fs.readFileSync(dbPath));

    let maxId = db.exec("SELECT MAX(CAST(SUBSTR(id,3) AS INTEGER)) FROM exam_details")[0].values[0][0] || 5;
    let next = maxId + 1;

    const records = [
        // VSN20260115001 张三 年度体检
        ['VSN20260115001','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.06-DL','丙氨基酸转移酶','实验类','32','9-50 U/L','正常'],
        ['VSN20260115001','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.07-DL','天门冬氨酸氨基转移酶','实验类','28','15-40 U/L','正常'],
        ['VSN20260115001','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.01-DL','总蛋白','实验类','72','65-85 g/L','正常'],
        ['VSN20260115001','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.02-DL','白蛋白','实验类','45','40-55 g/L','正常'],
        ['VSN20260115001','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.01-DL','血肌酐','实验类','88','62-115 umol/L','正常'],
        ['VSN20260115001','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.02-DL','尿酸','实验类','420','208-428 umol/L','正常'],
        ['VSN20260115001','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.03-DL','尿素氮','实验类','5.2','3.2-7.1 mmol/L','正常'],
        ['VSN20260115001','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.05-DL','总胆固醇','实验类','5.1','<5.2 mmol/L','正常'],
        ['VSN20260115001','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.06-DL','甘油三酯','实验类','1.8','<1.7 mmol/L','偏高'],
        ['VSN20260115001','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.07-DL','高密度脂蛋白胆固醇','实验类','1.1','>1.0 mmol/L','正常'],
        ['VSN20260115001','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.08-DL','低密度脂蛋白胆固醇','实验类','3.2','<3.4 mmol/L','正常'],
        ['VSN20260115001','BlOOD_CHOMET','血液化学检验（糖代谢）','BlOOD_CHOMET.05-DL','葡萄糖','实验类','5.6','3.9-6.1 mmol/L','正常'],
        ['VSN20260115001','BlOOD_CHOMET','血液化学检验（糖代谢）','BlOOD_CHOMET.07-DL','糖化血红蛋白','实验类','5.4','4.0-6.0%','正常'],

        // VSN20260120002 张三 体征复查
        ['VSN20260120002','BlOOD_REXA','血常规检查','BlOOD_REXA.01-DL','白细胞计数','实验类','6.8','4.0-10.0 x10^9/L','正常'],
        ['VSN20260120002','BlOOD_REXA','血常规检查','BlOOD_REXA.02-DL','红细胞','实验类','4.9','4.3-5.8 x10^12/L','正常'],
        ['VSN20260120002','BlOOD_REXA','血常规检查','BlOOD_REXA.11-DL','血红蛋白','实验类','148','130-175 g/L','正常'],
        ['VSN20260120002','BlOOD_REXA','血常规检查','BlOOD_REXA.12-DL','血小板计数','实验类','210','125-350 x10^9/L','正常'],
        ['VSN20260120002','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.06-DL','丙氨基酸转移酶','实验类','28','9-50 U/L','正常'],
        ['VSN20260120002','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.11-DL','总胆红素','实验类','14','3.4-17.1 umol/L','正常'],
        ['VSN20260120002','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.01-DL','血肌酐','实验类','92','62-115 umol/L','正常'],
        ['VSN20260120002','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.02-DL','尿酸','实验类','380','208-428 umol/L','正常'],

        // VSN20260201003 李丽
        ['VSN20260201003','ANEM_TEST','贫血指标','ANEM_TEST.01-DL','转铁蛋白','实验类','2.8','2.0-3.6 g/L','正常'],
        ['VSN20260201003','ANEM_TEST','贫血指标','ANEM_TEST.02-DL','叶酸','实验类','12','>4.0 ng/mL','正常'],
        ['VSN20260201003','INFECT_HEP','感染免疫学检测（病毒性肝炎）','INFECT_HEP.05-DL','乙肝表面抗原','实验类','0.02','<0.05 IU/mL','正常'],
        ['VSN20260201003','INFECT_HEP','感染免疫学检测（病毒性肝炎）','INFECT_HEP.04-DL','乙肝表面抗体','实验类','125','>10 mIU/mL','正常'],
        ['VSN20260201003','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.06-DL','丙氨基酸转移酶','实验类','22','9-50 U/L','正常'],
        ['VSN20260201003','BlOOD_CHOMET','血液化学检验（糖代谢）','BlOOD_CHOMET.05-DL','葡萄糖','实验类','5.1','3.9-6.1 mmol/L','正常'],

        // VSN20260210004 王伟
        ['VSN20260210004','BlOOD_REXA','血常规检查','BlOOD_REXA.01-DL','白细胞计数','实验类','5.2','4.0-10.0 x10^9/L','正常'],
        ['VSN20260210004','BlOOD_REXA','血常规检查','BlOOD_REXA.11-DL','血红蛋白','实验类','156','130-175 g/L','正常'],
        ['VSN20260210004','BlOOD_REXA','血常规检查','BlOOD_REXA.12-DL','血小板计数','实验类','185','125-350 x10^9/L','正常'],
        ['VSN20260210004','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.06-DL','丙氨基酸转移酶','实验类','68','9-50 U/L','偏高'],
        ['VSN20260210004','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.07-DL','天门冬氨酸氨基转移酶','实验类','55','15-40 U/L','偏高'],
        ['VSN20260210004','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.11-DL','总胆红素','实验类','20','3.4-17.1 umol/L','偏高'],
        ['VSN20260210004','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.12-DL','直接胆红素','实验类','7.5','0-6.8 umol/L','偏高'],
        ['VSN20260210004','BlOOD_LFT','血液化学检验（肝功能）','BlOOD_LFT.13-DL','乳酸脱氢酶','实验类','210','120-250 U/L','正常'],
        ['VSN20260210004','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.01-DL','血肌酐','实验类','105','62-115 umol/L','正常'],
        ['VSN20260210004','BlOOD_RFT','血液化学检验（肾功能）','BlOOD_RFT.02-DL','尿酸','实验类','455','208-428 umol/L','偏高'],
        ['VSN20260210004','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.05-DL','总胆固醇','实验类','5.8','<5.2 mmol/L','偏高'],
        ['VSN20260210004','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.06-DL','甘油三酯','实验类','2.4','<1.7 mmol/L','偏高'],
        ['VSN20260210004','BlOOD_LIPID','血液化学检验（血脂）','BlOOD_LIPID.08-DL','低密度脂蛋白胆固醇','实验类','3.9','<3.4 mmol/L','偏高'],
        ['VSN20260210004','BlOOD_CHOMET','血液化学检验（糖代谢）','BlOOD_CHOMET.05-DL','葡萄糖','实验类','6.8','3.9-6.1 mmol/L','偏高'],
        ['VSN20260210004','BlOOD_CHOMET','血液化学检验（糖代谢）','BlOOD_CHOMET.07-DL','糖化血红蛋白','实验类','6.5','4.0-6.0%','偏高'],
    ];

    const stmt = db.prepare('INSERT INTO exam_details (id, visit_serial_no, exam_item_code, exam_item_name, indicator_code, indicator_name, exam_item_attr, exam_value, reference_value, qualitative_result, status) VALUES (?,?,?,?,?,?,?,?,?,?,1)');

    records.forEach(r => {
        const id = 'VD' + String(next).padStart(3, '0');
        stmt.run([id, ...r]);
        next++;
    });
    stmt.free();

    fs.writeFileSync(dbPath, db.export());

    const stats = db.exec('SELECT v.visit_serial_no, v.patient_code, COUNT(ed.id) as cnt FROM visits v LEFT JOIN exam_details ed ON v.visit_serial_no=ed.visit_serial_no GROUP BY v.visit_serial_no ORDER BY v.visit_serial_no');
    console.log('就诊-明细统计:');
    stats[0].values.forEach(r => console.log('  ' + r[0] + ' | ' + r[1] + ' | ' + r[2] + ' 条'));

    const total = db.exec('SELECT COUNT(*) FROM exam_details')[0].values[0][0];
    console.log('总计: ' + total + ' 条检查明细');
    db.close();
})();
