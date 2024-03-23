const axios = require("axios");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

const CLOUDFLARE_API_TOKEN = config.cloudflare.cf_api_token;
const CLOUDFLARE_ZONE_ID = config.cloudflare.zone_id;

async function listDnsRecords() {
  const response = await axios.get(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
  });
  return response.data.result;
}

async function importDnsRecord(resource_name, record_id) {
  // console.log(`Importing ${resource_name} with ID ${record_id}`);
  console.log(`terraform import cloudflare_record.${resource_name} ${CLOUDFLARE_ZONE_ID}/${record_id}`);
  // await execAsync(`terraform import cloudflare_record.${resource_name} ${CLOUDFLARE_ZONE_ID}/${record_id}`, {
  //   cwd: "/devops/terraform/cloufalre",
  // });
}

async function main() {
  const dnsRecords = await listDnsRecords();
  // console.log(dnsRecords);
  for (let i = 0; i < dnsRecords.length; i++) {
    const resource_name = `record_${i + 1}`;
    const record_id = dnsRecords[i].id;
    await importDnsRecord(resource_name, record_id);
  }
}

main();
