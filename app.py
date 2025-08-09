import requests
from flask import Flask, render_template, jsonify

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

# NewsAPIの基本設定
NEWS_API_KEY = '870c4d696af44d0ea4cef6d4a14c07bb'  # あなたのNewsAPIキー
NEWS_API_ENDPOINT = 'https://newsapi.org/v2/top-headlines'

# --- ルーティング定義 ---

# ルートURL ('/') にアクセスされたら、index.html を表示する
@app.route('/')
def index():
    return render_template('index.html')

# '/api/news' にアクセスされたら、ニュース記事を返す
@app.route('/api/news')
def get_news():
    # NewsAPIにリクエストを送る
    params = {
        'apiKey': NEWS_API_KEY,
        'country': 'jp',         # 日本のニュース
        'category': 'technology',# テクノロジーカテゴリ
        'pageSize': 20           # 最大20件
    }
    try:
        response = requests.get(NEWS_API_ENDPOINT, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        # NewsAPIの仕様に従い、statusやarticlesの存在を確認
        if data.get('status') == 'ok' and 'articles' in data:
            return jsonify(data['articles'])
        else:
            return jsonify({'error': data.get('message', 'No articles found')}), 500
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

# --- サーバーの実行 ---
if __name__ == '__main__':
    app.run(debug=True) # debug=Trueは開発モード