import express from "express";
import moment from "moment";
import { exec, spawn } from "child_process";
import util from "util";
const execProm = util.promisify(exec);

let router = express.Router();
router.get("/", async function (req, res) {
  let title = "Nodejs-Template ";
  let today = new moment().format("YYYY-MM-DD HH:mm:ss");
  res.render("index", {
    today,
    title,
  });
});

const hostsMapping = config.hostsMapping;

async function restartTomcat(hostName) {
  const hostIp = hostsMapping[hostName];
  console.log(hostIp);
  if (!hostIp) {
    console.log(`No IP found for host ${hostName}`);
    return;
  }

  try {
    // await execProm(`ssh ansible@${hostIp} 'for pid in $(ps aux | grep [a]pache-tomcat | awk "{print $2}"); do kill -9 $pid; done'`);
    const result = await execProm(`ssh -o StrictHostKeyChecking=no  ansible@${hostIp} "sudo /opt/tomcat-shutdown.sh && sudo /opt/tomcat-startup.sh"`);
    return result;
  } catch (error) {
    console.log(error);
  }
}

router.post("/restartTomcat", async (req, res) => {
  try {
    let host = req.body.host;
    console.log(host);
    const result = await restartTomcat(host);
    console.log(result);
    res.send(
      JSON.stringify({
        result: result,
      })
    );
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred");
  }
});

module.exports = router;
