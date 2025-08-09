// --- 記事データ取得（APIから取得する場合はfetchを利用） ---
let articles = [];
const articlesContainer = document.getElementById('articles');
const showMoreBtn = document.getElementById('showMoreBtn');
const initialCount = 9;

// お気に入り保存用
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// --- 記事の描画 ---
function renderArticles(list = articles) {
    articlesContainer.innerHTML = '';
    list.forEach((article, idx) => {
        const card = document.createElement('div');
        card.className = 'article-card' + (idx >= initialCount ? ' hidden' : '');
        card.innerHTML = `
            <h3>${article.title}</h3>
            <p>${article.description || ''}</p>
            <div class="card-actions">
                <button class="fav-btn">${isFavorite(article) ? '★' : '☆'}</button>
                <button class="share-btn">シェア</button>
                <button class="summary-btn">要約</button>
            </div>
        `;
        // 記事クリックでページ移動
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('fav-btn') &&
                !e.target.classList.contains('share-btn') &&
                !e.target.classList.contains('summary-btn')) {
                if (article.url && article.url !== "#") {
                    window.open(article.url, '_blank');
                }
            }
        });
        // お気に入りボタン
        card.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(article);
            renderArticles(list);
        });
        // シェアボタン
        card.querySelector('.share-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            shareArticle(article);
        });
        // 要約ボタン
        card.querySelector('.summary-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showSummary(card, article);
        });
        articlesContainer.appendChild(card);
    });
}

// --- お気に入り管理 ---
function isFavorite(article) {
    return favorites.some(fav => fav.url === article.url);
}
function toggleFavorite(article) {
    if (isFavorite(article)) {
        favorites = favorites.filter(fav => fav.url !== article.url);
    } else {
        favorites.push(article);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// --- シェア機能 ---
function shareArticle(article) {
    const shareUrl = article.url || location.href;
    if (navigator.share) {
        navigator.share({
            title: article.title,
            text: article.description,
            url: shareUrl
        });
    } else {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
    }
}

// --- 要約機能（ダミー） ---
function showSummary(card, article) {
    let summary = article.description ? article.description.slice(0, 50) + '...' : '要約できません';
    let summaryDiv = card.querySelector('.summary');
    if (!summaryDiv) {
        summaryDiv = document.createElement('div');
        summaryDiv.className = 'summary';
        summaryDiv.style.marginTop = '8px';
        summaryDiv.style.color = '#aaf';
        card.appendChild(summaryDiv);
    }
    summaryDiv.textContent = summary;
}

// --- もっと見る ---
showMoreBtn.addEventListener('click', () => {
    document.querySelectorAll('.article-card.hidden').forEach(card => {
        card.classList.remove('hidden');
    });
    showMoreBtn.style.display = 'none';
});

// --- 検索・フィルター ---
const searchBox = document.createElement('input');
searchBox.type = 'text';
searchBox.placeholder = 'キーワード検索';
searchBox.className = 'search-box';
document.body.insertBefore(searchBox, articlesContainer);

searchBox.addEventListener('input', () => {
    const keyword = searchBox.value.trim().toLowerCase();
    const filtered = articles.filter(a =>
        (a.title && a.title.toLowerCase().includes(keyword)) ||
        (a.description && a.description.toLowerCase().includes(keyword))
    );
    renderArticles(filtered);
    if (filtered.length > initialCount) {
        showMoreBtn.style.display = '';
    } else {
        showMoreBtn.style.display = 'none';
    }
});

// --- お気に入り表示ボタン ---
const favBtn = document.createElement('button');
favBtn.textContent = 'お気に入り一覧';
favBtn.className = 'show-more-btn';
favBtn.style.marginTop = '0';
favBtn.style.background = '#444';
favBtn.style.color = '#ffd700';
document.body.insertBefore(favBtn, searchBox);

let showingFavorites = false;
favBtn.addEventListener('click', () => {
    if (!showingFavorites) {
        renderArticles(favorites);
        favBtn.textContent = '全記事に戻る';
        showMoreBtn.style.display = 'none';
        showingFavorites = true;
    } else {
        renderArticles();
        favBtn.textContent = 'お気に入り一覧';
        if (articles.length > initialCount) showMoreBtn.style.display = '';
        showingFavorites = false;
    }
});

// --- テーマ切り替え ---
const themeBtn = document.createElement('button');
themeBtn.textContent = 'テーマ切替';
themeBtn.className = 'show-more-btn';
themeBtn.style.marginTop = '0';
themeBtn.style.background = '#232526';
themeBtn.style.color = '#fff';
document.body.insertBefore(themeBtn, favBtn);

themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    if (document.body.classList.contains('light-theme')) {
        themeBtn.textContent = 'ダークテーマ';
    } else {
        themeBtn.textContent = 'ライトテーマ';
    }
});

// --- 新着通知（ダミー） ---
function showNewBadge() {
    let badge = document.getElementById('new-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'new-badge';
        badge.textContent = '新着!';
        badge.style.background = '#ff4081';
        badge.style.color = '#fff';
        badge.style.padding = '2px 8px';
        badge.style.borderRadius = '12px';
        badge.style.marginLeft = '8px';
        badge.style.fontSize = '0.9rem';
        document.querySelector('h1').appendChild(badge);
    }
    setTimeout(() => badge.remove(), 4000);
}

// --- 記事データ取得（APIから取得） ---
function fetchArticles() {
    fetch('/api/news')
        .then(res => res.json())
        .then(data => {
            articles = data;
            renderArticles();
            if (articles.length > initialCount) showMoreBtn.style.display = '';
            else showMoreBtn.style.display = 'none';
            showNewBadge();
        });
}

// --- 初期化 ---
fetchArticles();