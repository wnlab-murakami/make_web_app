import os
import requests
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
import logging

# .envファイルから環境変数を読み込む
load_dotenv()

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

# --- 基本設定 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
NEWS_API_KEY = os.getenv('NEWS_API_KEY')
NEWS_API_ENDPOINT = 'https://newsapi.org/v2/everything'
session = requests.Session()

if not NEWS_API_KEY:
    app.logger.error("環境変数 'NEWS_API_KEY' が設定されていません。")
    raise ValueError(".envファイルを確認してください。")

# --- ルーティング定義 ---

@app.route('/')
def index():
    """トップページ（ニュースフィード）"""
    return render_template('index.html')

# ★追加：お気に入りページ用のルート
@app.route('/favorites')
def favorites():
    """お気に入り一覧ページ"""
    return render_template('favorites.html')

# ★追加：後で見るページ用のルート
@app.route('/read-later')
def read_later():
    """後で見る一覧ページ"""
    return render_template('read_later.html')


@app.route('/api/news')
def get_news():
    """NewsAPIからニュース記事を取得してJSON形式で返す"""
    query_text = '("machine learning" OR "AI") AND ("radar" OR "lidar") AND ("automotive" OR "self-driving")'
    app.logger.info(f"ニュース取得リクエストを受信しました。検索キーワード: {query_text}")

    params = {
        'apiKey': NEWS_API_KEY,
        'q': query_text,
        'sortBy': 'publishedAt',
        'pageSize': 30,
    }

    try:
        response = session.get(NEWS_API_ENDPOINT, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get('status') == 'ok' and 'articles' in data:
            # ★変更：一意なIDとしてurlを付与しておく
            for article in data['articles']:
                article['id'] = article.get('url')
            app.logger.info(f"NewsAPIから {len(data['articles'])} 件の記事を取得しました。")
            return jsonify(data['articles'])
        else:
            error_message = data.get('message', 'APIから記事が見つかりませんでした。')
            app.logger.warning(f"APIからの応答が不正です: {error_message}")
            return jsonify({'error': error_message}), 502

    except requests.exceptions.RequestException as e:
        app.logger.error(f"予期せぬエラーが発生しました: {e}")
        return jsonify({'error': 'サーバーでエラーが発生しました。'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)