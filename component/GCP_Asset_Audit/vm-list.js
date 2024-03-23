import * as googleApis from "../../api/googleApis/gsCustom";
import { exec, spawn } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

// updateVmlistToSheet();
export async function updateVmlistToSheet(sheetId) {
  try {
    for (const projectName of Object.keys(config.stg_project)) {
      console.log("Project -> " + projectName);

      // Clear the Google Sheet for each project, and set the project
      const projectId = config.stg_project[projectName];
      await execAsync(`gcloud config set project ${config.stg_project[projectName]}`);
      await googleApis.createGsSheet(sheetId, projectName);
      await sleep(2000);
      await googleApis.clearGsSheet(sheetId, projectName + "!A1:Z");

      let vmList = await execAsync(
        `gcloud compute instances list --format="table(name,status,zone,MACHINE_TYPE,INTERNAL_IP,EXTERNAL_IP)" --sort-by status`
      );
      let vmListArray = vmList.stdout.split(/\n/);
      let eachVm = [];
      for (let i = 0; i < vmListArray.length; i++) {
        await sleep(1000);
        eachVm = vmListArray[i]
          .replace(/m /g, "m:")
          .replace(/ v/g, ":")
          .replace(/, /g, ":")
          .replace(/=,/g, "=")
          .replace(/ G/g, ":G")
          .replace(/\s+/g, ",")
          .split(",");
        await googleApis.updateGsSheet(sheetId, projectName + "!A" + (i + 1), [eachVm]);
      }
    }
    console.log("VM update complete.");
  } catch (error) {
    console.log(error);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
