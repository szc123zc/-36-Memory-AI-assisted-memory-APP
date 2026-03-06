// 36智能记忆App - 主要JavaScript文件

class MemoryApp {
    constructor() {
        this.currentPage = 'home';
        this.memoryMethods = this.getMemoryMethods();
        this.apiConfig = {
            url: 'https://api.siliconflow.cn/v1/chat/completions',
            model: 'Qwen/Qwen2.5-72B-Instruct',
            token: '',
            maxTokens: 800,
            temperature: 0.5,
            top_p: 0.9,
            fastMode: true
        };
        this.loadApiConfig();
        this.currentSession = null;
        this.isGenerationStopped = false;
        this.currentReader = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeStorage();
        this.setupMessageListener();
    }

    // 初始化本地存储
    initializeStorage() {
        if (!localStorage.getItem('memoryRecords')) {
            localStorage.setItem('memoryRecords', JSON.stringify([]));
        }
        // 学习统计功能已删除，不再初始化统计数据
    }

    // 设置消息监听器
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            const { action, data } = event.data;
            
            switch (action) {
                case 'navigate':
                    this.navigateTo(data.page, data.params);
                    break;
                case 'startMemoryProcess':
                    this.startMemoryProcess(data.content, data.methodId);
                    break;
                case 'saveMemoryRecord':
                    this.saveMemoryRecord(data);
                    break;
                case 'getMemoryRecords':
                    this.sendMessageToCurrentPage('memoryRecords', this.getMemoryRecords());
                    break;
                case 'getUserStats':
                    this.sendMessageToCurrentPage('userStats', this.getUserStats());
                    break;
                case 'deleteMemoryRecord':
                    this.deleteMemoryRecord(data.id);
                    break;
                case 'getMemoryMethods':
                    this.sendMessageToCurrentPage('memoryMethods', this.memoryMethods);
                    break;
                case 'updateStats':
                    // 学习统计功能已删除
                    break;
            }
        });
    }

    // 加载API配置
    loadApiConfig() {
        try {
            const saved = localStorage.getItem('apiConfig');
            if (saved) {
                const parsedConfig = JSON.parse(saved);
                this.apiConfig = { ...this.apiConfig, ...parsedConfig };
                console.log('API配置加载成功:', { ...this.apiConfig, token: this.apiConfig.token ? '***已隐藏***' : '未设置' });
            }
        } catch (error) {
            console.error('加载API配置失败:', error);
        }
    }

    // 更新API配置
    updateApiConfig(newConfig) {
        if (!newConfig) {
            console.warn('updateApiConfig: 配置参数为空');
            return;
        }
        
        console.log('更新API配置:', { ...newConfig, token: newConfig.token ? '***已隐藏***' : '未设置' });
        
        this.apiConfig = { ...this.apiConfig, ...newConfig };
        
        try {
            localStorage.setItem('apiConfig', JSON.stringify(this.apiConfig));
            console.log('API配置已保存到localStorage');
        } catch (error) {
            console.error('保存API配置失败:', error);
        }
        
        console.log('更新后的API配置:', { ...this.apiConfig, token: this.apiConfig.token ? '***已隐藏***' : '未设置' });
    }

    // 向当前页面发送消息
    sendMessageToCurrentPage(type, data) {
        const iframe = document.getElementById('mainContent');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type, data }, '*');
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 标签栏导航
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const page = tab.dataset.page;
                this.navigateTo(page);
            });
        });

        // 返回按钮
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('back-button')) {
                this.goBack();
            }
        });

        // 设置按钮
        document.addEventListener('click', (e) => {
            if (e.target.textContent === '设置') {
                this.navigateTo('settings');
            }
        });
    }

    // 状态栏更新方法已移除，使用系统原生状态栏

    // 页面导航
    navigateTo(page, params = {}) {
        this.currentPage = page;
        this.loadPage(page, params);
        this.updateTabBar(page);
        this.updateNavBar(page);
    }

    // 加载页面内容
    loadPage(page, params = {}) {
        const iframe = document.getElementById('mainContent');
        if (iframe) {
            let url = `pages/${page}.html`;
            if (Object.keys(params).length > 0) {
                const urlParams = new URLSearchParams(params);
                url += `?${urlParams.toString()}`;
            }
            iframe.src = url;
        }
    }

    // 更新导航栏
    updateNavBar(page) {
        const backButton = document.querySelector('.back-button');
        const navTitle = document.querySelector('.nav-title');
        
        const pageConfig = {
            'home': { title: '36智能记忆', showBack: false },
            'input': { title: '内容输入', showBack: true },
            'methods': { title: '记忆方法', showBack: true },
            'processing': { title: 'AI处理中', showBack: false },
            'result': { title: '记忆方案', showBack: true },
            'history': { title: '学习历史', showBack: true },
            'settings': { title: '设置', showBack: true }
        };

        const config = pageConfig[page] || pageConfig['home'];
        
        if (navTitle) navTitle.textContent = config.title;
        if (backButton) {
            backButton.style.visibility = config.showBack ? 'visible' : 'hidden';
        }
    }

    // 更新标签栏状态
    updateTabBar(activePage) {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 根据页面类型更新对应的tab
        const pageTabMap = {
            'home': 'home',
            'input': 'input',
            'methods': 'methods', 
            'processing': 'input',
            'result': 'input',
            'history': 'history',
            'settings': 'history'
        };
        
        const tabName = pageTabMap[activePage] || 'home';
        const tabElement = document.querySelector(`[data-page="${tabName}"]`);
        if (tabElement) {
            tabElement.classList.add('active');
        }
    }

    // 返回上一页
    goBack() {
        const backRoutes = {
            'input': 'home',
            'methods': 'input',
            'processing': 'input',
            'result': 'processing',
            'history': 'home',
            'settings': 'home'
        };
        
        const targetPage = backRoutes[this.currentPage] || 'home';
        this.navigateTo(targetPage);
    }

    // 开始记忆处理流程
    async startMemoryProcess(content, methodId) {
        this.currentSession = {
            content,
            methodId,
            startTime: Date.now()
        };
        
        // 导航到处理页面
        this.navigateTo('processing', { content, methodId });
    }

    // 获取36种记忆方法 - 与methods.html保持一致
    getMemoryMethods() {
        return [
            { 
                id: 1, 
                name: '联想记忆法', 
                description: '通过建立事物之间的联系来增强记忆', 
                icon: '🔗', 
                category: 'association',
                fullDesc: '联想记忆法是通过在新信息与已知信息之间建立有意义的联系来增强记忆效果的方法。这种方法利用大脑天然的联想能力，让记忆变得更加生动和持久。',
                examples: [
                    '记忆单词"apple"时，联想到红色、甜味、营养等特征',
                    '记忆历史年代时，联想到相关的重大事件',
                    '记忆人名时，联想到其外貌特征或职业特点'
                ],
                steps: [
                    '识别要记忆的新信息',
                    '寻找与已知信息的相似点或关联点',
                    '建立生动、有趣的联想关系',
                    '反复强化这种联想关系',
                    '在需要时通过联想快速回忆'
                ],
                tips: '联想越生动、越个人化，记忆效果越好。可以使用夸张、幽默的联想来增强印象。'
            },
            { 
                id: 2, 
                name: '图像记忆法', 
                description: '将抽象信息转化为生动的图像', 
                icon: '🖼️', 
                category: 'visual',
                fullDesc: '图像记忆法是将抽象的信息转化为具体、生动的视觉图像来进行记忆的方法。人脑对图像的记忆能力远超过对文字的记忆能力。',
                examples: [
                    '记忆购物清单时，想象每件商品的具体形象',
                    '学习地理时，将地图转化为具体的地形图像',
                    '记忆演讲要点时，为每个要点创建对应的图像'
                ],
                steps: [
                    '分析要记忆的信息内容',
                    '为每个信息点创建对应的视觉图像',
                    '让图像尽可能生动、具体',
                    '将多个图像串联成完整的画面',
                    '定期回顾和强化这些图像'
                ],
                tips: '图像要色彩鲜明、动作夸张，可以加入个人经历让图像更有意义。'
            },
            { 
                id: 3, 
                name: '故事记忆法', 
                description: '将要记忆的内容编成有趣的故事', 
                icon: '📚', 
                category: 'association',
                fullDesc: '故事记忆法是将零散的信息编织成一个连贯、有趣的故事来进行记忆的方法。故事的情节性和逻辑性能够大大提高记忆效果。',
                examples: [
                    '记忆购物清单：编一个去超市购物的小故事',
                    '记忆历史事件：将事件串联成历史故事',
                    '记忆学习要点：创造一个包含所有要点的情节'
                ],
                steps: [
                    '列出所有需要记忆的要点',
                    '确定故事的主线和背景',
                    '将各个要点融入故事情节中',
                    '让故事情节生动有趣',
                    '反复讲述这个故事来巩固记忆'
                ],
                tips: '故事要有明确的开头、发展和结尾，情节要合理且容易记忆。'
            },
            { 
                id: 4, 
                name: '位置记忆法', 
                description: '利用熟悉的地点来组织记忆内容', 
                icon: '📍', 
                category: 'visual',
                fullDesc: '位置记忆法（也称记忆宫殿法）是将要记忆的信息与熟悉的地点或路线相关联的古老而有效的记忆方法。',
                examples: [
                    '在家中各个房间放置要记忆的信息',
                    '沿着上班路线记忆演讲要点',
                    '在学校各个教室中放置学习内容'
                ],
                steps: [
                    '选择一个非常熟悉的地点或路线',
                    '确定地点中的关键位置点',
                    '将要记忆的信息分配到各个位置',
                    '在脑中"走过"这些位置',
                    '通过重复路线来巩固记忆'
                ],
                tips: '选择的地点要非常熟悉，位置点要有明确的顺序，信息与位置的关联要生动。'
            },
            { 
                id: 5, 
                name: '韵律记忆法', 
                description: '通过节奏和韵律来增强记忆效果', 
                icon: '🎵', 
                category: 'repetition',
                fullDesc: '韵律记忆法是利用音乐的节奏、韵律和旋律来帮助记忆信息的方法。音乐能够激活大脑的多个区域，显著提高记忆效果。',
                examples: [
                    '将乘法口诀编成儿歌',
                    '用熟悉的旋律记忆英语单词',
                    '为历史年代创作押韵的诗句'
                ],
                steps: [
                    '分析要记忆的信息结构',
                    '选择合适的节奏或旋律',
                    '将信息编入韵律中',
                    '反复吟唱或朗读',
                    '在需要时通过韵律回忆信息'
                ],
                tips: '选择简单易记的旋律，韵律要自然流畅，可以加入手势或动作增强效果。'
            },
            { 
                id: 6, 
                name: '分类记忆法', 
                description: '将信息按类别进行组织和记忆', 
                icon: '📂', 
                category: 'logical',
                fullDesc: '分类记忆法是将大量信息按照某种逻辑标准进行分类整理，然后分别记忆的方法。这种方法能够减少记忆负担，提高记忆效率。',
                examples: [
                    '按学科分类记忆学习内容',
                    '按功能分类记忆工具用途',
                    '按时间分类记忆历史事件'
                ],
                steps: [
                    '收集所有需要记忆的信息',
                    '确定分类的标准和原则',
                    '将信息归入相应的类别',
                    '为每个类别创建记忆标签',
                    '分别记忆各个类别的内容'
                ],
                tips: '分类标准要清晰明确，类别数量要适中，每个类别内的信息要相关。'
            },
            { 
                id: 7, 
                name: '数字记忆法', 
                description: '将数字转化为有意义的信息', 
                icon: '🔢', 
                category: 'logical',
                fullDesc: '数字记忆法是将抽象的数字转化为具体形象或有意义的信息来记忆。',
                examples: [
                    '将电话号码转化为日期',
                    '用谐音记忆数字'
                ],
                steps: [
                    '分析数字特征',
                    '寻找转化规律',
                    '建立形象联想',
                    '反复练习巩固'
                ],
                tips: '可以使用数字编码系统，建立固定的数字-图像对应关系。'
            },
            { 
                id: 8, 
                name: '首字母记忆法', 
                description: '提取关键词的首字母组成易记的词组', 
                icon: '🅰️', 
                category: 'logical',
                fullDesc: '首字母记忆法是提取多个词语的首字母组成新的词语或句子来辅助记忆。',
                examples: [
                    '用ROYGBIV记忆彩虹颜色',
                    '用缩写记忆专业术语'
                ],
                steps: [
                    '列出要记忆的词语',
                    '提取每个词的首字母',
                    '组成有意义的词或句',
                    '记忆新组成的内容'
                ],
                tips: '组成的词语要容易记忆，最好有实际意义。'
            },
            { 
                id: 9, 
                name: '重复记忆法', 
                description: '通过有规律的重复来巩固记忆', 
                icon: '🔄', 
                category: 'repetition',
                fullDesc: '重复记忆法是通过有规律的重复来巩固记忆的基础方法。',
                examples: [
                    '每天重复背诵单词',
                    '定期复习学过的内容'
                ],
                steps: [
                    '制定复习计划',
                    '按计划重复学习',
                    '逐渐延长复习间隔'
                ],
                tips: '遵循遗忘曲线规律，合理安排复习时间间隔。'
            },
            { 
                id: 10, 
                name: '关键词记忆法', 
                description: '提取和强化关键信息点', 
                icon: '🔑', 
                category: 'logical',
                fullDesc: '关键词记忆法是提取信息中的核心词汇来帮助记忆的方法。',
                examples: [
                    '提取文章段落的关键词',
                    '总结会议的要点词汇'
                ],
                steps: [
                    '阅读全部内容',
                    '识别核心概念',
                    '提取关键词汇',
                    '建立词汇间联系'
                ],
                tips: '关键词要准确反映核心内容，数量要适中。'
            },
            { 
                id: 11, 
                name: '思维导图法', 
                description: '用图形化的方式组织和展示信息', 
                icon: '🗺️', 
                category: 'visual',
                fullDesc: '思维导图法是用树状图形来组织和表示信息的可视化记忆方法。',
                examples: [
                    '制作学科知识导图',
                    '规划项目流程图'
                ],
                steps: [
                    '确定中心主题',
                    '添加主要分支',
                    '细化子分支内容',
                    '使用颜色和图标',
                    '定期回顾更新'
                ],
                tips: '使用不同颜色区分类别，添加图标增强视觉效果。'
            },
            { 
                id: 12, 
                name: '对比记忆法', 
                description: '通过对比相似或相反的内容来记忆', 
                icon: '⚖️', 
                category: 'logical',
                fullDesc: '对比记忆法是通过比较相似事物的差异来加深记忆印象的方法。',
                examples: [
                    '对比近义词的区别',
                    '比较历史事件的异同'
                ],
                steps: [
                    '选择对比对象',
                    '列出相同点',
                    '突出不同点',
                    '制作对比表格',
                    '重点记忆差异'
                ],
                tips: '重点关注关键差异，可以制作对比表格辅助记忆。'
            },
            { 
                id: 13, 
                name: '时间轴记忆法', 
                description: '按时间顺序组织记忆内容', 
                icon: '⏰', 
                category: 'logical',
                fullDesc: '时间轴记忆法是将信息按照时间顺序排列来帮助记忆的方法。',
                examples: [
                    '制作历史事件时间轴',
                    '规划学习进度时间表'
                ],
                steps: [
                    '收集时间信息',
                    '按时间排序',
                    '制作时间轴图',
                    '标注重要节点',
                    '定期回顾巩固'
                ],
                tips: '重要时间节点要突出标记，可以添加相关背景信息。'
            },
            { 
                id: 14, 
                name: '口诀记忆法', 
                description: '编制朗朗上口的口诀来记忆', 
                icon: '📝', 
                category: 'repetition',
                fullDesc: '口诀记忆法是将要记忆的内容编成押韵、朗朗上口的句子来记忆。',
                examples: [
                    '乘法口诀表',
                    '化学元素周期表口诀'
                ],
                steps: [
                    '分析内容结构',
                    '寻找押韵规律',
                    '编制口诀句子',
                    '反复朗读练习',
                    '在应用中巩固'
                ],
                tips: '口诀要押韵流畅，内容要准确完整。'
            },
            { 
                id: 15, 
                name: '视觉记忆法', 
                description: '利用视觉印象来记忆', 
                icon: '👁️', 
                category: 'visual',
                fullDesc: '视觉记忆法是充分利用视觉感官来增强记忆效果的方法。',
                examples: [
                    '记忆地图和图表',
                    '观察实物特征'
                ],
                steps: [
                    '仔细观察对象',
                    '注意视觉细节',
                    '形成清晰印象',
                    '在脑中重现图像',
                    '定期回忆巩固'
                ],
                tips: '观察要仔细全面，可以画出简图辅助记忆。'
            },
            { 
                id: 16, 
                name: '动作记忆法', 
                description: '结合身体动作来辅助记忆', 
                icon: '🤸', 
                category: 'visual',
                fullDesc: '动作记忆法是通过身体动作和手势来辅助记忆的方法。',
                examples: [
                    '用手势记忆演讲内容',
                    '通过动作学习舞蹈'
                ],
                steps: [
                    '设计相关动作',
                    '练习动作配合',
                    '形成动作记忆',
                    '反复练习巩固',
                    '在应用中强化'
                ],
                tips: '动作要简单易做，与内容要有逻辑关联。'
            },
            { 
                id: 17, 
                name: '情感记忆法', 
                description: '通过情感体验来增强记忆印象', 
                icon: '❤️', 
                category: 'association',
                fullDesc: '情感记忆法是通过调动情感体验来增强记忆效果的方法。',
                examples: [
                    '回忆特殊时刻的感受',
                    '用情感故事记忆知识'
                ],
                steps: [
                    '识别相关情感',
                    '建立情感联系',
                    '强化情感体验',
                    '在情境中回忆',
                    '定期情感回顾'
                ],
                tips: '积极情感比消极情感更有利于记忆，可以创造愉快的学习体验。'
            },
            { 
                id: 18, 
                name: '逻辑记忆法', 
                description: '通过逻辑关系来记忆', 
                icon: '🧠', 
                category: 'logical',
                fullDesc: '逻辑记忆法是通过理解和建立信息间的逻辑关系来记忆的方法。',
                examples: [
                    '理解数学公式的推导',
                    '掌握历史事件的因果关系'
                ],
                steps: [
                    '分析逻辑结构',
                    '理解因果关系',
                    '建立逻辑链条',
                    '验证逻辑正确性',
                    '应用逻辑推理'
                ],
                tips: '要深入理解内在逻辑，不能只是机械记忆。'
            },
            { 
                id: 19, 
                name: '谐音记忆法', 
                description: '利用谐音来记忆信息', 
                icon: '🎭', 
                category: 'association',
                fullDesc: '谐音记忆法是利用发音相似的词语来帮助记忆的方法。',
                examples: [
                    '用谐音记忆英语单词',
                    '记忆数字和日期'
                ],
                steps: [
                    '寻找谐音词汇',
                    '建立谐音联系',
                    '创造谐音句子',
                    '反复练习发音',
                    '在使用中巩固'
                ],
                tips: '谐音要自然贴切，避免过于牵强的联系。'
            },
            { 
                id: 20, 
                name: '符号记忆法', 
                description: '用符号代替复杂信息', 
                icon: '🔣', 
                category: 'visual',
                fullDesc: '符号记忆法是用简单的符号来代表复杂信息的记忆方法。',
                examples: [
                    '用符号记录笔记',
                    '创建个人符号系统'
                ],
                steps: [
                    '设计符号系统',
                    '建立符号含义',
                    '练习符号使用',
                    '标准化符号规则',
                    '在实践中完善'
                ],
                tips: '符号要简单易画，含义要明确一致。'
            },
            { 
                id: 21, 
                name: '层次记忆法', 
                description: '按层次结构组织信息', 
                icon: '🏗️', 
                category: 'logical',
                fullDesc: '层次记忆法是将信息按照层次结构来组织和记忆的方法。',
                examples: [
                    '按章节层次学习教材',
                    '分层次管理工作任务'
                ],
                steps: [
                    '分析信息层次',
                    '建立层次结构',
                    '从上到下记忆',
                    '理解层次关系',
                    '整体把握结构'
                ],
                tips: '要理解各层次间的关系，从整体到细节逐步深入。'
            },
            { 
                id: 22, 
                name: '循环记忆法', 
                description: '定期复习巩固记忆', 
                icon: '🔁', 
                category: 'repetition',
                fullDesc: '循环记忆法是按照一定周期循环复习来巩固记忆的方法。',
                examples: [
                    '制定复习计划表',
                    '定期回顾学习内容'
                ],
                steps: [
                    '制定复习周期',
                    '安排复习内容',
                    '按时执行复习',
                    '调整复习频率',
                    '持续循环巩固'
                ],
                tips: '复习间隔要科学合理，遵循记忆遗忘规律。'
            },
            { 
                id: 23, 
                name: '压缩记忆法', 
                description: '将信息压缩成简短形式', 
                icon: '📦', 
                category: 'logical',
                fullDesc: '压缩记忆法是将大量信息提炼压缩成简短易记的形式。',
                examples: [
                    '提炼文章要点',
                    '总结会议纪要'
                ],
                steps: [
                    '提取核心信息',
                    '删除冗余内容',
                    '压缩表达形式',
                    '保持信息完整',
                    '验证压缩效果'
                ],
                tips: '压缩要保持信息的完整性和准确性。'
            },
            { 
                id: 24, 
                name: '扩展记忆法', 
                description: '从核心信息向外扩展', 
                icon: '📈', 
                category: 'association',
                fullDesc: '扩展记忆法是从核心信息出发，逐步向外扩展相关信息的记忆方法。',
                examples: [
                    '从关键词扩展到完整概念',
                    '从基础知识扩展到应用'
                ],
                steps: [
                    '确定核心信息',
                    '寻找相关联系',
                    '逐步向外扩展',
                    '建立信息网络',
                    '整合扩展内容'
                ],
                tips: '扩展要有逻辑性，避免无关信息的干扰。'
            },
            { 
                id: 25, 
                name: '模拟记忆法', 
                description: '模拟实际应用场景', 
                icon: '🎯', 
                category: 'visual',
                fullDesc: '模拟记忆法是通过模拟实际应用场景来加深记忆的方法。',
                examples: [
                    '模拟考试环境练习',
                    '角色扮演学习对话'
                ],
                steps: [
                    '设计模拟场景',
                    '准备模拟材料',
                    '执行模拟练习',
                    '分析模拟结果',
                    '改进模拟方案'
                ],
                tips: '模拟要尽可能接近真实情况，增强实用性。'
            },
            { 
                id: 26, 
                name: '游戏记忆法', 
                description: '通过游戏化方式记忆', 
                icon: '🎮', 
                category: 'visual',
                fullDesc: '游戏记忆法是将学习内容游戏化，通过游戏方式来记忆信息。',
                examples: [
                    '单词接龙游戏',
                    '知识竞答游戏'
                ],
                steps: [
                    '设计游戏规则',
                    '准备游戏内容',
                    '开展游戏活动',
                    '总结游戏收获',
                    '改进游戏方式'
                ],
                tips: '游戏要有趣味性，同时要确保学习效果。'
            },
            { 
                id: 27, 
                name: '竞争记忆法', 
                description: '通过竞争激发记忆动力', 
                icon: '🏆', 
                category: 'association',
                fullDesc: '竞争记忆法是通过竞争机制来激发学习动力，提高记忆效果。',
                examples: [
                    '参加知识竞赛',
                    '与同学比赛背诵'
                ],
                steps: [
                    '设定竞争目标',
                    '寻找竞争对手',
                    '制定竞争规则',
                    '开展竞争活动',
                    '总结竞争经验'
                ],
                tips: '竞争要适度，重在激发动力而非制造压力。'
            },
            { 
                id: 28, 
                name: '奖励记忆法', 
                description: '设置奖励机制促进记忆', 
                icon: '🎁', 
                category: 'association',
                fullDesc: '奖励记忆法是通过设置奖励机制来激励学习，促进记忆效果。',
                examples: [
                    '完成目标后给自己奖励',
                    '建立积分奖励系统'
                ],
                steps: [
                    '设定学习目标',
                    '制定奖励标准',
                    '执行奖励计划',
                    '享受奖励成果',
                    '调整奖励机制'
                ],
                tips: '奖励要及时适度，与学习成果相匹配。'
            },
            { 
                id: 29, 
                name: '社交记忆法', 
                description: '通过社交互动来记忆', 
                icon: '👥', 
                category: 'association',
                fullDesc: '社交记忆法是通过与他人的交流互动来增强记忆效果的方法。',
                examples: [
                    '小组讨论学习',
                    '向他人讲解知识'
                ],
                steps: [
                    '寻找学习伙伴',
                    '组织学习讨论',
                    '分享学习心得',
                    '互相提问检验',
                    '建立学习社群'
                ],
                tips: '要积极参与讨论，通过教授他人来巩固自己的记忆。'
            },
            { 
                id: 30, 
                name: '环境记忆法', 
                description: '利用环境因素辅助记忆', 
                icon: '🌍', 
                category: 'visual',
                fullDesc: '环境记忆法是利用学习环境的特征来辅助记忆的方法。',
                examples: [
                    '在特定地点学习特定内容',
                    '利用环境线索回忆'
                ],
                steps: [
                    '选择合适环境',
                    '建立环境联系',
                    '在环境中学习',
                    '利用环境提示',
                    '强化环境记忆'
                ],
                tips: '学习环境要相对固定，可以利用环境变化来区分不同内容。'
            },
            { 
                id: 31, 
                name: '工具记忆法', 
                description: '借助工具来辅助记忆', 
                icon: '🛠️', 
                category: 'logical',
                fullDesc: '工具记忆法是利用各种工具和技术来辅助记忆的方法。',
                examples: [
                    '使用记忆卡片',
                    '利用手机应用'
                ],
                steps: [
                    '选择合适工具',
                    '学习工具使用',
                    '制定使用计划',
                    '坚持工具使用',
                    '评估工具效果'
                ],
                tips: '工具要简单实用，不能过度依赖而忽视自身记忆能力。'
            },
            { 
                id: 32, 
                name: '习惯记忆法', 
                description: '将记忆融入日常习惯', 
                icon: '⚡', 
                category: 'repetition',
                fullDesc: '习惯记忆法是将记忆活动融入日常生活习惯中的方法。',
                examples: [
                    '每天固定时间背单词',
                    '利用通勤时间复习'
                ],
                steps: [
                    '分析日常习惯',
                    '寻找记忆时机',
                    '建立记忆习惯',
                    '坚持习惯执行',
                    '优化习惯效果'
                ],
                tips: '要选择容易坚持的时间点，让记忆成为自然习惯。'
            },
            { 
                id: 33, 
                name: '创新记忆法', 
                description: '创造性地记忆信息', 
                icon: '💡', 
                category: 'association',
                fullDesc: '创新记忆法是运用创造性思维来设计独特记忆方法的高级技巧。',
                examples: [
                    '发明个人记忆系统',
                    '创造独特记忆技巧'
                ],
                steps: [
                    '分析记忆需求',
                    '发挥创造思维',
                    '设计创新方法',
                    '测试方法效果',
                    '完善创新技巧'
                ],
                tips: '要敢于尝试新方法，结合个人特点进行创新。'
            },
            { 
                id: 34, 
                name: '综合记忆法', 
                description: '综合运用多种记忆方法', 
                icon: '🔄', 
                category: 'logical',
                fullDesc: '综合记忆法是将多种记忆方法有机结合使用的高级记忆策略。',
                examples: [
                    '同时使用图像和故事记忆',
                    '结合重复和联想记忆'
                ],
                steps: [
                    '分析记忆内容',
                    '选择适合方法',
                    '设计组合方案',
                    '协调方法使用',
                    '评估综合效果'
                ],
                tips: '要根据内容特点选择方法组合，避免方法间的冲突。'
            },
            { 
                id: 35, 
                name: '个性记忆法', 
                description: '根据个人特点定制记忆方法', 
                icon: '🎨', 
                category: 'association',
                fullDesc: '个性记忆法是根据个人的学习风格、兴趣爱好和认知特点来定制专属记忆方法。',
                examples: [
                    '音乐爱好者用旋律记忆',
                    '运动员用动作记忆'
                ],
                steps: [
                    '分析个人特点',
                    '识别学习风格',
                    '设计个性方法',
                    '实践验证效果',
                    '持续优化改进'
                ],
                tips: '要深入了解自己的特点，设计最适合自己的记忆方法。'
            },
            { 
                id: 36, 
                name: '理解记忆法', 
                description: '通过深入理解来记忆', 
                icon: '🧠', 
                category: 'logical',
                fullDesc: '理解记忆法是通过深入理解内容的内在逻辑和意义来增强记忆的方法。',
                examples: [
                    '理解数学公式的推导过程',
                    '掌握概念的本质含义'
                ],
                steps: [
                    '分析内容结构',
                    '理解核心概念',
                    '建立逻辑联系',
                    '验证理解程度',
                    '应用所学知识'
                ],
                tips: '理解是记忆的基础，要在理解的基础上进行记忆。'
            }
        ];
    }

    // 调用AI API处理记忆内容
    async processMemoryContent(content, methodId, onProgress = null) {
        const method = this.memoryMethods.find(m => m.id === methodId);
        if (!method) {
            throw new Error('未找到指定的记忆方法');
        }

        // 确保currentSession存在，如果不存在则创建一个
        if (!this.currentSession) {
            console.log('currentSession不存在，创建新的会话');
            this.currentSession = {
                content,
                methodId,
                startTime: Date.now()
            };
        }

        try {
            let result;
            
            // 重新加载API配置以确保最新状态
            this.loadApiConfig();
            
            // 检查是否配置了API密钥
            console.log('当前API配置状态:', this.apiConfig);
            console.log('API Token存在:', !!this.apiConfig.token);
            console.log('API Token长度:', this.apiConfig.token ? this.apiConfig.token.length : 0);
            
            if (this.apiConfig.token && this.apiConfig.token.trim() !== '') {
                console.log('使用API调用生成内容，API URL:', this.apiConfig.url);
                console.log('使用模型:', this.apiConfig.model);
                try {
                    // 使用真实的API调用，传递进度回调
                    result = await this.callSiliconFlowAPI(content, method, onProgress);
                    console.log('API调用成功');
                } catch (apiError) {
                    console.warn('API调用失败，回退到模拟响应:', apiError.message);
                    result = await this.generateMockResponse(content, method, onProgress);
                }
            } else {
                console.log('使用模拟响应（未配置API密钥或密钥为空）');
                // 如果没有配置API密钥，使用模拟响应
                result = await this.generateMockResponse(content, method, onProgress);
            }
            
            // 保存处理结果到会话
            this.currentSession.result = result;
            this.currentSession.studyTime = Date.now() - this.currentSession.startTime;
            
            return result;
        } catch (error) {
            console.error('记忆内容处理失败:', error);
            // 最后的回退机制
            try {
                const result = await this.generateMockResponse(content, method, onProgress);
                
                // 确保currentSession存在
                if (!this.currentSession) {
                    this.currentSession = {
                        content,
                        methodId,
                        startTime: Date.now()
                    };
                }
                
                // 保存处理结果到会话
                this.currentSession.result = result;
                this.currentSession.studyTime = Date.now() - this.currentSession.startTime;
                
                return result;
            } catch (mockError) {
                console.error('模拟响应也失败了:', mockError);
                throw new Error('记忆处理系统暂时不可用，请稍后重试');
            }
        }
    }

    // 调用硅基流动API（支持流式响应）
    async callSiliconFlowAPI(content, method, onProgress = null) {
        // 重置停止标志
        this.isGenerationStopped = false;
        
        // 重新加载配置确保最新
        this.loadApiConfig();
        
        const prompt = this.generatePrompt(content, method);
        
        // 验证配置
        if (!this.apiConfig.token || this.apiConfig.token.trim() === '') {
            throw new Error('API密钥未配置');
        }
        
        if (!this.apiConfig.url || this.apiConfig.url.trim() === '') {
            throw new Error('API地址未配置');
        }
        
        if (!this.apiConfig.model || this.apiConfig.model.trim() === '') {
            throw new Error('AI模型未配置');
        }
        
        console.log('准备调用API:', {
            url: this.apiConfig.url,
            model: this.apiConfig.model,
            hasToken: !!this.apiConfig.token
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('API请求超时，已中止');
        }, 120000); // 2分钟超时
        
        try {
            const response = await fetch(this.apiConfig.url.trim(), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiConfig.token.trim()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.apiConfig.model.trim(),
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: this.apiConfig.maxTokens || 800,
                    temperature: this.apiConfig.temperature ?? 0.5,
                    top_p: this.apiConfig.top_p ?? 0.9,
                    stream: !!onProgress
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `API调用失败 (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // 如果启用了流式响应
            if (onProgress && response.body) {
                const reader = response.body.getReader();
                this.currentReader = reader;
                const decoder = new TextDecoder();
                let result = '';

                try {
                    while (true) {
                        if (this.isGenerationStopped) {
                            console.log('AI生成已被用户停止');
                            break;
                        }

                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (this.isGenerationStopped) {
                                console.log('AI生成已被用户停止');
                                break;
                            }

                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    const delta = parsed.choices?.[0]?.delta?.content;
                                    if (delta) {
                                        result += delta;
                                        onProgress(result);
                                    }
                                } catch (e) {
                                    // 忽略解析错误
                                }
                            }
                        }

                        if (this.isGenerationStopped) {
                            break;
                        }
                    }
                } finally {
                    reader.releaseLock();
                    this.currentReader = null;
                }

                console.log('流式API调用成功，返回结果长度:', result.length);
                return result || '抱歉，AI处理出现问题，请稍后重试。';
            } else {
                // 非流式响应
                const data = await response.json();
                const result = data.choices?.[0]?.message?.content || '抱歉，AI处理出现问题，请稍后重试。';
                console.log('API调用成功，返回结果长度:', result.length);
                return result;
            }
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                console.error('API请求超时');
                throw new Error('API请求超时，请检查网络连接或稍后重试');
            }
            
            console.error('API调用失败:', error);
            throw error;
        }
    }

    // 生成针对不同记忆方法的提示词
    generatePrompt(content, method) {
        try {
            const map = JSON.parse(localStorage.getItem('customPrompts') || '{}');
            const cp = map[String(method.id)] || '';
            if (cp && cp.trim()) {
                const hasContent = /\{\{?content\}?\}/i.test(cp);
                const filled = hasContent ? cp.replace(/\{\{?content\}?\}/ig, content) : cp + "\n\n内容：" + content;
                return filled;
            }
        } catch (e) {}
        const methodDesc = method.fullDesc || method.desc || '一种有效的记忆方法';
        const methodSteps = method.steps || [];
        const methodTips = method.tips || '';
        const speedHint = this.apiConfig.fastMode ? '\n\n请用要点式简洁输出，控制在400-600字左右。' : '\n\n请结构化输出，控制在800-1200字左右。';
        let stepsText = '';
        if (methodSteps.length > 0) {
            stepsText = '\n\n实施步骤：\n' + methodSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
        }
        let tipsText = '';
        if (methodTips) {
            tipsText = `\n\n使用要点：${methodTips}`;
        }
        return `请使用${method.name}帮助记忆以下内容："${content}"。

${methodDesc}${stepsText}

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析要记忆内容的特点和要求
2. 方法应用：具体说明如何应用${method.name}
3. 实施步骤：提供详细的实施步骤和操作方法
4. 技巧要点：分享使用该方法的关键技巧
5. 效果评估：说明如何评估和改进记忆效果${tipsText}

请确保方法应用得当，步骤清晰可操作。${speedHint}`;
        const prompts = {
            1: `请使用与物相联法帮助记忆以下内容："${content}"。

与物相联法是将要记的内容和与之相关的物结合在一起，通过物的形象或意义记忆所记内容的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析要记忆内容中的关键词汇和概念
2. 物品关联：为每个关键内容找到相关的具体物品
3. 联系建立：说明如何将内容与物品建立生动的联系
4. 实践方法：提供具体的实施步骤（如制作标签、卡片等）
5. 复习策略：利用物品进行重复记忆的方法

请确保所选物品贴切易得，联系自然生动。`,

            2: `请使用联系愉快经历法帮助记忆以下内容："${content}"。

联系愉快经历法是把所要记忆的事物同自己的愉快经历联系起来以增强记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析要记忆内容的情感化潜力
2. 愉快经历挖掘：引导用户回忆相关的美好经历
3. 情感联系：建立内容与愉快经历的情感纽带
4. 记忆强化：通过愉快情绪增强记忆印象
5. 回忆技巧：利用愉快经历触发内容回忆

请确保联系自然，能够唤起积极情感。`,

            3: `请使用触景生情记忆法帮助记忆以下内容："${content}"。

触景生情记忆法是凭借接触过的景致回忆材料的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容与具体场景的关联可能
2. 场景选择：为内容选择合适的记忆场景
3. 景物关联：将内容要点与场景中的具体景物联系
4. 情境构建：创造生动的记忆情境
5. 实地练习：提供在实际场景中练习的方法

请确保场景真实可达，联系生动具体。`,

            4: `请使用比喻记忆法帮助记忆以下内容："${content}"。

比喻记忆法是用人们较为熟悉的事物来比喻识记内容来提高记忆效率的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析要记忆内容的特征和属性
2. 比喻选择：为每个要点选择贴切的比喻对象
3. 相似性阐述：说明内容与比喻对象的相似之处
4. 比喻串联：将多个比喻组织成完整的记忆体系
5. 应用练习：通过比喻进行记忆练习的方法

请确保比喻生动贴切，易于理解和记忆。`,

            5: `请使用转移记忆法帮助记忆以下内容："${content}"。

转移记忆法是当一时回忆不起来时，避开硬想，把思绪转移到所要回忆内容的周围去寻找线索的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的关联要素和背景信息
2. 线索网络：构建内容周围的记忆线索网络
3. 转移路径：设计从不同角度接近目标内容的路径
4. 联想训练：训练从周边信息联想到核心内容
5. 应急策略：当直接回忆困难时的转移技巧

请确保线索丰富多样，转移路径清晰可行。`,

            6: `请使用运用地图记忆法帮助记忆以下内容："${content}"。

运用地图记忆法是运用地图记忆地理知识及相关信息的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的空间分布特征
2. 地图构建：为内容创建或选择合适的地图框架
3. 位置标记：将要记忆的内容标记在地图上
4. 路径设计：设计记忆内容的空间路径
5. 视觉强化：利用地图的视觉特征增强记忆

请确保地图清晰直观，位置标记准确易记。`,

            7: `请使用图示记忆法帮助记忆以下内容："${content}"。

图示记忆法是通过对图形识记来增强记忆效果的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的图形化表达可能
2. 图示设计：为内容设计简洁明了的图示
3. 符号系统：建立统一的图形符号系统
4. 关系表达：用图示表达内容间的逻辑关系
5. 记忆练习：通过图示进行记忆训练

请确保图示简洁明了，符号系统统一易懂。`,

            8: `请使用交谈记忆法帮助记忆以下内容："${content}"。

交谈记忆法是在和他人的交谈中，把自己尚未扎根的记忆经过证实、修改、补充变成确实记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的讨论价值和要点
2. 交谈设计：设计围绕内容的交谈话题和问题
3. 互动策略：制定有效的交谈互动策略
4. 记忆验证：通过交谈验证和完善记忆内容
5. 社交记忆：利用社交互动强化记忆效果

请确保交谈话题有趣，互动方式自然有效。`,

            9: `请使用争论记忆法帮助记忆以下内容："${content}"。

争论记忆法是通过与别人就学习材料进行争论探讨以强化记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容中可争论的观点和问题
2. 争论点设计：设计有价值的争论焦点
3. 论证准备：为不同观点准备论证材料
4. 辩论策略：制定有效的辩论策略
5. 记忆巩固：通过争论过程巩固记忆内容

请确保争论有理有据，能够深化对内容的理解。`,

            10: `请使用红色标记记忆法帮助记忆以下内容："${content}"。

红色标记记忆法是对非记住不可的重点内容用红色彩笔做标志的记忆法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析并确定内容中的重点信息
2. 标记策略：设计红色标记的使用策略
3. 层次划分：用不同的红色标记表示不同重要程度
4. 视觉强化：利用红色的视觉冲击力增强记忆
5. 复习方法：基于红色标记的高效复习方法

请确保重点突出，标记系统清晰有序。`,

            11: `请使用理解记忆法帮助记忆以下内容："${content}"。

理解记忆法是利用知识间的联系，经过思考把握记忆内容内部联系的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：深入分析内容的内在逻辑和结构
2. 理解层次：从浅到深建立多层次理解
3. 联系构建：建立内容与已有知识的联系
4. 逻辑梳理：梳理内容的逻辑关系和因果链条
5. 应用拓展：通过实际应用加深理解和记忆

请确保理解深入透彻，逻辑关系清晰明确。`,

            12: `请使用推理记忆法帮助记忆以下内容："${content}"。

推理记忆法是通过相互推导来帮助记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容中的推理关系和逻辑链条
2. 推理路径：构建从前提到结论的推理路径
3. 逻辑验证：验证推理过程的逻辑正确性
4. 反向推导：从结论反推到前提的练习
5. 推理练习：通过推理练习巩固记忆

请确保推理逻辑严密，推导过程清晰可循。`,

            13: `请使用规律记忆法帮助记忆以下内容："${content}"。

规律记忆法是寻求和推导记忆对象中本质的、必然的联系加以记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容中隐含的规律和模式
2. 规律提取：提取内容的核心规律和共性特征
3. 模式识别：识别内容的重复模式和变化规律
4. 规律应用：用发现的规律指导记忆实践
5. 举一反三：基于规律进行知识的扩展和应用

请确保规律准确可靠，应用方法具体可行。`,

            14: `请使用小插曲记忆法帮助记忆以下内容："${content}"。

小插曲记忆法是利用与记忆对象相关的小插曲，以增加趣味提高兴趣、增强记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的趣味化改造可能
2. 插曲设计：为内容设计有趣的小插曲或故事
3. 情节编排：安排引人入胜的情节发展
4. 趣味元素：加入幽默、悬念等趣味元素
5. 记忆联结：将插曲与记忆内容紧密联结

请确保插曲有趣生动，与内容联系自然紧密。`,

            15: `请使用变换顺序记忆法帮助记忆以下内容："${content}"。

变换顺序记忆法是复习所记忆的内容时改变当初记忆过程中的顺序以巩固记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的结构和可变换的顺序
2. 顺序设计：设计多种不同的记忆顺序
3. 变换策略：制定有效的顺序变换策略
4. 重点轮换：让不同部分轮流成为开头和重点
5. 复习计划：基于顺序变换的复习计划

请确保顺序变换有意义，能够全面覆盖所有内容。`,

            16: `请使用多角度重复练习记忆法帮助记忆以下内容："${content}"。

多角度重复练习记忆法是对学习记忆过的知识，从各个不同角度用练习的方法重复以巩固记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容可以从哪些角度进行练习
2. 角度设计：设计多种不同的练习角度和方式
3. 练习层次：从简单到复杂设计练习层次
4. 变化形式：用不同形式重复同一内容
5. 综合练习：设计综合性的多角度练习

请确保练习角度丰富多样，层次递进合理。`,

            17: `请使用读背结合记忆法帮助记忆以下内容："${content}"。

读背结合记忆法是反复朗读和背诵按一定比例结合起来进行记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的朗读和背诵特点
2. 比例设计：设计朗读和背诵的最佳时间比例
3. 阶段安排：安排从朗读到背诵的渐进阶段
4. 技巧指导：提供朗读和背诵的具体技巧
5. 检验方法：设计检验背诵效果的方法

请确保比例科学合理，技巧实用有效。`,

            18: `请使用集合相关记忆法帮助记忆以下内容："${content}"。

集合相关记忆法是把与记忆对象相关的内容集合在一起记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的相关信息和背景知识
2. 相关集合：收集与内容相关的各类信息
3. 分类整理：将相关信息进行分类和整理
4. 关联建立：建立内容与相关信息的关联
5. 整体记忆：将内容作为整体进行记忆

请确保相关信息丰富准确，关联关系清晰明确。`,

            19: `请使用归并记忆法帮助记忆以下内容："${content}"。

归并记忆法是把发生在同一时期或具有共同特征的内容归并在一起进行记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的归并特征和分类依据
2. 归并标准：确定内容归并的标准和原则
3. 分组整理：将内容按标准进行分组归并
4. 共性提取：提取各组内容的共同特征
5. 联想记忆：建立组间和组内的联想记忆

请确保归并标准合理，分组逻辑清晰。`,

            20: `请使用列表记忆法帮助记忆以下内容："${content}"。

列表记忆法是把所记忆的材料或事物排列成表加以对照、记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的表格化组织可能
2. 表格设计：设计清晰的表格结构和栏目
3. 信息填充：将内容信息有序填入表格
4. 对比分析：通过表格进行对比分析
5. 记忆策略：基于表格的记忆策略和技巧

请确保表格结构清晰，信息组织有序。`,

            21: `请使用干扰变刺激记忆法帮助记忆以下内容："${content}"。

干扰变刺激记忆法是在学习记忆时把本来妨碍记忆的消极因素变为刺激记忆力的诱导物的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析记忆过程中可能遇到的干扰因素
2. 干扰识别：识别和分类各种干扰因素
3. 转化策略：将干扰因素转化为记忆刺激的策略
4. 利用技巧：利用干扰因素增强记忆的具体技巧
5. 适应训练：适应和利用干扰环境的训练方法

请确保转化策略可行，利用技巧实用有效。`,

            22: `请使用感官记忆法帮助记忆以下内容："${content}"。

感官记忆法是调动多种感官来增强记忆效果的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容适合调动哪些感官
2. 感官设计：为不同感官设计相应的记忆方式
3. 多感官结合：设计多感官协同的记忆方案
4. 感官强化：强化特定感官对内容的感知
5. 综合体验：创造丰富的多感官记忆体验

请确保感官调动自然有效，多感官协同合理。`,

            23: `请使用比较记忆法帮助记忆以下内容："${content}"。

比较记忆法是通过对比相似或相反的内容来增强记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的比较要素和对比点
2. 比较对象：选择合适的比较对象
3. 对比维度：确定比较的维度和标准
4. 差异突出：突出内容与比较对象的差异
5. 记忆强化：通过对比强化记忆印象

请确保比较对象恰当，对比维度全面合理。`,

            24: `请使用归类记忆法帮助记忆以下内容："${content}"。

归类记忆法是将信息按类别进行组织和记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的分类特征和归类依据
2. 分类标准：确定科学合理的分类标准
3. 类别划分：将内容划分为不同类别
4. 类内整理：整理各类别内部的内容结构
5. 系统记忆：建立分类系统的整体记忆

请确保分类标准科学，类别划分清晰合理。`,

            25: `请使用网络记忆法帮助记忆以下内容："${content}"。

网络记忆法是建立知识点之间的网络连接来增强记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容中各要素的关联关系
2. 网络构建：构建内容要素的关联网络
3. 节点设计：设计网络中的关键节点
4. 连接强化：强化网络中的重要连接
5. 网络导航：设计在知识网络中导航的方法

请确保网络结构清晰，连接关系准确有意义。`,

            26: `请使用实践记忆法帮助记忆以下内容："${content}"。

实践记忆法是通过实际操作来加深记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的实践操作可能性
2. 实践设计：设计具体的实践操作活动
3. 操作步骤：详细说明实践操作的步骤
4. 体验强化：通过实践体验强化记忆
5. 反思总结：在实践后进行反思和总结

请确保实践活动可行，操作步骤清晰具体。`,

            27: `请使用讨论记忆法帮助记忆以下内容："${content}"。

讨论记忆法是通过讨论交流来巩固记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的讨论价值和要点
2. 讨论设计：设计有效的讨论话题和形式
3. 参与策略：制定积极参与讨论的策略
4. 观点交流：通过观点交流深化理解
5. 共识形成：在讨论中形成对内容的共识

请确保讨论话题有价值，交流方式有效。`,

            28: `请使用教学记忆法帮助记忆以下内容："${content}"。

教学记忆法是通过教授他人来强化自己记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的教学要点和难点
2. 教学设计：设计教授内容的教学方案
3. 表达练习：练习清晰表达内容的方法
4. 问题预设：预设学习者可能提出的问题
5. 教学反思：通过教学过程反思和完善理解

请确保教学设计合理，表达方式清晰易懂。`,

            29: `请使用环境记忆法帮助记忆以下内容："${content}"。

环境记忆法是利用特定环境来辅助记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容与环境的关联可能
2. 环境选择：选择有利于记忆的特定环境
3. 环境利用：充分利用环境特征辅助记忆
4. 情境创设：在环境中创设记忆情境
5. 环境回忆：利用环境线索进行内容回忆

请确保环境选择合适，环境利用充分有效。`,

            30: `请使用时间记忆法帮助记忆以下内容："${content}"。

时间记忆法是按时间顺序组织记忆内容的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的时间特征和时序关系
2. 时间轴构建：构建内容的时间轴框架
3. 时序排列：将内容按时间顺序排列
4. 时间标记：为重要内容设置时间标记
5. 时序记忆：利用时间顺序进行记忆

请确保时间轴清晰，时序关系准确。`,

            31: `请使用逻辑记忆法帮助记忆以下内容："${content}"。

逻辑记忆法是按逻辑关系组织记忆内容的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的逻辑结构和关系
2. 逻辑梳理：梳理内容的逻辑脉络
3. 关系建立：建立内容要素间的逻辑关系
4. 推理链条：构建逻辑推理链条
5. 逻辑记忆：基于逻辑关系进行记忆

请确保逻辑关系清晰，推理过程严密。`,

            32: `请使用创意记忆法帮助记忆以下内容："${content}"。

创意记忆法是发挥创造力来设计记忆方案的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的创意改造潜力
2. 创意构思：为内容设计创新的记忆方式
3. 想象发挥：充分发挥想象力创造记忆场景
4. 创新组合：创新性地组合各种记忆元素
5. 个性化设计：设计个性化的创意记忆方案

请确保创意新颖有趣，个性化设计贴合实际。`,

            33: `请使用压缩记忆法帮助记忆以下内容："${content}"。

压缩记忆法是将复杂信息压缩成简单形式的记忆方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的核心要素和冗余信息
2. 信息提取：提取最核心的关键信息
3. 压缩策略：设计信息压缩的具体策略
4. 简化表达：用最简洁的方式表达核心内容
5. 还原练习：从压缩信息还原完整内容的练习

请确保压缩合理，核心信息保留完整。`,

            34: `请使用扩展记忆法帮助记忆以下内容："${content}"。

扩展记忆法是从核心内容向外扩展记忆的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的核心和扩展要素
2. 核心确定：确定内容的核心要点
3. 扩展设计：设计从核心向外扩展的路径
4. 层次建立：建立扩展内容的层次结构
5. 渐进记忆：采用渐进式的扩展记忆方法

请确保核心突出，扩展路径清晰合理。`,

            35: `请使用循环记忆法帮助记忆以下内容："${content}"。

循环记忆法是按循环模式安排记忆复习的方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容的循环记忆特点
2. 循环设计：设计科学的循环记忆周期
3. 复习安排：安排循环复习的时间和频率
4. 强化策略：在循环中逐步强化记忆
5. 效果监控：监控循环记忆的效果并调整

请确保循环周期科学，复习安排合理有效。`,

            36: `请使用个性记忆法帮助记忆以下内容："${content}"。

个性记忆法是根据个人的学习风格、兴趣爱好和认知特点来定制专属记忆方法。

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析内容与个人特点的匹配度
2. 个性识别：识别学习者的个性特征和偏好
3. 方法定制：根据个性特点定制专属记忆方法
4. 兴趣结合：将个人兴趣融入记忆过程
5. 效果优化：根据个人反馈持续优化方法

请确保方法个性化程度高，充分发挥个人优势。`
        };

        // 如果找到对应的提示词模板，使用专用模板
        if (prompts[method.id]) {
            return prompts[method.id];
        }
        
        // 如果没有找到对应的提示词，使用方法的基本信息构建通用提示词
        const methodDesc = method.fullDesc || method.desc || '一种有效的记忆方法';
        const methodSteps = method.steps || [];
        const methodTips = method.tips || '';
        
        let stepsText = '';
        if (methodSteps.length > 0) {
            stepsText = '\n\n实施步骤：\n' + methodSteps.map((step, index) => `${index + 1}. ${step}`).join('\n');
        }
        
        let tipsText = '';
        if (methodTips) {
            tipsText = `\n\n使用要点：${methodTips}`;
        }
        
        return `请使用${method.name}帮助记忆以下内容："${content}"。

${methodDesc}${stepsText}

请按照以下格式提供详细的记忆方案：

1. 内容分析：分析要记忆内容的特点和要求
2. 方法应用：具体说明如何应用${method.name}
3. 实施步骤：提供详细的实施步骤和操作方法
4. 技巧要点：分享使用该方法的关键技巧
5. 效果评估：说明如何评估和改进记忆效果${tipsText}

请确保方法应用得当，步骤清晰可操作。`;
    }

    // 生成模拟AI响应（用于演示）
    generateMockResponse(content, method, onProgress = null) {
        const mockResponses = {
            1: `使用与物相联法记忆"${content}"：

1. 内容分析：分析要记忆内容中的关键词汇和概念
   - 识别核心概念和关键信息点
   - 确定需要重点记忆的部分

2. 物品关联：为每个关键内容找到相关的具体物品
   - 选择日常生活中常见的物品
   - 确保物品与内容有逻辑关联

3. 联系建立：说明如何将内容与物品建立生动的联系
   - 通过形状、功能、颜色等特征建立联系
   - 创造有趣的关联故事

4. 实践方法：提供具体的实施步骤
   - 制作记忆卡片或标签
   - 在实际环境中放置提示物品

5. 复习策略：利用物品进行重复记忆的方法
   - 定期接触相关物品
   - 通过物品触发内容回忆

这种方法能够将抽象内容具体化，提高记忆的持久性和准确性。`,

            2: `使用联系愉快经历法记忆"${content}"：

1. 内容分析：分析要记忆内容的情感化潜力
   - 寻找内容中的积极元素
   - 识别可以情感化的知识点

2. 愉快经历挖掘：引导回忆相关的美好经历
   - 回想与内容相关的快乐时光
   - 寻找个人经历中的相似情境

3. 情感联系：建立内容与愉快经历的情感纽带
   - 将知识点与美好回忆相连
   - 创造积极的情感关联

4. 记忆强化：通过愉快情绪增强记忆印象
   - 在愉快的心情下学习
   - 重现当时的积极情感

5. 回忆技巧：利用愉快经历触发内容回忆
   - 通过情感线索回忆内容
   - 建立情感-知识的双向联系

这种方法能够让学习变得更加愉快，提高记忆的主动性和效果。`,

            3: `使用触景生情记忆法记忆"${content}"：

1. 内容分析：分析内容与具体场景的关联可能
   - 寻找内容的空间特征
   - 识别可视化的元素

2. 场景选择：为内容选择合适的记忆场景
   - 选择熟悉且容易到达的地点
   - 确保场景与内容有关联性

3. 景物关联：将内容要点与场景中的具体景物联系
   - 利用场景中的标志性物体
   - 建立景物与知识点的对应关系

4. 情境构建：创造生动的记忆情境
   - 在特定场景中学习内容
   - 营造沉浸式的学习环境

5. 实地练习：提供在实际场景中练习的方法
   - 定期回到记忆场景复习
   - 通过场景变化加深印象

这种方法能够利用环境线索，创造强烈的记忆关联。`,

            4: `使用比喻记忆法记忆"${content}"：

1. 内容分析：分析要记忆内容的特征和属性
   - 提取内容的核心特征
   - 识别可比喻的要素

2. 比喻选择：为每个要点选择贴切的比喻对象
   - 选择生活中熟悉的事物
   - 确保比喻形象生动易懂

3. 相似性阐述：说明内容与比喻对象的相似之处
   - 详细解释相似点
   - 强化比喻的合理性

4. 比喻串联：将多个比喻组织成完整的记忆体系
   - 建立比喻间的逻辑关系
   - 形成完整的比喻网络

5. 应用练习：通过比喻进行记忆练习的方法
   - 反复练习比喻关系
   - 通过比喻回忆原内容

这种方法能够化抽象为具体，让复杂内容变得简单易记。`
        };

        // 为其他方法生成通用但个性化的响应
        const generateGenericResponse = (methodName, content) => {
            return `使用${methodName}记忆"${content}"：

1. 内容分析：深入分析要记忆内容的特点和结构
   - 识别关键信息和重点内容
   - 分析内容的逻辑关系和层次结构

2. 方法应用：运用${methodName}的核心技巧
   - 根据方法特点制定记忆策略
   - 设计具体的实施步骤

3. 记忆强化：通过多种方式巩固记忆效果
   - 采用重复练习和变化训练
   - 建立多重记忆线索

4. 实践指导：提供具体的操作建议
   - 制定详细的学习计划
   - 设计有效的练习方法

5. 效果评估：监控和调整记忆效果
   - 定期检测记忆效果
   - 根据效果调整策略

这种方法特别适合您提供的内容类型，能够显著提升记忆效率和持久性。通过系统化的应用，您将能够更好地掌握所学内容。`;
        };

        return new Promise((resolve) => {
            const fullResponse = mockResponses[method.id] || generateGenericResponse(method.name, content);
            
            // 如果有进度回调，模拟逐步显示
            if (onProgress) {
                const words = fullResponse.split('');
                let currentText = '';
                let index = 0;
                
                const interval = setInterval(() => {
                    if (index < words.length) {
                        currentText += words[index];
                        onProgress(currentText);
                        index++;
                    } else {
                        clearInterval(interval);
                        resolve(fullResponse);
                    }
                }, 10);
            } else {
                resolve(fullResponse);
            }
        });
    }

    // 保存记忆记录
    saveMemoryRecord(data) {
        const records = this.getMemoryRecords();
        const method = this.memoryMethods.find(m => m.id === data.methodId);
        
        const record = {
            id: Date.now().toString(),
            content: data.content,
            methodId: data.methodId,
            methodName: method?.name || '未知方法',
            result: data.result,
            timestamp: Date.now(),
            studyTime: data.studyTime || 0
        };

        records.push(record);
        localStorage.setItem('memoryRecords', JSON.stringify(records));
        
        return record;
    }

    // 学习统计功能已删除

    // 学习统计功能已删除，getUserStats函数已移除

    // 获取学习时长数据
    getStudyTimeData() {
        const defaultData = {
            totalTime: 0,
            daily: {},
            weeklyGoal: 2 * 60 * 60 * 1000, // 默认每日目标2小时
            sessionStartTime: Date.now()
        };
        
        try {
            const saved = localStorage.getItem('studyTimeData');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch (e) {
            return defaultData;
        }
    }

    // 更新学习时长数据
    updateStudyTimeData(sessionTime, activeTime) {
        const today = new Date().toDateString();
        const studyData = this.getStudyTimeData();
        
        // 更新今日数据
        if (!studyData.daily[today]) {
            studyData.daily[today] = {
                sessionTime: 0,
                activeTime: 0,
                sessions: 0
            };
        }
        
        studyData.daily[today].sessionTime += sessionTime;
        studyData.daily[today].activeTime += activeTime;
        studyData.daily[today].sessions += 1;
        
        // 重新计算总时长
        studyData.totalTime = Object.values(studyData.daily).reduce((sum, day) => sum + day.activeTime, 0);
        
        // 保存数据
        localStorage.setItem('studyTimeData', JSON.stringify(studyData));
        
        // 同时更新用户统计中的学习时长
        const userStats = this.getUserStats();
        userStats.totalStudyTime = studyData.totalTime;
        localStorage.setItem('userStats', JSON.stringify(userStats));
        
        return studyData;
    }

    // 获取今日学习时长
    getTodayStudyTime() {
        const today = new Date().toDateString();
        const studyData = this.getStudyTimeData();
        return studyData.daily[today]?.activeTime || 0;
    }

    // 获取本周学习时长
    getWeeklyStudyTime() {
        const studyData = this.getStudyTimeData();
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        let weeklyTime = 0;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toDateString();
            
            if (studyData.daily[dateStr]) {
                weeklyTime += studyData.daily[dateStr].activeTime;
            }
        }
        
        return weeklyTime;
    }

    // 设置每日学习目标
    setDailyStudyGoal(goalInMilliseconds) {
        const studyData = this.getStudyTimeData();
        studyData.weeklyGoal = goalInMilliseconds * 7; // 转换为周目标
        localStorage.setItem('studyTimeData', JSON.stringify(studyData));
    }

    // 获取记忆记录
    getMemoryRecords() {
        const records = localStorage.getItem('memoryRecords');
        return records ? JSON.parse(records) : [];
    }

    // 删除记忆记录
    deleteMemoryRecord(id) {
        const records = this.getMemoryRecords();
        const filteredRecords = records.filter(record => record.id !== id);
        localStorage.setItem('memoryRecords', JSON.stringify(filteredRecords));
        
        // 学习统计功能已删除
    }

    // 学习统计功能已删除

    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
        
        return date.toLocaleDateString();
    }

    // 格式化学习时间
    formatStudyTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
        if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`;
        return `${seconds}秒`;
    }

    // 停止AI生成
    stopGeneration() {
        console.log('用户请求停止AI生成');
        this.isGenerationStopped = true;
        
        // 如果有正在进行的reader，尝试取消
        if (this.currentReader) {
            try {
                this.currentReader.cancel();
                console.log('已取消流式读取');
            } catch (error) {
                console.log('取消流式读取时出错:', error);
            }
        }
        
        return true;
    }
}

// 全局实例
let memoryApp;

document.addEventListener('DOMContentLoaded', () => {
    memoryApp = new MemoryApp();
    // 将memoryApp实例添加到window对象，供iframe页面访问
    window.memoryApp = memoryApp;
});

// 全局函数供页面调用
window.navigateTo = (page, params) => {
    if (memoryApp) {
        memoryApp.navigateTo(page, params);
    }
};

window.startMemoryProcess = (content, methodId) => {
    if (memoryApp) {
        memoryApp.startMemoryProcess(content, methodId);
    }
};

window.processMemory = async (content, methodId) => {
    if (memoryApp) {
        return await memoryApp.processMemoryContent(content, methodId);
    }
};

window.getMemoryMethods = () => {
    return memoryApp ? memoryApp.getMemoryMethods() : [];
};

window.saveMemoryRecord = (data) => {
    if (memoryApp) {
        return memoryApp.saveMemoryRecord(data);
    }
};

window.getMemoryRecords = () => {
    return memoryApp ? memoryApp.getMemoryRecords() : [];
};

window.getUserStats = () => {
    return memoryApp ? memoryApp.getUserStats() : {};
};

window.deleteMemoryRecord = (id) => {
    if (memoryApp) {
        memoryApp.deleteMemoryRecord(id);
    }
};

window.formatTime = (timestamp) => {
    return memoryApp ? memoryApp.formatTime(timestamp) : '';
};

window.formatStudyTime = (milliseconds) => {
    return memoryApp ? memoryApp.formatStudyTime(milliseconds) : '';
};

window.getApiConfig = () => {
    return memoryApp ? memoryApp.apiConfig : null;
};

window.updateApiConfig = (newConfig) => {
    if (memoryApp) {
        memoryApp.updateApiConfig(newConfig);
    }
};

window.goBack = () => {
    if (memoryApp) {
        memoryApp.goBack();
    }
};

// 学习时长相关的全局函数
window.getStudyTimeData = () => {
    return memoryApp ? memoryApp.getStudyTimeData() : null;
};

window.updateStudyTimeData = (sessionTime, activeTime) => {
    return memoryApp ? memoryApp.updateStudyTimeData(sessionTime, activeTime) : null;
};

window.getTodayStudyTime = () => {
    return memoryApp ? memoryApp.getTodayStudyTime() : 0;
};

window.getWeeklyStudyTime = () => {
    return memoryApp ? memoryApp.getWeeklyStudyTime() : 0;
};

window.setDailyStudyGoal = (goalInMilliseconds) => {
    if (memoryApp) {
        return memoryApp.setDailyStudyGoal(goalInMilliseconds);
    }
};

window.stopGeneration = () => {
    if (memoryApp) {
        return memoryApp.stopGeneration();
    }
};

// 提示消息功能
window.showToast = (message, type = 'info', duration = 3000) => {
    // 移除现有的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span style="font-weight: 500; color: #0F172A;">${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // 自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, duration);
};

// 添加slideOutRight动画
if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// 页面加载动画
window.addPageLoadAnimation = () => {
    const elements = document.querySelectorAll('.fade-in-element');
    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        setTimeout(() => {
            element.style.transition = 'all 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
};