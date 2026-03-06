/**
 * 轻量级Markdown解析器
 * 支持常见的markdown语法
 */
class MarkdownParser {
    constructor() {
        this.rules = [
            // 标题 (### ## #)
            { pattern: /^### (.+)$/gm, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.+)$/gm, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.+)$/gm, replacement: '<h1>$1</h1>' },
            
            // 粗体和斜体
            { pattern: /\*\*\*(.+?)\*\*\*/g, replacement: '<strong><em>$1</em></strong>' },
            { pattern: /\*\*(.+?)\*\*/g, replacement: '<strong>$1</strong>' },
            { pattern: /\*(.+?)\*/g, replacement: '<em>$1</em>' },
            
            // 代码块
            { pattern: /```([\s\S]*?)```/g, replacement: '<pre><code>$1</code></pre>' },
            { pattern: /`(.+?)`/g, replacement: '<code>$1</code>' },
            
            // 链接
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank">$1</a>' },
            
            // 图片
            { pattern: /!\[([^\]]*)\]\(([^)]+)\)/g, replacement: '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">' },
            
            // 删除线
            { pattern: /~~(.+?)~~/g, replacement: '<del>$1</del>' },
            
            // 水平线
            { pattern: /^---$/gm, replacement: '<hr>' },
            { pattern: /^\*\*\*$/gm, replacement: '<hr>' },
        ];
    }

    /**
     * 解析markdown文本为HTML
     * @param {string} markdown - markdown文本
     * @returns {string} HTML字符串
     */
    parse(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '';
        }

        let html = markdown;

        // 应用所有规则
        this.rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replacement);
        });

        // 处理列表
        html = this.parseList(html);
        
        // 处理段落
        html = this.parseParagraphs(html);
        
        // 处理换行
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    /**
     * 解析列表
     * @param {string} text - 文本
     * @returns {string} 处理后的HTML
     */
    parseList(text) {
        // 无序列表
        text = text.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/^[\s]*•\s+(.+)$/gm, '<li>$1</li>');
        
        // 有序列表
        text = text.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li>$1</li>');
        
        // 包装连续的列表项
        text = text.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs, (match) => {
            // 检查是否是有序列表（包含数字）
            const isOrdered = /^\d+\./.test(match.replace(/<\/?li>/g, ''));
            const tag = isOrdered ? 'ol' : 'ul';
            return `<${tag}>${match}</${tag}>`;
        });

        return text;
    }

    /**
     * 解析段落
     * @param {string} text - 文本
     * @returns {string} 处理后的HTML
     */
    parseParagraphs(text) {
        // 分割成段落（双换行分隔）
        const paragraphs = text.split(/\n\s*\n/);
        
        return paragraphs.map(paragraph => {
            paragraph = paragraph.trim();
            
            // 跳过已经是HTML标签的内容
            if (paragraph.match(/^<(h[1-6]|ul|ol|pre|hr|blockquote)/)) {
                return paragraph;
            }
            
            // 跳过空段落
            if (!paragraph) {
                return '';
            }
            
            // 包装为段落
            return `<p>${paragraph}</p>`;
        }).join('\n');
    }

    /**
     * 转义HTML特殊字符
     * @param {string} text - 文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 解析带高亮的文本
     * @param {string} text - 文本
     * @returns {string} 处理后的HTML
     */
    parseWithHighlight(text) {
        // 先解析markdown
        let html = this.parse(text);
        
        // 添加高亮样式
        html = html.replace(/==(.+?)==/g, '<span class="highlight">$1</span>');
        
        return html;
    }
}

// 创建全局实例
window.markdownParser = new MarkdownParser();

// 导出解析函数
window.parseMarkdown = function(text) {
    return window.markdownParser.parse(text);
};

window.parseMarkdownWithHighlight = function(text) {
    return window.markdownParser.parseWithHighlight(text);
};