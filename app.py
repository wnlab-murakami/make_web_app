import requests
from flask import Flask, render_template, jsonify, request
import os
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

# NewsAPIの基本設定
NEWS_API_KEY = os.getenv('NEWS_API_KEY')
if not NEWS_API_KEY:
    raise ValueError("環境変数 'NEWS_API_KEY' が設定されていません。")
NEWS_API_ENDPOINT = 'https://newsapi.org/v2/top-headlines'

# --- ルーティング定義 ---

# ルートURL ('/') にアクセスされたら、index.html を表示する
@app.route('/')
def index():
    return render_template('index.html')

# '/api/news' にアクセスされたら、ニュース記事を返す
@app.route('/api/news')
def get_news():
    # クエリパラメータからカテゴリを取得（なければ'technology'）
    category = request.args.get('category', 'technology')
    params = {
        'apiKey': NEWS_API_KEY,
        'country': 'jp',
        'category': category,
        'pageSize': 10  # ★取得する記事数を10に設定
    }
    try:
        # timeoutを(コネクション, リード)で指定
        response = requests.get(NEWS_API_ENDPOINT, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data.get('status') == 'ok' and 'articles' in data:
            return jsonify(data['articles'])
        else:
            return jsonify({'error': data.get('message', 'No articles found')}), 500
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

# --- サーバーの実行 ---
if __name__ == '__main__':
    app.run(debug=True) # debug=Trueは開発モード