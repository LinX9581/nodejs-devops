import * as googleApis from "../../api/googleApis/gsCustom";
import { exec, spawn } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

// updateIamPolicies();
export async function updateIamPolicies(sheetId) {
  try {
    for (const projectName of Object.keys(config.stg_project)) {
      console.log("Project -> " + projectName);

      // Clear the Google Sheet for each project, and set the project
      const projectId = config.stg_project[projectName];
      await execAsync(`gcloud config set project ${config.stg_project[projectName]}`);
      await googleApis.createGsSheet(sheetId, projectName);
      await sleep(2000);
      await googleApis.clearGsSheet(sheetId, projectName + "!A1:Z");

      // Get project IAM Policy and update Google Sheet
      const { stdout: iamPolicy } = await execAsync(`gcloud projects get-iam-policy ${projectId} --format=json`);
      await processIamPolicy(JSON.parse(iamPolicy).bindings, projectName, sheetId);
    }
    console.log("IAM policy update complete.");
  } catch (error) {
    console.error(error);
  }
}

async function processIamPolicy(iamList, projectName, sheetId) {
  const headers = [["Role", "Member", "Account Type"]];
  let data = [];
  iamList.forEach(({ role, members }) => {
    members
      // 排除系統帳號 & GCE服務帳號
      .filter(
        (member) =>
          (!member.startsWith("serviceAccount:service-") && !/^serviceAccount:\d+.*$/.test(member)) ||
          member.includes("-compute@developer.gserviceaccount.com")
      )
      // 只取用戶帳號
      .forEach((member) => data.push([role, member, member.startsWith("serviceAccount:") ? "Service Account" : "User Account"]));
  });
  if (data.length > 0) {
    await googleApis.updateGsSheet(sheetId, `${projectName}!A1`, headers.concat(data));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
