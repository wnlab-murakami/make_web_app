document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const articlesContainer = document.getElementById('articles');
    const loader = document.getElementById('loader');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // --- 状態管理のための変数 ---
    let allArticles = [];
    let isFetching = false;
    let currentMode = '';

    // PC用
    const articlesPerPage = 3;
    let currentPage = 1;

    // SP用
    let loadedArticleCount = 0;
    const articlesPerLoad = 5;
    
    // --- ★修正：記事カードを生成する関数 ---
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'article-card';
        
        // 画像URLがあればimgタグを生成、なければプレースホルダーや非表示も可能
        const imageUrl = article.urlToImage;
        const imageHtml = imageUrl 
            ? `<img src="${imageUrl}" class="article-image" alt="${article.title}" onerror="this.style.display='none'">` 
            : ''; // 画像がない場合は何も表示しない

        card.innerHTML = `
            ${imageHtml}
            <div class="article-content">
                <h3>${article.title}</h3>
                <p>${article.description || '概要はありません。'}</p>
            </div>
        `;
        
        if (article.url) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                let history = JSON.parse(localStorage.getItem('history') || '[]');
                if (article.category) {
                    history.push({ title: article.title, description: article.description, category: article.category });
                    localStorage.setItem('history', JSON.stringify(history));
                }
                window.open(article.url, '_blank');
            });
        }
        return card;
    }

    // --- ★修正：PC版のページを描画する関数（アニメーション対応） ---
    function renderPCPage() {
        // 1. 現在の記事をフェードアウトさせる
        articlesContainer.classList.add('is-hidden');

        // 2. アニメーションが終わるのを待ってから記事を入れ替える
        setTimeout(() => {
            articlesContainer.innerHTML = '';
            const startIndex = (currentPage - 1) * articlesPerPage;
            const endIndex = startIndex + articlesPerPage;
            const pageArticles = allArticles.slice(startIndex, endIndex);

            pageArticles.forEach(article => {
                articlesContainer.appendChild(createArticleCard(article));
            });
            
            // 3. 新しい記事をフェードインさせる
            articlesContainer.classList.remove('is-hidden');

            // ボタンの有効/無効を更新
            prevBtn.disabled = currentPage === 1;
            const totalPages = Math.ceil(allArticles.length / articlesPerPage);
            nextBtn.disabled = currentPage === totalPages;
        }, 300); // CSSのtransition時間と合わせる
    }

    // --- SP版：記事を追加で読み込む関数 ---
    function loadMoreArticlesSP() {
        const articlesToLoad = allArticles.slice(loadedArticleCount, loadedArticleCount + articlesPerLoad);
        articlesToLoad.forEach(article => {
            articlesContainer.appendChild(createArticleCard(article));
        });
        loadedArticleCount += articlesToLoad.length;
        if (loadedArticleCount >= allArticles.length) {
            loader.style.display = 'none';
        }
    }

    // --- SP版：スクロールイベントの処理 ---
    const handleScroll = () => {
        if (loadedArticleCount >= allArticles.length || isFetching) return;
        if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 200) {
            isFetching = true;
            loader.style.display = 'block';
            setTimeout(() => {
                loadMoreArticlesSP();
                isFetching = false;
            }, 500);
        }
    };
    
    // --- モードを判定し、初期設定を行う関数 ---
    function setupMode() {
        const newMode = window.innerWidth >= 768 ? 'pc' : 'sp';
        if (newMode === currentMode && allArticles.length > 0) return;
        currentMode = newMode;
        
        articlesContainer.innerHTML = '';
        window.removeEventListener('scroll', handleScroll);
        
        if (currentMode === 'pc') {
            currentPage = 1;
            renderPCPage(); // PC表示開始
        } else {
            loadedArticleCount = 0;
            loadMoreArticlesSP(); // SP表示開始
            window.addEventListener('scroll', handleScroll);
        }
    }
    
    // --- おすすめカテゴリを取得する関数 ---
    function getRecommendedCategory() {
        try {
            const history = JSON.parse(localStorage.getItem('history') || '[]');
            if (history.length === 0) return null;
            const counts = {};
            history.forEach(item => {
                if (item.category) counts[item.category] = (counts[item.category] || 0) + 1;
            });
            if (Object.keys(counts).length === 0) return null;
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        } catch (e) {
            console.error("Error reading history:", e);
            return null;
        }
    }

    // --- 初期化処理：APIから記事を取得し、画面を描画する ---
    async function initialize() {
        if (isFetching) return;
        isFetching = true;
        articlesContainer.classList.add('is-hidden'); // ★追加：初期表示もフェードイン
        loader.style.display = 'block';
        try {
            const recCategory = getRecommendedCategory() || 'technology';
            const response = await fetch(`/api/news?category=${encodeURIComponent(recCategory)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'ニュースの取得に失敗しました。');
            }
            allArticles = await response.json();
            
            if (allArticles.length === 0) {
                articlesContainer.innerHTML = `<p>表示できる記事がありません。</p>`;
            } else {
                setupMode();
            }
        } catch (error) {
            console.error('Initialization Error:', error);
            articlesContainer.innerHTML = `<p style="color: red;">エラー: ${error.message}</p>`;
        } finally {
            isFetching = false;
            loader.style.display = 'none';
        }
    }

    // --- イベントリスナーの設定 ---
    window.addEventListener('resize', setupMode);
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPCPage();
        }
    });
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allArticles.length / articlesPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderPCPage();
        }
    });

    // --- アプリケーションの開始 ---
    initialize();
});