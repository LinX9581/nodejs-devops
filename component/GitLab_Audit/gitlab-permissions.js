import axios from "axios";
import fs from "fs";
import config from "../../config.js";
import * as googleApis from "../../api/googleApis/gsCustom.js";
import { getGsAuth } from "../../api/googleApis/googleApis.js";

const GITLAB_BASE_URL = "https://gitlab.gamania.com";
const MATRIX_SHEET_NAME = "nownews_permissions";
const OLD_RAW_SHEET_NAME = "nownews_permissions_raw";
const DEFAULT_GROUP_PATHS = [
  "nownews",
  "nownews/crawle",
  "nownews/crossroad",
  "nownews/deploy",
  "nownews/devops",
  "nownews/mediaapp",
  "nownews/newsapp",
  "nownews/nownews-ai",
  "nownews/onepage",
  "nownews/vote",
  "walkerland",
  "walkerland/walker-media",
  "walkerland/walkerland_ci",
  "walkermedia",
];

const ACCESS_LEVELS = {
  10: "Guest",
  20: "Reporter",
  30: "Developer",
  40: "Maintainer",
  50: "Owner",
};

function loadEnvFile(filePath = ".env") {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^['"]|['"]$/g, "");
    }
  }
}

function getGitlabToken() {
  loadEnvFile();
  const token = process.env.gitlab_token || process.env.GITLAB_TOKEN;
  if (!token) {
    throw new Error("Missing GitLab token. Set gitlab_token in .env.");
  }
  return token;
}

function createGitlabClient() {
  return axios.create({
    baseURL: `${GITLAB_BASE_URL}/api/v4`,
    headers: { "PRIVATE-TOKEN": getGitlabToken() },
    timeout: 30000,
  });
}

async function getAllPages(client, url, params = {}) {
  let page = 1;
  const results = [];

  while (true) {
    const response = await client.get(url, {
      params: { ...params, page, per_page: 100 },
    });

    results.push(...response.data);

    const nextPage = response.headers["x-next-page"];
    if (!nextPage) break;
    page = Number(nextPage);
  }

  return results;
}

function formatRole(accessLevel) {
  return ACCESS_LEVELS[accessLevel] || String(accessLevel || "");
}

function sortProjects(projects) {
  return projects.sort((a, b) => a.path_with_namespace.localeCompare(b.path_with_namespace));
}

function sortMembers(members) {
  return members.sort((a, b) => {
    if (b.access_level !== a.access_level) return b.access_level - a.access_level;
    return a.username.localeCompare(b.username);
  });
}

function getProjectNamespace(project) {
  return project.namespace?.full_path || project.path_with_namespace.split("/").slice(0, -1).join("/");
}

function buildMatrixRows(projects, membersByProjectId) {
  const users = new Map();

  for (const members of membersByProjectId.values()) {
    for (const member of members) {
      if (!users.has(member.username)) {
        users.set(member.username, {
          name: member.name,
          username: member.username,
          highestAccessLevel: member.access_level,
        });
      } else {
        const user = users.get(member.username);
        user.highestAccessLevel = Math.max(user.highestAccessLevel, member.access_level);
      }
    }
  }

  const sortedUsers = [...users.values()].sort((a, b) => {
    if (b.highestAccessLevel !== a.highestAccessLevel) return b.highestAccessLevel - a.highestAccessLevel;
    return a.username.localeCompare(b.username);
  });

  const rows = [["namespace", "project_id", "project", "default_branch", ...sortedUsers.map((user) => `${user.name} (${user.username})`)]];

  for (const project of projects) {
    const membersByUsername = new Map((membersByProjectId.get(project.id) || []).map((member) => [member.username, member]));
    rows.push([
      getProjectNamespace(project),
      project.id,
      project.path_with_namespace,
      project.default_branch || "",
      ...sortedUsers.map((user) => {
        const member = membersByUsername.get(user.username);
        return member ? formatRole(member.access_level) : "";
      }),
    ]);
  }

  return rows;
}

async function writeRowsToSheet(sheetId, sheetName, rows) {
  await googleApis.createGsSheet(sheetId, sheetName);
  await googleApis.clearGsSheet(sheetId, `${sheetName}!A1:ZZ`);
  await googleApis.updateGsSheet(sheetId, `${sheetName}!A1`, rows);
}

async function deleteSheetIfExists(sheetId, sheetName) {
  const gsapi = await getGsAuth();
  const spreadsheet = await gsapi.spreadsheets.get({ spreadsheetId: sheetId });
  const sheet = spreadsheet.data.sheets.find((item) => item.properties.title === sheetName);
  if (!sheet) return;

  await gsapi.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          deleteSheet: {
            sheetId: sheet.properties.sheetId,
          },
        },
      ],
    },
  });
  console.log("Sheet \"" + sheetName + "\" deleted.");
}

async function assertSpreadsheetWritable(sheetId) {
  const gsapi = await getGsAuth();
  const sheetName = "__gitlab_audit_write_check_" + Date.now();
  let tempSheetId;

  try {
    const response = await gsapi.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      resource: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      },
    });
    tempSheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;

    await googleApis.updateGsSheet(sheetId, sheetName + "!A1", [["write_check"]]);
    await googleApis.clearGsSheet(sheetId, sheetName + "!A1");
    console.log("Verified write access to spreadsheet " + sheetId + ".");
  } catch (error) {
    throw new Error(
      "Cannot write to config.sheetId.gitlab (" +
        sheetId +
        "). Share the spreadsheet with " +
        config.google.client_email +
        " as editor. " +
        error.message
    );
  } finally {
    if (tempSheetId) {
      await gsapi.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [
            {
              deleteSheet: { sheetId: tempSheetId },
            },
          ],
        },
      });
    }
  }
}

async function getProjectsByGroupPaths(client, groupPaths) {
  const projectsById = new Map();

  for (const groupPath of groupPaths) {
    let projects = [];
    try {
      projects = await getAllPages(client, `/groups/${encodeURIComponent(groupPath)}/projects`, {
        simple: true,
        order_by: "path",
        sort: "asc",
      });
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`Skipped ${groupPath}: group not found`);
        continue;
      }
      throw new Error(`Failed to fetch projects for ${groupPath}: ${error.message}`);
    }

    for (const project of projects) {
      projectsById.set(project.id, project);
    }
    console.log(`Fetched ${groupPath}: ${projects.length} projects`);
  }

  return sortProjects([...projectsById.values()]);
}

export async function updateGitlabPermissionsToSheet(groupPaths = DEFAULT_GROUP_PATHS) {
  const client = createGitlabClient();
  const sheetId = config.sheetId.gitlab;
  if (!sheetId) throw new Error("Missing config.sheetId.gitlab.");

  await assertSpreadsheetWritable(sheetId);

  const projects = await getProjectsByGroupPaths(client, groupPaths);

  const membersByProjectId = new Map();
  for (const project of projects) {
    const members = await getAllPages(client, `/projects/${project.id}/members/all`);
    membersByProjectId.set(project.id, members);
    console.log(`Fetched ${project.path_with_namespace}: ${members.length} members`);
  }

  await writeRowsToSheet(sheetId, MATRIX_SHEET_NAME, buildMatrixRows(projects, membersByProjectId));
  await deleteSheetIfExists(sheetId, OLD_RAW_SHEET_NAME);

  console.log(`GitLab permission audit updated: ${projects.length} projects`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateGitlabPermissionsToSheet(process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_GROUP_PATHS).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
