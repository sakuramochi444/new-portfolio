# Cloudflare / GitHub 公開設定

このプロジェクトは `sakuramochi444/new-portfolio` の `main` ブランチを公開元として使います。通常ページは静的配信し、`/api/contact` と `/api/admin/content` は Cloudflare Pages Functions で動作します。

## 1. GitHubリポジトリ

1. GitHubで `sakuramochi444/new-portfolio` を作成します。
2. 現在のローカル接続先は `sakuramochi444/renew` なので、新規リポジトリ作成後に変更してpushします。

   ```powershell
   git remote set-url origin https://github.com/sakuramochi444/new-portfolio.git
   git push -u origin main
   ```

3. Cloudflare Workers & PagesでPagesプロジェクトを作り、このリポジトリを接続します。
4. ビルドコマンドは `npm run build`、出力先は `dist`、Productionブランチは `main` にします。
5. PagesのGit連携がビルド後のアップロードまで自動で行うため、Deploy commandは設定しません。

管理画面が作成したコミットによって、新しいProductionビルドが自動で始まります。

### `wrangler deploy`で失敗する場合

ログに `Executing user deploy command: npx wrangler deploy` と表示される場合は、
PagesではなくWorkersのGitビルドとして作成されているか、不要なDeploy commandが
設定されています。CloudflareでPagesプロジェクトとして作成し直し、上記の
Build commandと出力先だけを設定してください。

Direct Upload方式を意図的に選ぶ場合だけ、Workers用の `wrangler deploy` ではなく
`npx wrangler pages deploy dist --project-name mochi-portfolio --branch main` を使用します。

## 2. Cloudflare Access

Cloudflare Zero Trustで、次の2パスを含むSelf-hosted Access Applicationを1つ作成します。

- `https://YOUR_DOMAIN/admin*`
- `https://YOUR_DOMAIN/api/admin/*`

Allowポリシーには `tomo.sakuramochi444@gmail.com` だけを指定します。管理者が1人ならメールのワンタイムPINで構いません。

Application Audience（AUD）を控えてください。管理APIはAccess JWTの署名、発行元、AUD、有効期限、管理者メールアドレスを毎回検証します。

## 3. GitHubトークン

Fine-grained personal access tokenを次の権限で作成します。

- Repository access: `sakuramochi444/new-portfolio` のみ
- Repository permission: Contents — Read and write
- Expiration: 定期更新できる短めの期間

トークンをソースコードや公開環境変数には保存しないでください。

## 4. Cloudflareのシークレット

Pagesプロジェクトの Settings > Variables and Secrets で、Production用の暗号化シークレットとして次を追加します。

- `GITHUB_TOKEN`: GitHubのFine-grained token
- `CF_ACCESS_TEAM_DOMAIN`: `https://YOUR_TEAM.cloudflareaccess.com`
- `CF_ACCESS_AUD`: 管理用Access ApplicationのAUD
- `RESEND_API_KEY`: ResendのAPIキー
- `CONTACT_FROM`: 認証済み送信元（例: `Portfolio <contact@example.com>`）
- `TURNSTILE_SECRET_KEY`: TurnstileウィジェットのSecret key

通常の環境変数として、ProductionとPreviewの両方に次を追加します。この値は公開されるサイトキーなのでSecretにする必要はありません。

- `VITE_TURNSTILE_SITE_KEY`: TurnstileウィジェットのSite key

リポジトリ名や送信先メールなどの非機密値は `wrangler.jsonc` に設定済みです。ローカルで試す場合は `.dev.vars.example` を `.dev.vars` にコピーして値を設定します。`.dev.vars` はコミットしないでください。

## 5. メール送信

1. Resendで送信用ドメインを追加して認証します。
2. APIキーをCloudflareの `RESEND_API_KEY` に保存します。
3. `CONTACT_FROM` に認証済みドメインのアドレスを指定します。

フォームは `/api/contact` 経由で送信します。APIキーはブラウザへ渡らず、返信先には訪問者が入力したアドレスが設定されます。

### スパム対策

1. Cloudflare DashboardのTurnstileでウィジェットを作成し、公開中の正確なPagesホスト名（例: `mochi-portfolio.pages.dev`）を許可します。`https://`、パス、`*` は入力しません。
2. 発行されたSite keyを `VITE_TURNSTILE_SITE_KEY`、Secret keyを `TURNSTILE_SECRET_KEY` として上記の手順で登録します。
3. Workers KVで `CONTACT_RATE_LIMIT` 用のKV namespaceを作成し、発行されたNamespace IDを控えます。
4. このプロジェクトはBindingをWrangler設定で管理しているため、DashboardのAddボタンではなく `wrangler.jsonc` に次を追加します。

   ```jsonc
   "kv_namespaces": [
     {
       "binding": "CONTACT_RATE_LIMIT",
       "id": "発行されたNamespace ID"
     }
   ]
   ```

5. 設定ファイルを反映したProductionデプロイを実行します。PreviewをProductionと分離する場合は、Preview用namespaceを別に作成して `env.preview.kv_namespaces` で上書きします。

TurnstileのトークンはPages Functionで検証します。さらに、同じ送信元からの送信を1分に1回へ制限し、32 KiBを超えるリクエストと別サイトからのブラウザ送信を拒否します。TurnstileまたはKVが未設定の場合は、安全のためメールを送信しません。

## 6. 管理画面

`https://YOUR_DOMAIN/admin/` を開いてCloudflare Accessで認証します。5種類のJSONから対象を選び、「保存して公開」を押すと入力検証後に `main` へ直接コミットされ、Cloudflareのデプロイが始まります。

読み込み後に同じファイルが更新されていた場合は上書きせず競合として停止するため、再読み込みしてから編集し直してください。
