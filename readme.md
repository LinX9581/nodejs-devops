# nodejs-devops

簡易盤點工具，將 GitLab 專案權限與 GCP VM/IAM/Firewall 資訊寫入 Google Sheet。

## 安裝

```bash
npm install
```

## 設定

1. 建立 `config.js`

```bash
cp config-sample.js config.js
```

2. 在 `config.js` 設定 Google Sheets service account 與 Sheet ID：

- `google.client_email`
- `google.private_key`
- `sheetId.gitlab`
- `sheetId.gcp_all_vm_details`
- `sheetId.gcp_iam`
- `sheetId.gcp_firewall`
- `stg_project` 或 `prod_project`

3. 將 Google Sheet 分享給 `google.client_email`。

4. 設定 GitLab token：

```bash
echo "gitlab_token=YOUR_TOKEN" > .env
```

5. 確認本機 gcloud 已登入有權限的帳號：

```bash
gcloud auth list
```

## GitLab 權限盤點

將 GitLab 專案成員權限寫入 `config.sheetId.gitlab`。

```bash
npm run gitlab:audit
```

輸出 worksheet：

- `nownews_permissions`

## GCP VM 盤點

預設使用 `config.stg_project`，寫入 `config.sheetId.gcp_all_vm_details`。

```bash
npm run gcp:vm
```

指定其他 project list：

```bash
npm run gcp:vm -- prod_project
```

## GCP IAM 盤點

預設使用 `config.stg_project`，寫入 `config.sheetId.gcp_iam`。

```bash
npm run gcp:iam
```

指定其他 project list：

```bash
npm run gcp:iam -- prod_project
```

IAM worksheet 會保留手填的 `用途` 欄位。重跑時會用 `Role + Member` 對應回原本用途，新增 IAM 的用途會留空。

## GCP Firewall 盤點

預設使用 `config.stg_project`，寫入 `config.sheetId.gcp_firewall`。

```bash
npm run gcp:firewall
```

指定其他 project list：

```bash
npm run gcp:firewall -- prod_project
```
