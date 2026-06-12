/**
 * 手到擒来 · 产品演示页 — 动态渲染逻辑
 * 通过 URL hash 确定当前展示的产品，如 demo/#health-index-wjw
 */

(function () {
    'use strict';

    var demoRoot = document.getElementById('demoRoot');
    if (!demoRoot) return;

    /**
     * HTML 转义
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
     * 根据 hash 查找产品
     */
    function getProductFromHash() {
        var hash = window.location.hash.replace('#/', '').replace('#', '');
        if (!hash) return null;

        for (var i = 0; i < productsData.length; i++) {
            if (productsData[i].slug === hash) {
                return productsData[i];
            }
        }
        return null;
    }

    /**
     * 构建使用人群标签
     */
    function buildAudienceTags(targetUsers) {
        var audienceList = targetUsers.split(',').map(function (s) { return s.trim(); });
        var html = '';
        audienceList.forEach(function (audience) {
            html += '<span class="tag"><i class="fas fa-user"></i> ' + escapeHtml(audience) + '</span>';
        });
        return html;
    }

    /**
     * 渲染产品演示页
     */
    function renderDemoPage() {
        var product = getProductFromHash();

        if (!product) {
            demoRoot.innerHTML =
                '<div class="demo-stage" style="margin-top:4rem;">' +
                    '<div class="stage-placeholder">' +
                        '<i class="fas fa-exclamation-triangle"></i>' +
                        '<h3>未找到对应产品</h3>' +
                        '<p>请从产品中心选择一款产品查看演示</p>' +
                        '<a class="btn-launch" href="../index.html">' +
                            '<i class="fas fa-arrow-left"></i> 返回产品中心' +
                        '</a>' +
                    '</div>' +
                '</div>';
            return;
        }

        // 更新页面标题
        document.title = product.name + ' — 产品演示 · 手到擒来';

        var platformClass = product.platform === '移动端' ? 'platform-mobile' : 'platform-web';
        var platformIcon = product.platform === '移动端' ? 'fa-mobile-alt' : 'fa-desktop';
        var tagsHtml = buildAudienceTags(product.targetUsers);

        // 演示区域：有外部链接的提供启动按钮，否则显示占位
        var stageHTML;
        if (product.demoLink) {
            stageHTML =
                '<div class="demo-stage">' +
                    '<div class="stage-placeholder">' +
                        '<i class="fas fa-play-circle"></i>' +
                        '<h3>' + escapeHtml(product.name) + ' — 在线演示</h3>' +
                        '<p>点击下方按钮，将在新标签页中打开完整产品演示环境</p>' +
                        '<a class="btn-launch" href="' + product.demoLink + '" target="_blank" rel="noopener">' +
                            '<i class="fas fa-external-link-alt"></i> 启动演示环境' +
                        '</a>' +
                    '</div>' +
                '</div>';
        } else {
            stageHTML =
                '<div class="demo-stage">' +
                    '<div class="stage-placeholder">' +
                        '<i class="fas fa-tools"></i>' +
                        '<h3>演示环境搭建中</h3>' +
                        '<p>' + escapeHtml(product.name) + ' 的在线演示环境正在筹备，敬请期待。</p>' +
                        '<p style="font-size:0.8rem;color:#8BA5C0;">如需完整产品资料、演示或报价，请联系销售代表。</p>' +
                    '</div>' +
                '</div>';
        }

        demoRoot.innerHTML =
            '<!-- 返回按钮 -->' +
            '<a class="demo-back" href="../index.html">' +
                '<i class="fas fa-arrow-left"></i> 返回产品中心' +
            '</a>' +

            '<!-- 产品信息区 -->' +
            '<div class="demo-hero">' +
                '<div class="demo-hero-icon" style="color:' + product.iconColor + '">' +
                    '<i class="' + product.iconClass + '"></i>' +
                '</div>' +
                '<div class="demo-hero-info">' +
                    '<h1>' + escapeHtml(product.name) + '</h1>' +
                    '<div class="demo-desc">' + escapeHtml(product.description) + '</div>' +
                    '<div class="demo-meta">' +
                        '<span class="platform-tag ' + platformClass + '">' +
                            '<i class="fas ' + platformIcon + '"></i> ' + (product.platform || 'Web端') +
                        '</span>' +
                        '<span class="audience-label" style="margin:0;display:inline-flex;">' +
                            '<i class="fas fa-users-viewfinder"></i> 适用人群' +
                        '</span>' +
                    '</div>' +
                    '<div class="audience-tags" style="margin-top:0.5rem;">' + tagsHtml + '</div>' +
                '</div>' +
            '</div>' +

            '<!-- 演示操作区 -->' +
            stageHTML;
    }

    // 初始渲染
    renderDemoPage();

    // 监听 hash 变化（支持浏览器前进/后退）
    window.addEventListener('hashchange', renderDemoPage);
})();
