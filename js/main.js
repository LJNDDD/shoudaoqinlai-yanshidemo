/**
 * 手到擒来 · 医疗软件产品中心 — 主逻辑
 * 产品卡片渲染、交互事件绑定
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
        if (a.includes('医生')) return 'fa-user-md';
        if (a.includes('护士')) return 'fa-user-nurse';
        if (a.includes('技师') || a.includes('技术员')) return 'fa-microscope';
        if (a.includes('患者')) return 'fa-user-injured';
        if (a.includes('管理员') || a.includes('管理者')) return 'fa-chalkboard-user';
        if (a.includes('药师')) return 'fa-prescription-bottle';
        if (a.includes('财务')) return 'fa-chart-line';
        if (a.includes('家属')) return 'fa-heartbeat';
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
     * 构建单张产品卡片 HTML
     */
    function buildCardHTML(product) {
        var platformClass = product.platform === '移动端' ? 'platform-mobile' : 'platform-web';
        var platformIcon = product.platform === '移动端' ? 'fa-mobile-alt' : 'fa-desktop';
        var tagsHtml = buildAudienceTags(product.targetUsers);
        // 按钮：有链接则 data-link 存链接，无链接则为空
        var linkAttr = product.demoLink ? ' data-link="' + escapeHtml(product.demoLink) + '"' : '';

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
                    '<div class="platform-tag ' + platformClass + '">' +
                        '<i class="fas ' + platformIcon + '"></i> ' + (product.platform || 'Web端') +
                    '</div>' +
                    '<div class="audience-section">' +
                        '<div class="audience-label">' +
                            '<i class="fas fa-users-viewfinder"></i> 适用人群' +
                        '</div>' +
                        '<div class="audience-tags">' + tagsHtml + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="card-footer">' +
                    '<button class="btn-detail detail-btn"' + linkAttr + ' data-pname="' + escapeHtml(product.name) + '">' +
                        '<span>点击演示</span> <i class="fas fa-arrow-right"></i>' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
    }

    /**
     * 当前筛选分类
     */
    var currentCategory = 'all';

    /**
     * 渲染全部产品卡片（支持分类筛选）
     */
    function renderProducts() {
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

        // 绑定所有「点击演示」按钮的点击事件
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
