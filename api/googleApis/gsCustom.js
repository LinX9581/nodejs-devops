import { getGsAuth } from "./googleApis";

async function updateGsSheet(sheetId, range, values) {
  const gsapi = await getGsAuth();
  const updateOptions = {
    spreadsheetId: sheetId,
    range: range,
    valueInputOption: "USER_ENTERED",
    resource: { values: values },
  };
  await gsapi.spreadsheets.values.update(updateOptions);
}

async function deleteGsSheet(sheetId) {
  const gsapi = await getGsAuth();
  const createOpt = {
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          deleteSheet: {
            sheetId: sheetId,
          },
        },
      ],
    },
  };
  gsapi.spreadsheets.batchUpdate(createOpt, (err) => {
    console.log("sheet was delete");
    if (err) {
      console.log(err);
    }
  });
}

async function createGsSheet(sheetId, workName) {
  const gsapi = await getGsAuth();
  // 獲取現有工作表的列表
  const spreadsheet = await gsapi.spreadsheets.get({
    spreadsheetId: sheetId,
  });
  const sheetTitles = spreadsheet.data.sheets.map((sheet) => sheet.properties.title);

  // 檢查工作表是否存在
  if (sheetTitles.includes(workName)) {
    console.log(`Sheet "${workName}" already exists.`);
    return;
  }

  const createOpt = {
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: {
              sheetId: Math.floor(Math.random() * 5),
              title: workName,
            },
          },
        },
      ],
    },
  };
  gsapi.spreadsheets.batchUpdate(createOpt, (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`Sheet "${workName}" created successfully.`);
    }
  });
}

async function clearGsSheet(sheetId, range) {
  const gsapi = await getGsAuth();
  const clearOptions = {
    spreadsheetId: sheetId,
    range: range,
  };
  await gsapi.spreadsheets.values.clear(clearOptions);
}

export { createGsSheet, deleteGsSheet, updateGsSheet, clearGsSheet };
