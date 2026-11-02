/**
 * 手到擒来 · 医疗软件产品中心 — 产品数据
 * 全院级医疗软件产品库，唯一产品展示入口
 *
 * 数据模型说明：
 * - homeOrder: 首页（原"全部产品"）展示顺序，无该字段的模块不在首页展示
 * - hideInHome: true 时不在首页展示，但在各分类标签页仍可见
 * - platforms: 卡片上展示的平台标签（可多端）
 * - entries:   多入口模块（如医生端/患者端），每项含 label 与 link；
 *              无 entries 时使用 demoLink 作为唯一演示入口
 * - category / scenario: 分类标签页归属（category 为主分类，scenario 为附加分类）
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
    // ========== 首页模块（按 homeOrder 1-7 排列，1-4 为流程第一排，5-7 为第二排） ==========

    // 1. 知识库管理平台（新增）
    {
        id: 9,
        name: "知识库管理平台",
        slug: "knowledge-base-platform",
        description: "将检验、检测报告等数据源统一标准项目映射，生成各类拟诊和主检标签，最终匹配风险扣分和建议知识库。",
        targetUsers: "公司内部",
        iconClass: "fas fa-book-medical",
        iconColor: "#1661AB",
        platform: "Web端",
        platforms: ["Web端"],
        demoLink: "http://newmedkb.mai47.com:15179/#home",
        homeOrder: 1
    },
    // 2. 检前个性化方案推荐（新增）
    {
        id: 10,
        name: "检前个性化方案推荐",
        slug: "pre-exam-recommendation",
        description: "基于用户健康档案或历史体检报告数据，推荐合适的体检套餐或专病筛查等项目，满足个性化需求。",
        targetUsers: "体检用户",
        iconClass: "fas fa-list-check",
        iconColor: "#E67E22",
        platform: "移动端",
        platforms: ["移动端"],
        demoLink: "http://testhyhl.mai47.com:11042/hy/home?appid=HY1&action=001&code=N2cKc%2BAPgU3okIeyLd%2Fk6LtCRQKmq8mk56eLtIl3hvJJLExBFwhvXqoz9ejIwlVyREiaCgnnFISAz33stxVO7Z3qGx90fiyimekDjwu17RRe3WgJSk0rk%2BSHhMpE7%2FYx3L3%2BdnSL2GUfAqBA6lLKuzRW4v327eKTn%2BVZW3yXKl9Xejc4l7otwzTCSQqhzJMdu7uT3AvRCdkXGCvAGyNJmi6ot1dKQ5rWLdW8%2FpOqxSAV%2BxxsljueB7j5xudHwU3OaAhL7cP53szHazY07ioKDQ%3D%3D",
        homeOrder: 2
    },
    // 3. 天钥智能主检
    {
        id: 1,
        name: "天钥智能主检",
        slug: "tianyao-zhujian",
        description: "基于动态医学知识库与临床推理引擎，智能生成个性化主检结论与分项建议，结果可追溯、可解释，显著降低漏诊风险。",
        targetUsers: "主检医生",
        iconClass: "fas fa-file-medical-alt",
        iconColor: "#00897B",
        category: 1,
        scenario: [1],
        platform: "Web端",
        platforms: ["Web端"],
        demoLink: "https://test.mai47.com/static/rdzntj/#/home/index",
        homeOrder: 3
    },
    // 4. 体检后患者管理（合并：智慧体检系统-患者端 + 检后管理系统）
    {
        id: 11,
        name: "体检后患者管理",
        slug: "post-exam-patient-management",
        description: "面向体检后人群的健康管理平台，支持基于健康指数的体检报告解读、就诊或复检提醒，实现检后闭环管理与主动干预。",
        targetUsers: "健康管理医生, 患者",
        iconClass: "fas fa-clipboard-list",
        iconColor: "#27AE60",
        category: 3,
        scenario: [3, 1],
        platform: "Web端",
        platforms: ["Web端", "移动端"],
        demoLink: "https://testjh.mai47.com:10007/login#/login",
        entries: [
            { label: "医生端", link: "https://testjh.mai47.com:10007/login#/login" },
            { label: "患者端", link: "https://testjh.mai47.com:10006/login" }
        ],
        homeOrder: 4
    },
    // 5. 检易通-AI检验医师（合并：检易通检验报告解读-医生端 + 患者端）
    {
        id: 12,
        name: "检易通-AI检验医师",
        slug: "lab-report-ai-physician",
        description: "基于知识图谱深度治理和综合解读各项检验指标；为患者提供通俗化解读和引导就诊建议，同时为临床/检验医师生成辅助解读",
        targetUsers: "临床/检验医师, 患者",
        iconClass: "fas fa-clipboard-check",
        iconColor: "#7B5EA7",
        category: 4,
        scenario: [4],
        platform: "Web端",
        platforms: ["Web端", "移动端"],
        demoLink: "http://xsnl.mai47.com:3003/login?redirect=%2Freports",
        entries: [
            { label: "医生端", link: "http://xsnl.mai47.com:3003/login?redirect=%2Freports" },
            { label: "患者端", link: "https://testxsnl.mai47.com:33001/login.html" }
        ],
        homeOrder: 5
    },
    // 6. 社区版健康指数（合并：健康指数-社区版本 + 健康指数-社区版本（患者端））
    {
        id: 13,
        name: "社区版健康指数",
        slug: "health-index-community",
        description: "面向社区居民的一站式健康管理平台，支持健康指数评分、指标趋势分析、异常预警与个性化健康指导，帮助居民建立连续性健康档案，实现居家自管并与社区医生高效联动。",
        targetUsers: "社区/健康管理医生, 患者",
        iconClass: "fas fa-heart-pulse",
        iconColor: "#3498DB",
        category: 3,
        scenario: [3, 2],
        platform: "Web端",
        platforms: ["Web端", "移动端"],
        demoLink: "http://testjh.mai47.com:5173/residents",
        entries: [
            { label: "医生端", link: "http://testjh.mai47.com:5173/residents" },
            { label: "患者端", link: "http://testjh.mai47.com:5174/" }
        ],
        homeOrder: 6
    },
    // 7. 慢病患者管理+服务包（新增）
    {
        id: 14,
        name: "慢病患者管理+服务包",
        slug: "chronic-disease-management",
        description: "面向慢病患者的全周期健康管理平台，支持慢病档案管理、监测数据追踪、干预效果评估与服务包套餐管理，助力高效开展随访与个性化健康指导。",
        targetUsers: "健康管理医师, 患者",
        iconClass: "fas fa-notes-medical",
        iconColor: "#E74C3C",
        platform: "Web端",
        platforms: ["Web端", "移动端"],
        demoLink: "https://150.158.151.245:8443/",
        entries: [
            { label: "医生端", link: "https://150.158.151.245:8443/" },
            { label: "患者端", link: "https://testjh.mai47.com:10006/login" }
        ],
        homeOrder: 7
    },

    // ========== 不在首页展示的模块（分类标签页仍可见） ==========

    // 8. 健康指数-卫健委版本
    {
        id: 6,
        name: "健康指数-卫健委版本",
        slug: "health-index-wjw",
        description: "面向卫健委及医疗机构部署的患者健康管理平台，提供健康指数动态追踪、指标趋势分析、异常预警及个性化建议，助力医疗机构有效留存患者，实现诊后持续关怀与复诊引导，推动区域健康管理数字化转型。",
        targetUsers: "患者",
        iconClass: "fas fa-file-alt",
        iconColor: "#1661AB",
        category: 3,
        scenario: [3, 2],
        platform: "移动端",
        platforms: ["移动端"],
        demoLink: "http://health-index-wjw-showcase.effortlessai.cn/",
        hideInHome: true
    }
];
