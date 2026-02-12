import schedule from "node-schedule";
import { exec } from "child_process";
import util from "util";
const execProm = util.promisify(exec);

// 每日執行shell
schedule.scheduleJob("1 0 * * *", async function () {
  try {
    await execProm(`sh /devops/nodejs-devops/schedule/nginx_log_to_gcs.sh`);
    console.log("每日執行shell完成");
  } catch (error) {
    console.log(error);
  }
});
