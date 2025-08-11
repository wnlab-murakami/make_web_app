import os
import requests
from flask import Flask, render_template, jsonify, request
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta

# .envファイルから環境変数を読み込む
load_dotenv()

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

# --- 基本設定 ---

# ログ設定
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# NewsAPIの基本設定
NEWS_API_KEY = os.getenv('NEWS_API_KEY')
NEWS_API_ENDPOINT = 'https://newsapi.org/v2/everything'

# HTTPリクエスト用のセッションを生成
session = requests.Session()

# --- エラーハンドリング ---
if not NEWS_API_KEY:
    app.logger.error("環境変数 'NEWS_API_KEY' が設定されていません。アプリケーションを停止します。")
    raise ValueError("環境変数 'NEWS_API_KEY' が設定されていません。.envファイルを確認してください。")

# --- ルーティング定義 ---

@app.route('/')
def index():
    """トップページ（index.html）を表示する"""
    return render_template('index.html')


@app.route('/api/news')
def get_news():
    """NewsAPIからニュース記事を取得してJSON形式で返す"""
    # ★修正: 研究関連キーワードに固定
    # 複数のキーワードをANDやORで組み合わせ、より専門的なニュースを検索
    # ( "機械学習" OR "AI" ) AND ( "レーダー" OR "ミリ波" ) AND "自動運転"
    query_text = '("machine learning" OR "AI") AND ("radar" OR "lidar") AND ("automotive" OR "self-driving")'
    app.logger.info(f"ニュース取得リクエストを受信しました。検索キーワード: {query_text}")

    # 'everything' エンドポイントで有効なパラメータ
    params = {
        'apiKey': NEWS_API_KEY,
        'q': query_text,
        # 'language': 'jp', # 専門用語は英語の記事が多いため、言語指定を外して英語記事も取得
        'sortBy': 'publishedAt',
        'pageSize': 30,
    }

    try:
        # NewsAPIへのリクエスト
        response = session.get(NEWS_API_ENDPOINT, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get('status') == 'ok' and 'articles' in data:
            app.logger.info(f"NewsAPIから {len(data['articles'])} 件の記事を取得しました。")
            if not data['articles']:
                app.logger.warning("APIから記事が0件で返されました。")
            return jsonify(data['articles'])
        else:
            error_message = data.get('message', 'APIから記事が見つかりませんでした。')
            app.logger.warning(f"APIからの応答が不正です: {error_message}")
            return jsonify({'error': error_message}), 502

    except requests.exceptions.Timeout:
        app.logger.error("NewsAPIへのリクエストがタイムアウトしました。")
        return jsonify({'error': 'ニュースソースへの接続がタイムアウトしました。'}), 504

    except requests.exceptions.HTTPError as http_err:
        app.logger.error(f"NewsAPIへのリクエストでHTTPエラーが発生しました: {http_err}")
        if response.status_code == 401:
            return jsonify({'error': 'APIキーが無効です。設定を確認してください。'}), 401
        if response.status_code == 400 and "missing" in response.text:
            return jsonify({'error': '検索キーワード(q)が指定されていません。'}), 400
        return jsonify({'error': f'ニュースソースでエラーが発生しました (コード: {response.status_code})'}), response.status_code

    except requests.exceptions.RequestException as e:
        app.logger.error(f"NewsAPIへのリクエストで予期せぬエラーが発生しました: {e}")
        return jsonify({'error': 'ニュースソースに接続できませんでした。ネットワーク環境を確認してください。'}), 500

# --- サーバーの実行 ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)