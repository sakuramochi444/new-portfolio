# mochi-portfolio

制作物、スキル、経歴をまとめたポートフォリオです。

**Live:** [mochi-portfolio.pages.dev](https://mochi-portfolio.pages.dev)

## このサイトについて

作品の一覧を置くだけでなく、どんな技術に興味を持ち、どのように試行錯誤してきたかまで伝わるサイトを目指しました。黒板に貼られたメモや写真と、それらをつなぐ一本の糸をモチーフにしています。

主な見どころは次のとおりです。

- WorksとSkillsを結ぶ、長さやたわみに揺らぎを持たせた糸の表現
- 主力・制作経験・学習中を一度に確認できる、黒板上の技術ノート表現
- 画面幅や項目数が変わっても破綻しにくいレスポンシブレイアウト
- `prefers-reduced-motion`を考慮したアニメーション
- JSONを更新して公開内容を管理できる、認証付きの編集画面
- フォームから直接送信できるお問い合わせ機能

## 使用技術

| 分野 | 技術 |
| --- | --- |
| フロントエンド | TypeScript, Vite, HTML, CSS |
| 表現・モーション | GSAP, Matter.js, Rough.js |
| ホスティング | Cloudflare Pages / Pages Functions |
| 管理者認証 | Cloudflare Access |
| コンテンツ更新 | GitHub Contents API |
| メール送信 | Resend |

## コンテンツと公開の流れ

Profile、Skills、Works、Career、Licensesは`src/data`以下のJSONで管理しています。管理画面で保存するとGitHubの`main`ブランチへコミットされ、その変更をCloudflare Pagesが自動で公開します。

```text
管理画面 → Pages Functions → GitHubのJSON更新 → Cloudflare Pagesで再ビルド
```

管理画面と管理APIはCloudflare Accessで保護し、GitHubやResendの認証情報はブラウザへ渡さず、CloudflareのSecretとして保持しています。

## ローカルで確認する

Node.js 22.12以降を使用します。

```bash
npm ci
npm run dev
```

本番用ビルドは次のコマンドで作成できます。

```bash
npm run build
```

## 作品画像を追加する

元のPNGを`public/images/works`へ追加し、`src/data/projects.json`にはPNGのパスを指定します。`npm run dev`と`npm run build`の開始時に、更新が必要な画像だけから`-480.webp`と`-960.webp`が自動生成されます。

画像変換だけを実行する場合は次のコマンドを使用します。

```bash
npm run optimize:images
```

## 主なディレクトリ

```text
src/data/       公開コンテンツのJSON
src/sections/   各セクションの表示と操作
src/components/ 糸・付箋などの表現
functions/      管理APIとお問い合わせAPI
admin/          管理画面
```

実装の詳細は、公開サイトのWorksにある「mochi-portfolio」からも確認できます。
