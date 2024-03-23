
# GCP_Asset_Audit

## update firewall,iam,vm to google sheet
* Set key
mv config-sample.js config.js  
Set GCP IAM key, SheetID, and ProjectID into the config.js  

* Create google sheet
create google sheet and share permission to service account email

* Set SheetID Into Function
./schedule/schedule.js  
```
// updateGcpToSheet();
async function updateGcpToSheet() {
  try {
    await updateVmlistToSheet(config.sheetId.test);
    // await updateFirewallRulesToSheet(config.sheetId.test);
    // await updateIamPolicies(config.sheetId.test);
  } catch (error) {
    console.log(error);
  }
}
```

* Run
yarn install  
yarn start  