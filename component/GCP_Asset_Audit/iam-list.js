import * as googleApis from "../../api/googleApis/gsCustom.js";
import { getGsAuth } from "../../api/googleApis/googleApis.js";
import { execFile } from "child_process";
import util from "util";
import config from "../../config.js";

const execFileAsync = util.promisify(execFile);
const ACCOUNT_TYPE_ORDER = {
  "Service Account": 0,
  "User Account": 1,
};
const NOTE_COLUMN_NAME = "用途";

export async function updateIamPolicies(sheetId, projectList = config.stg_project) {
  try {
    const existingNotesByProject = await getExistingNotesByProject(sheetId);

    for (const projectName of Object.keys(projectList)) {
      console.log("Project -> " + projectName);

      const projectId = projectList[projectName];
      await googleApis.createGsSheet(sheetId, projectName);
      const noteByIamKey = existingNotesByProject.get(projectName) || new Map();
      await googleApis.clearGsSheet(sheetId, `${projectName}!A1:Z`);

      const bindings = await getIamBindings(projectId);
      const rows = buildIamRows(bindings, noteByIamKey);
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

async function getExistingNotesByProject(sheetId) {
  const gsapi = await getGsAuth();
  const spreadsheet = await gsapi.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title",
  });
  const sheetNames = spreadsheet.data.sheets.map((sheet) => sheet.properties.title);
  if (sheetNames.length === 0) return new Map();

  const response = await gsapi.spreadsheets.values.batchGet({
    spreadsheetId: sheetId,
    ranges: sheetNames.map((sheetName) => `${sheetName}!A1:Z`),
  });

  const notesByProject = new Map();
  for (const valueRange of response.data.valueRanges || []) {
    const projectName = valueRange.range.split("!")[0].replace(/^'|'$/g, "");
    const noteByIamKey = buildNoteMap(valueRange.values || []);
    if (noteByIamKey.size > 0) notesByProject.set(projectName, noteByIamKey);
  }

  console.log(`Loaded IAM usage notes from ${notesByProject.size} sheets`);
  return notesByProject;
}

function buildNoteMap(rows) {
  if (rows.length === 0) return new Map();

  const headers = rows[0];
  const roleIndex = headers.indexOf("Role");
  const memberIndex = headers.indexOf("Member");
  const noteIndex = headers.indexOf(NOTE_COLUMN_NAME);
  if (roleIndex === -1 || memberIndex === -1 || noteIndex === -1) return new Map();

  const noteByIamKey = new Map();
  for (const row of rows.slice(1)) {
    const role = row[roleIndex];
    const member = row[memberIndex];
    const note = row[noteIndex];
    if (!role || !member || !note) continue;
    noteByIamKey.set(getIamKey(role, member), note);
  }

  return noteByIamKey;
}

function buildIamRows(iamList, noteByIamKey = new Map()) {
  const headers = [["Role", "Member", "Account Type", NOTE_COLUMN_NAME]];
  const data = [];

  for (const { role, members = [] } of iamList) {
    for (const member of members) {
      if (shouldSkipMember(member)) continue;
      data.push([role, member, getAccountType(member), noteByIamKey.get(getIamKey(role, member)) || ""]);
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

function getIamKey(role, member) {
  return `${role}||${member}`;
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
