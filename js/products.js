/**
 * 手到擒来 · 医疗软件产品中心 — 产品数据
 * 全院级医疗软件产品库，唯一产品展示入口
 */

/**
 * 产品分类编码映射表（唯一维护入口）
 * 新增分类只需在此追加，前端自动同步
 */
const categoryCode = {
    1: "智慧体检产品",
    2: "健康指数产品",
    3: "健康管理产品",
    4: "检验报告分析"
};

/**
 * scenario 标签编码 → 对应分类编码
 * 用于筛选时 scenario 到 category 的归属匹配
 */
const scenarioCategoryMap = {
    1: 1,   // 智慧主检 → 智慧体检产品
    2: 3    // 健康管理 → 健康管理产品
};

const productsData = [
    // 1. 天钥智能主检
    {
        id: 1,
        name: "天钥智能主检",
        slug: "tianyao-zhujian",
        description: "基于动态医学知识库与临床推理引擎，智能生成个性化主检结论与分项建议，精准辅助主检医生高效出具报告，非大模型黑箱，结果可追溯可解释，显著降低漏诊风险。",
        targetUsers: "主检医生",
        iconClass: "fas fa-file-medical-alt",
        iconColor: "#00897B",
        category: 1,
        demoLink: "https://test.mai47.com/static/rdzntj/#/home/index",
        platform: "Web端",
        scenario: [1]
    },
    // 2. 健康指数（内容后补）
    {
        id: 2,
        name: "健康指数-社区版本",
        slug: "health-index",
        description: "面向社区居民的一站式健康管理平台，支持健康数据追踪、指标趋势分析、异常预警及个性化健康指导，帮助用户建立连续性健康档案，实现居家自管与社区医疗资源联动。",
        targetUsers: "社区医生, 健康管理医生",
        iconClass: "fas fa-heart-pulse",
        iconColor: "#3498DB",
        category: 3,
        demoLink: "http://192.168.13.175:15173",
        platform: "Web端",
        scenario: [3, 2]
    },
    // 3. 社区版健康指数报告
    {
        id: 3,
        name: "健康指数-社区版本（患者端）",
        slug: "health-index-report",
        description: "面向患者的社区健康指数报告查看平台，支持查看个人健康指数评分、指标趋势分析、异常预警及个性化健康建议，帮助患者直观了解自身健康状况，实现与社区医生的高效联动。",
        targetUsers: "患者",
        iconClass: "fas fa-notes-medical",
        iconColor: "#2ECC71",
        category: 3,
        demoLink: "http://192.168.13.175:15174",
        platform: "移动端",
        scenario: [3, 2]
    },
    // 4. 智慧体检系统-患者端
    {
        id: 4,
        name: "智慧体检系统-患者端",
        slug: "smart-exam-mobile",
        description: "面向体检患者的移动端健康平台，支持体检报告查阅、历年数据对比、健康档案云端管理，每次体检自动生成健康评分与改善建议，助力患者实现连续性自我健康追踪与主动干预。",
        targetUsers: "患者",
        iconClass: "fas fa-heartbeat",
        iconColor: "#E74C3C",
        category: 1,
        demoLink: "http://testhyhl.mai47.com:11042/hy/home",
        platform: "移动端",
        scenario: [1, 3]
    },
    // 5. 检后管理系统
    {
        id: 5,
        name: "检后管理系统",
        slug: "post-exam-management",
        description: "体检患者检后全周期管理工具，集成检验报告智能解读、转诊建议、复检提醒与随访管理，支持追踪关键健康问题的疾病演进路线与干预效果评估，实现检后闭环管理与预后持续改善。",
        targetUsers: "患者",
        iconClass: "fas fa-clipboard-list",
        iconColor: "#27AE60",
        category: 3,
        demoLink: "https://test.mai47.com/static/jhgl/#/pages/login/index",
        platform: "移动端",
        scenario: [3, 1]
    },
    // 6. 健康指数-卫健委版本
    {
        id: 6,
        name: "健康指数-卫健委版本",
        slug: "health-index-wjw",
        description: "面向卫健委及医疗机构部署的患者健康管理平台，提供健康指数动态追踪、指标趋势分析、异常预警及个性化建议，助力医疗机构有效留存患者，实现诊后持续关怀与复诊引导，推动区域健康管理数字化转型。",
        targetUsers: "患者",
        iconClass: "fas fa-file-alt",
        iconColor: "#1661AB",
        category: 3,
        demoLink: "http://health-index-wjw-showcase.effortlessai.cn/",
        platform: "移动端",
        scenario: [3, 2]
    },
    // 7. 信手拈来检验报告解读-医生端
    {
        id: 7,
        name: "信手拈来检验报告分析-医生端",
        slug: "lab-report-ai",
        description: "支持上传纸质检验报告并OCR智能识别，基于医学知识图谱AI深度解读各项指标，面向临床与检验科医生生成结构化解读报告与循证建议，辅助快速识别异常与精准诊疗决策。",
        targetUsers: "临床医生, 检验科",
        iconClass: "fas fa-clipboard-check",
        iconColor: "#7B5EA7",
        category: 4,
        demoLink: "http://xsnl.mai47.com:8801/login",
        platform: "Web端",
        scenario: [4]
    },
    // 8. 信手拈来检验报告解读-患者端
    {
        id: 8,
        name: "信手拈来检验报告分析-患者端",
        slug: "lab-report-patient",
        description: "患者端移动应用，拍照上传检验报告即可获取AI智能解读，用通俗语言帮助患者理解指标含义与健康风险，支持历史报告对比与趋势追踪，提供针对性饮食运动建议，让检验报告不再难懂。",
        targetUsers: "患者",
        iconClass: "fas fa-file-medical-alt",
        iconColor: "#2980B9",
        category: 4,
        demoLink: "http://xsnl.mai47.com:8082/login.html",
        platform: "移动端",
        scenario: [4]
    },
];
