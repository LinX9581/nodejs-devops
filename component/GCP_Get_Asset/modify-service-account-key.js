import { promisify } from 'util';
import { exec as execCb } from 'child_process';
const exec = promisify(execCb);

async function createServiceAccount() {
    let yourServiceAccountName = "YOUR_SERVICE_ACCOUNT_NAME";
    let yourProjectId = "YOUR_PROJECT_ID";

    // 建立新的服務帳號
    let createServiceAccountCommand = `gcloud iam service-accounts create ${yourServiceAccountName} --description="My service account" --display-name="My Service Account" --project=${yourProjectId}`;
    let createResponse = await exec(createServiceAccountCommand);
    console.log('createResponse: ', createResponse.stdout);

    // // 為新建立的服務帳號添加GCS管理員的角色
    // let addIamPolicyCommand = `gcloud projects add-iam-policy-binding ${yourProjectId} --member="serviceAccount:${yourServiceAccountName}@${yourProjectId}.iam.gserviceaccount.com" --role="roles/storage.admin"`;
    // let addPolicyResponse = await exec(addIamPolicyCommand);
    // console.log('addPolicyResponse: ', addPolicyResponse.stdout);

    // // 創建並下載服務帳號的key，保存為JSON文件
    // let createKeyCommand = `gcloud iam service-accounts keys create ~/my-key.json --iam-account ${yourServiceAccountName}@${yourProjectId}.iam.gserviceaccount.com`;
    // let createKeyResponse = await exec(createKeyCommand);
    // console.log('createKeyResponse: ', createKeyResponse.stdout);
}

createServiceAccount().catch(console.error);