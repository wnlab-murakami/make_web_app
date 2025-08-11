document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    const articlesContainer = document.getElementById('articles');
    const loader = document.getElementById('loader');

    // --- ローカルストレージ関連の関数 ---
    const getStoredArticles = (key) => JSON.parse(localStorage.getItem(key) || '[]');
    const setStoredArticles = (key, articles) => localStorage.setItem(key, JSON.stringify(articles));

    // --- アイコンのSVG ---
    const favoriteIcon = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    const readLaterIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`;
    const removeIcon = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

    // --- 記事カードを生成する関数 ---
    const createArticleCard = (article, pageType) => {
        const card = document.createElement('div');
        card.className = 'article-card';

        const favorites = getStoredArticles('favorites');
        const readLaters = getStoredArticles('readLaters');

        const isFavorited = favorites.some(a => a.id === article.id);
        const isReadLater = readLaters.some(a => a.id === article.id);

        card.innerHTML = `
            <div class="article-image-wrapper">
                <img src="${article.urlToImage || ''}" class="article-image" alt="" onerror="this.style.backgroundColor='#444'; this.src='';" />
                <h3>${article.title}</h3>
                <div class="card-actions">
                    ${pageType === 'favorites' ? `
                        <button class="action-btn remove-btn" data-type="favorites" title="お気に入りから削除">${removeIcon}</button>
                    ` : `
                        <button class="action-btn favorite-btn ${isFavorited ? 'is-saved' : ''}" title="お気に入りに追加">${favoriteIcon}</button>
                    `}
                    ${pageType === 'readLaters' ? `
                        <button class="action-btn remove-btn" data-type="readLaters" title="リストから削除">${removeIcon}</button>
                    ` : `
                        <button class="action-btn read-later-btn ${isReadLater ? 'is-saved' : ''}" title="後で見るに追加">${readLaterIcon}</button>
                    `}
                </div>
            </div>
        `;

        // --- イベントリスナーの設定 ---
        card.querySelector('.article-image-wrapper').addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) { // ボタン以外をクリックした場合
                window.open(article.url, '_blank');
            }
        });

        const favBtn = card.querySelector('.favorite-btn');
        if (favBtn) {
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleStorage('favorites', article, e.currentTarget);
            });
        }

        const readLaterBtn = card.querySelector('.read-later-btn');
        if (readLaterBtn) {
            readLaterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleStorage('readLaters', article, e.currentTarget);
            });
        }
        
        card.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromStorage(btn.dataset.type, article);
                card.remove(); // 画面から即時削除
            });
        });

        return card;
    };
    
    // --- ストレージ操作関数 ---
    const toggleStorage = (key, article, button) => {
        let items = getStoredArticles(key);
        const itemIndex = items.findIndex(a => a.id === article.id);

        if (itemIndex > -1) { // 既に存在すれば削除
            items.splice(itemIndex, 1);
            button.classList.remove('is-saved');
        } else { // 存在しなければ追加
            items.unshift(article); // 先頭に追加
            button.classList.add('is-saved');
        }
        setStoredArticles(key, items);
    };

    const removeFromStorage = (key, article) => {
        let items = getStoredArticles(key);
        const updatedItems = items.filter(a => a.id !== article.id);
        setStoredArticles(key, updatedItems);
    };


    // --- 記事を描画する関数 ---
    const renderArticles = (articles, pageType) => {
        if (!articlesContainer) return;
        if (articles.length === 0) {
            articlesContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted-color);">記事がありません。</p>`;
            return;
        }
        articles.forEach(article => {
            articlesContainer.appendChild(createArticleCard(article, pageType));
        });
    };

    // --- メインのAPIから記事を取得して描画する関数 ---
    const fetchAndRenderNews = async () => {
        if (!loader) return;
        loader.style.display = 'block';
        try {
            const response = await fetch('/api/news');
            if (!response.ok) throw new Error('ニュースの取得に失敗しました。');
            const articles = await response.json();
            renderArticles(articles, 'home');
        } catch (error) {
            articlesContainer.innerHTML = `<p style="color:red; text-align:center;">${error.message}</p>`;
        } finally {
            loader.style.display = 'none';
        }
    };

    // --- ページに応じて処理を分岐 ---
    if (pageId === 'page-home') {
        fetchAndRenderNews();
    } else if (pageId === 'page-favorites') {
        renderArticles(getStoredArticles('favorites'), 'favorites');
    } else if (pageId === 'page-read-later') {
        renderArticles(getStoredArticles('readLaters'), 'readLaters');
    }
});