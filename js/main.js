/**
 * 手到擒来 · 医疗软件产品中心 — 主逻辑
 * 产品卡片渲染、交互事件绑定
 *
 * 布局说明：
 * - 首页（data-category="all"）：按 homeOrder 渲染为两排——
 *   第一排 4 个流程模块（背后带淡色流程箭头），第二排 3 个模块；
 * - 分类标签页：保持标准四列网格，按 category / scenario 筛选。
 */

(function () {
    'use strict';

    const container = document.getElementById('productsContainer');
    if (!container) return;

    /**
     * HTML 转义（防 XSS）
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 根据使用人群类型返回对应图标
     */
    function getAudienceIcon(audience) {
        const a = audience.trim();
        if (a.includes('医生') || a.includes('医师')) return 'fa-user-md';
        if (a.includes('护士')) return 'fa-user-nurse';
        if (a.includes('技师') || a.includes('技术员')) return 'fa-microscope';
        if (a.includes('患者')) return 'fa-user-injured';
        if (a.includes('管理员') || a.includes('管理者')) return 'fa-chalkboard-user';
        if (a.includes('药师')) return 'fa-prescription-bottle';
        if (a.includes('财务')) return 'fa-chart-line';
        if (a.includes('家属')) return 'fa-heartbeat';
        if (a.includes('公司') || a.includes('内部')) return 'fa-building';
        return 'fa-users';
    }

    /**
     * 生成使用人群标签 HTML
     */
    function buildAudienceTags(targetUsers) {
        const audienceList = targetUsers.split(',').map(function (s) { return s.trim(); });
        var html = '';
        audienceList.slice(0, 3).forEach(function (audience) {
            var icon = getAudienceIcon(audience);
            html += '<span class="tag"><i class="fas ' + icon + '"></i> ' + escapeHtml(audience) + '</span>';
        });
        return html;
    }

    /**
     * 生成平台标签 HTML（支持多端）
     */
    function buildPlatformTags(product) {
        var platforms = product.platforms && product.platforms.length
            ? product.platforms
            : [product.platform || 'Web端'];
        var html = '<div class="platform-tags">';
        platforms.forEach(function (p) {
            var platformClass = p === '移动端' ? 'platform-mobile' : 'platform-web';
            var platformIcon = p === '移动端' ? 'fa-mobile-alt' : 'fa-desktop';
            html += '<span class="platform-tag ' + platformClass + '">' +
                '<i class="fas ' + platformIcon + '"></i> ' + escapeHtml(p) +
                '</span>';
        });
        return html + '</div>';
    }

    /**
     * 生成卡片底部按钮 HTML
     * - 多入口模块（entries）：每个入口一个按钮（如医生端 / 患者端）
     * - 单入口模块：一个「点击演示」按钮
     */
    function buildFooterButtons(product) {
        var entries = (product.entries && product.entries.length) ? product.entries : null;
        if (entries) {
            var multiHtml = '<div class="entry-actions">';
            entries.forEach(function (entry) {
                var linkAttr = entry.link ? ' data-link="' + escapeHtml(entry.link) + '"' : '';
                multiHtml += '<button class="btn-detail detail-btn entry-btn"' + linkAttr +
                    ' data-pname="' + escapeHtml(product.name + ' · ' + entry.label) + '">' +
                    '<span>' + escapeHtml(entry.label) + '</span> <i class="fas fa-arrow-right"></i>' +
                    '</button>';
            });
            return multiHtml + '</div>';
        }
        var linkAttr2 = product.demoLink ? ' data-link="' + escapeHtml(product.demoLink) + '"' : '';
        return '<button class="btn-detail detail-btn"' + linkAttr2 +
            ' data-pname="' + escapeHtml(product.name) + '">' +
            '<span>点击演示</span> <i class="fas fa-arrow-right"></i>' +
            '</button>';
    }

    /**
     * 构建单张产品卡片 HTML
     */
    function buildCardHTML(product) {
        var tagsHtml = buildAudienceTags(product.targetUsers);

        return (
            '<div class="product-card" data-id="' + product.id + '">' +
                '<div class="card-header">' +
                    '<div class="card-icon" style="color:' + product.iconColor + '">' +
                        '<i class="' + product.iconClass + '"></i>' +
                    '</div>' +
                    '<div class="product-name">' + escapeHtml(product.name) + '</div>' +
                '</div>' +
                '<div class="card-body">' +
                    '<div class="description">' + escapeHtml(product.description) + '</div>' +
                    buildPlatformTags(product) +
                    '<div class="audience-section">' +
                        '<div class="audience-label">' +
                            '<i class="fas fa-users-viewfinder"></i> 适用人群' +
                        '</div>' +
                        '<div class="audience-tags">' + tagsHtml + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="card-footer">' +
                    buildFooterButtons(product) +
                '</div>' +
            '</div>'
        );
    }

    /**
     * 首页第一排背后的流程箭头（左 → 右，淡色）
     * 细长主线 + 右端箭头 + 卡片间隙处的连接 chevron，
     * 仅在四列一排的宽屏下展示（见 style.css 响应式规则）
     */
    function buildFlowArrow() {
        return (
            '<svg class="flow-arrow" viewBox="0 0 1240 320" preserveAspectRatio="none" aria-hidden="true">' +
                '<line x1="16" y1="160" x2="1206" y2="160" stroke="#1661AB" stroke-opacity="0.10" stroke-width="8" stroke-linecap="round"/>' +
                '<polygon points="1210,138 1240,160 1210,182" fill="#1661AB" fill-opacity="0.13"/>' +
                '<path d="M289 144 L307 160 L289 176" fill="none" stroke="#1661AB" stroke-opacity="0.16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M590 144 L608 160 L590 176" fill="none" stroke="#1661AB" stroke-opacity="0.16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
                '<path d="M891 144 L909 160 L891 176" fill="none" stroke="#1661AB" stroke-opacity="0.16" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>'
        );
    }

    /**
     * 当前筛选分类
     */
    var currentCategory = 'all';

    /**
     * 绑定所有「点击演示 / 入口」按钮的点击事件
     */
    function bindDetailButtons() {
        var btns = container.querySelectorAll('.detail-btn');
        for (var j = 0; j < btns.length; j++) {
            btns[j].addEventListener('click', function (e) {
                e.stopPropagation();
                var pname = this.getAttribute('data-pname') || '此产品';
                var link = this.getAttribute('data-link') || '';
                if (link) {
                    window.open(link, '_blank');
                } else {
                    alert('✨ 【' + pname + '】\n手到擒来科技致力于提供先进的医疗信息化解决方案。\n如需完整产品资料、演示或报价，请联系销售代表。\n（演示交互 — 产品统一入口展示）');
                }
            });
        }
    }

    /**
     * 渲染首页：第一排 4 个流程模块（带流程箭头），第二排 3 个模块
     */
    function renderHomePage() {
        container.className = 'products-grid home-layout';

        var homeProducts = productsData
            .filter(function (p) { return !p.hideInHome; })
            .sort(function (a, b) { return (a.homeOrder || 99) - (b.homeOrder || 99); });

        var row1 = homeProducts.slice(0, 4);
        var row2 = homeProducts.slice(4);

        var html = '<div class="flow-row">' + buildFlowArrow();
        row1.forEach(function (p) { html += buildCardHTML(p); });
        html += '</div>';

        if (row2.length) {
            html += '<div class="home-row">';
            row2.forEach(function (p) { html += buildCardHTML(p); });
            html += '</div>';
        }

        container.innerHTML = html;
        bindDetailButtons();
    }

    /**
     * 渲染分类标签页：标准产品卡片网格（支持分类筛选）
     */
    function renderCategoryPage() {
        container.className = 'products-grid';

        var filtered = productsData.filter(function (p) {
            if (p.hidden) return false;
            if (currentCategory !== 'all') {
                var catCode = parseInt(currentCategory, 10);
                if (p.category !== catCode && (p.scenario || []).indexOf(catCode) === -1) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML =
                '<div class="empty-state" style="grid-column:1/-1;">' +
                    '<i class="fas fa-search-minus"></i>' +
                    '<h3 style="margin: 0.5rem 0; font-weight:500;">未找到相关产品</h3>' +
                    '<p style="font-size:0.85rem;">试试其他关键词，或清除筛选条件</p>' +
                '</div>';
            return;
        }

        var cardsHTML = '';
        for (var i = 0; i < filtered.length; i++) {
            cardsHTML += buildCardHTML(filtered[i]);
        }
        container.innerHTML = cardsHTML;

        bindDetailButtons();
    }

    /**
     * 统一渲染入口：all → 首页；其余 → 分类标签页
     */
    function renderProducts() {
        if (currentCategory === 'all') {
            renderHomePage();
        } else {
            renderCategoryPage();
        }
    }

    // 初始渲染
    renderProducts();

    // 分类筛选按钮事件 + 滑动指示器
    var filterBtns = document.querySelectorAll('.filter-btn');
    var indicator = document.querySelector('.filter-indicator');

    function moveIndicator(btn) {
        if (!indicator) return;
        var seg = btn.parentElement;
        var segRect = seg.getBoundingClientRect();
        var btnRect = btn.getBoundingClientRect();
        indicator.style.left = (btnRect.left - segRect.left) + 'px';
        indicator.style.width = btnRect.width + 'px';
    }

    for (var k = 0; k < filterBtns.length; k++) {
        filterBtns[k].addEventListener('click', function () {
            for (var m = 0; m < filterBtns.length; m++) {
                filterBtns[m].classList.remove('active');
            }
            this.classList.add('active');
            moveIndicator(this);
            currentCategory = this.getAttribute('data-category');
            renderProducts();
        });
    }

    // 初始定位指示器
    var initActiveBtn = document.querySelector('.filter-btn.active');
    if (initActiveBtn && indicator) {
        setTimeout(function () { moveIndicator(initActiveBtn); }, 50);
    }

    // 窗口尺寸变化时修正指示器位置
    window.addEventListener('resize', function () {
        var activeBtn = document.querySelector('.filter-btn.active');
        if (activeBtn) moveIndicator(activeBtn);
    });

    // 控制台友好提示
    console.log('手到擒来产品中心已启动 | 唯一产品展示入口 | 共 ' + productsData.length + ' 款产品');
})();
