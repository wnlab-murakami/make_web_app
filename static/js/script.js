// --- 記事データ取得（APIから取得） ---
function fetchArticles() {
    fetch('/api/news')
        .then(res => res.json())
        .then(data => {
            articles = data;
            renderArticles();
            showNewBadge();
        });
}

// --- 初期化 ---
fetchArticles();

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const articlesContainer = document.getElementById('articles');
    const loader = document.getElementById('loader');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // --- 状態管理のための変数 ---
    let allArticles = []; // 全記事を保持
    let isFetching = false; // API通信中のフラグ
    let currentMode = ''; // 'pc' または 'sp'

    // PC用
    const articlesPerPage = 3;
    let currentPage = 1;

    // SP用
    let loadedArticleCount = 0;
    const articlesPerLoad = 5;

    // --- 記事カードを生成する関数 ---
    function createArticleCard(article) {
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
            <h3>${article.title}</h3>
            <p>${article.description || '概要はありません。'}</p>
        `;
        card.addEventListener('click', () => {
            if (article.url) {
                // 閲覧履歴をlocalStorageに保存
                let history = JSON.parse(localStorage.getItem('history') || '[]');
                history.push({ title: article.title, description: article.description, category: article.category });
                localStorage.setItem('history', JSON.stringify(history));
                window.open(article.url, '_blank');
            }
        });
        return card;
    }

    // --- PC版：ページを描画する関数 ---
    function renderPCPage() {
        articlesContainer.innerHTML = '';
        const startIndex = (currentPage - 1) * articlesPerPage;
        const endIndex = startIndex + articlesPerPage;
        const pageArticles = allArticles.slice(startIndex, endIndex);

        pageArticles.forEach(article => {
            articlesContainer.appendChild(createArticleCard(article));
        });

        // ボタンの有効/無効を更新
        prevBtn.disabled = currentPage === 1;
        const totalPages = Math.ceil(allArticles.length / articlesPerPage);
        nextBtn.disabled = currentPage === totalPages;
    }

    // --- SP版：記事を追加で読み込む関数 ---
    function loadMoreArticlesSP() {
        const articlesToLoad = allArticles.slice(loadedArticleCount, loadedArticleCount + articlesPerLoad);
        articlesToLoad.forEach(article => {
            articlesContainer.appendChild(createArticleCard(article));
        });
        loadedArticleCount += articlesToLoad.length;

        // すべて読み込んだらローダーを隠す
        if (loadedArticleCount >= allArticles.length) {
            loader.style.display = 'none';
        }
    }

    // --- SP版：スクロールイベントの処理 ---
    const handleScroll = () => {
        // すべて読み込み済み、または読み込み中なら何もしない
        if (loadedArticleCount >= allArticles.length || isFetching) {
            return;
        }

        // 画面の底に近づいたら次の記事を読み込む
        if (window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 200) {
            isFetching = true; // 多重読み込み防止
            loader.style.display = 'block';
            setTimeout(() => { // ローダーを見せるための少しの遅延
                loadMoreArticlesSP();
                isFetching = false;
            }, 500);
        }
    };
    
    // --- モードを判定し、初期設定を行う関数 ---
    function setupMode() {
        const newMode = window.innerWidth >= 768 ? 'pc' : 'sp';

        if (newMode === currentMode) return; // モードが変わらないなら何もしない
        currentMode = newMode;
        
        // コンテナと状態をリセット
        articlesContainer.innerHTML = '';
        window.removeEventListener('scroll', handleScroll); // SP用イベントをクリア
        
        if (currentMode === 'pc') {
            currentPage = 1;
            renderPCPage();
        } else {
            loadedArticleCount = 0;
            loadMoreArticlesSP();
            window.addEventListener('scroll', handleScroll);
        }
    }

    // --- ウィンドウリサイズ時の処理 ---
    window.addEventListener('resize', setupMode);

    // --- 初期設定 ---
    setupMode();
});

// --- おすすめカテゴリ取得 ---
function getRecommendedCategory() {
    let history = JSON.parse(localStorage.getItem('history') || '[]');
    if (history.length === 0) return null;
    // カテゴリの出現回数を集計
    const counts = {};
    history.forEach(item => {
        if (item.category) {
            counts[item.category] = (counts[item.category] || 0) + 1;
        }
    });
    // 最も多いカテゴリを返す
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// script.js
async function initialize() {
    isFetching = true;
    loader.style.display = 'block';
    try {
        const recCategory = getRecommendedCategory() || 'technology';
        const response = await fetch(`/api/news?category=${encodeURIComponent(recCategory)}`);
        if (!response.ok) throw new Error('ニュースの取得に失敗しました。');
        allArticles = await response.json();
        setupMode();
    } catch (error) {
        articlesContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
    } finally {
        isFetching = false;
        loader.style.display = 'none';
    }
}