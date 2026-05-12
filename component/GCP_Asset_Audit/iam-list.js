import * as googleApis from "../../api/googleApis/gsCustom.js";
import { execFile } from "child_process";
import util from "util";
import config from "../../config.js";

const execFileAsync = util.promisify(execFile);
const ACCOUNT_TYPE_ORDER = {
  "Service Account": 0,
  "User Account": 1,
};

export async function updateIamPolicies(sheetId, projectList = config.stg_project) {
  try {
    for (const projectName of Object.keys(projectList)) {
      console.log("Project -> " + projectName);

      const projectId = projectList[projectName];
      await googleApis.createGsSheet(sheetId, projectName);
      await googleApis.clearGsSheet(sheetId, `${projectName}!A1:Z`);

      const bindings = await getIamBindings(projectId);
      const rows = buildIamRows(bindings);
      await googleApis.updateGsSheet(sheetId, `${projectName}!A1`, rows);

      console.log(`Updated ${projectName}: ${rows.length - 1} members`);
    }
    console.log("IAM policy update complete.");
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getIamBindings(projectId) {
  const { stdout } = await execFileAsync("gcloud", ["projects", "get-iam-policy", projectId, "--format=json"], {
    maxBuffer: 1024 * 1024 * 20,
  });
  return JSON.parse(stdout).bindings || [];
}

function buildIamRows(iamList) {
  const headers = [["Role", "Member", "Account Type"]];
  const data = [];

  for (const { role, members = [] } of iamList) {
    for (const member of members) {
      if (shouldSkipMember(member)) continue;
      data.push([role, member, getAccountType(member)]);
    }
  }

  data.sort(compareIamRows);
  return headers.concat(data);
}

function shouldSkipMember(member) {
  const isGoogleManagedServiceAccount = member.startsWith("serviceAccount:service-") || /^serviceAccount:\d+.*$/.test(member);
  const isComputeDefaultServiceAccount = member.includes("-compute@developer.gserviceaccount.com");

  return isGoogleManagedServiceAccount && !isComputeDefaultServiceAccount;
}

function getAccountType(member) {
  return member.startsWith("serviceAccount:") ? "Service Account" : "User Account";
}

function compareIamRows(a, b) {
  const accountTypeCompare = ACCOUNT_TYPE_ORDER[a[2]] - ACCOUNT_TYPE_ORDER[b[2]];
  if (accountTypeCompare !== 0) return accountTypeCompare;

  const memberCompare = a[1].localeCompare(b[1]);
  if (memberCompare !== 0) return memberCompare;

  return a[0].localeCompare(b[0]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const projectListName = process.argv[2] || "stg_project";
  const projectList = config[projectListName];

  if (!projectList) {
    console.error(`Project list not found: config.${projectListName}`);
    process.exit(1);
  }

  updateIamPolicies(config.sheetId.gcp_iam, projectList).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
