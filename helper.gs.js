/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Builds the main menu when opening the spreadsheet
 */
function onOpen() {
  const menuEntries = [
    {
      name: "Run tests manually",
      functionName: "runPerfTracker",
    },
  ];
  SPREADSHEET.addMenu("PerfTracker", menuEntries);
}

/**
 * Reads PSI API Key
 *
 * @return String with the API Key
 */
function getKey() {
  const sheet = SPREADSHEET.getSheetByName(HOW_TO_TAB);
  const key = sheet.getRange("A5").getValue();
  if (key === "") {
    SpreadsheetApp.getUi().alert("Please enter your API Key");
    return;
  }
  return key;
}

/**
 * Clones Sites tab to create the queue
 */
function cloneSitesSheet() {
  // Delete any previous copy
  const old = SPREADSHEET.getSheetByName(TEMP_QUEUE_TAB);
  if (old) SPREADSHEET.deleteSheet(old);
  const queue = SPREADSHEET.getSheetByName(SITES_TAB).copyTo(SPREADSHEET);
  queue.setName(TEMP_QUEUE_TAB);
  queue.hideSheet();
}

/**
 * Sets trigger to run tests from queue
 *
 * @param {integer} seconds The seconds after the current time
 */
function setTrigger(seconds) {
  ScriptApp.newTrigger("runBatchFromQueue")
    .timeBased()
    .after(seconds * 1000)
    .create();
}

/**
 * Deletes triggers by handler function
 *
 * @param {string} functionName The name of the function run by the trigger
 */
function deleteTriggers(functionName) {
  const allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    if (allTriggers[i].getHandlerFunction() == functionName) {
      ScriptApp.deleteTrigger(allTriggers[i]);
    }
  }
}

/**
 * Triggers the tests and outputs data
 */
function runBatchFromQueue() {
  // Gets batch of URLs
  const URLsettings = getURLSettings();

  // Submits the tests
  const responses = submitTests(URLsettings);

  // Outputs data
  const sheet = SPREADSHEET.getSheetByName(RESULTS_TAB);
  const today = new Date().toJSON().slice(0, 10);
  for (let i = 0; i < responses.length; i++) {

    let url = URLsettings[i][0]; // A
    let label = URLsettings[i][1]; // B
    let device = URLsettings[i][2]; // C
    const budgets = {
      LHPerfBudget: URLsettings[i][3], // D
      LHAccBudget: URLsettings[i][4], // E
      LHBPBudget: URLsettings[i][5], // F
      LHPWABudget: URLsettings[i][6], // G
      LHSEOBudget: URLsettings[i][7], // H
      LHTTFBBudget: URLsettings[i][8], // I
      LHFCPBudget: URLsettings[i][9], // J
      LHSIBudget: URLsettings[i][10], // K
      LHLCPBudget: URLsettings[i][11], // L
      LHTTIBudget: URLsettings[i][12], // M
      LHTTBTBudget: URLsettings[i][13], // N
      LHTCLSBudget: URLsettings[i][14], // O
      LHTotalBudget: URLsettings[i][15], // P
      LHScriptBudget: URLsettings[i][16], // Q
      LHImageBudget: URLsettings[i][17], // R
      LHStylesheetBudget: URLsettings[i][18], // S
      LHDocumentBudget: URLsettings[i][19], // T
      LHFontBudget: URLsettings[i][20], // U
      LHOtherBudget: URLsettings[i][21], // V
      LHMediaBudget: URLsettings[i][22], // W
      LHThirdPartyBudget: URLsettings[i][23], // X
      CrUXFCPBudget: URLsettings[i][24], // Y
      CrUXLCPBudget: URLsettings[i][25], // Z
      CrUXFIDBudget: URLsettings[i][26], // AA
      CrUXCLSBudget: URLsettings[i][27], // AB
    };

    // Pulls data
    let content = JSON.parse(responses[i].getContentText());
    if (content.error == null) {
      let results = parseResults(content, budgets);
      let resultsData = [].concat([url, label, device, today], results.data);
      sheet.appendRow(resultsData);
      let note = null;
      if (results.crux_data === false) {
        note = "Not enough CrUX data.\n\nThe CrUX Report does not have enough data for this URL or domain.";
      } else if (results.origin_fallback === true) {
        note =
          "Not enough CrUX data.\n\nThe CrUX Report does not have enough data for this URL and it fell back to showing data for the origin.";
      }
      addNote(note, null);
    } else {
      sheet.appendRow([url, label, device]);
      note = `${content.error.message}\n\nIf this error persists, investigate the cause by running the URL manually via https://developers.google.com/speed/pagespeed/insights/`;
      addNote(note, "#fdf6f6");
    }
  }
}

/**
 * Reads URL, Label and Device information and then deletes them from queue
 *
 * @return Array with all the settings for each URL
 */
function getURLSettings() {
  const sheet = SPREADSHEET.getSheetByName(TEMP_QUEUE_TAB);
  let last_column = sheet.getLastColumn() - 1;
  let last_row = sheet.getLastRow() - 1;
  if (sheet.getLastRow() > TESTS_PER_BATCH + 1) {
    last_row = TESTS_PER_BATCH;
    setTrigger(100);
    sheet.insertRowsAfter(sheet.getMaxRows(), TESTS_PER_BATCH);
  }
  const range = sheet.getRange(2, 1, last_row, last_column);
  const settings = range.getValues();
  sheet.deleteRows(2, last_row);
  return settings;
}


function getAssetArray(assetObject, budget) {

  const transferSize = assetObject["transferSize"] / 1024

  return [
    transferSize,
    budget,
    budget - transferSize,
    assetObject["requestCount"],
  ]

}

/**
 * Builds fetch URLs and submits the tests in parallel
 *
 * @param {array} settings The URL settings for all tests
 * @return Array with all the API responses
 */
function submitTests(settings) {
  // Gets, Builds & Fetches URLs (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#request)
  const key = getKey();
  const categories = "category=ACCESSIBILITY&category=BEST_PRACTICES&category=PERFORMANCE&category=PWA&category=SEO";
  const serverURLs = [];
  for (let item in settings) {
    let url = settings[item][0];
    let device = settings[item][2];
    let serverURL = {
      url: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${categories}&strategy=${device}&url=${url}&key=${key}`,
      muteHttpExceptions: true,
    };
    serverURLs.push(serverURL);
  }
  const responses = UrlFetchApp.fetchAll(serverURLs);
  return responses;
}

/**
 * Parses API response
 *
 * @param {object} content The JSON object to parse
 * @return Object with post-processed array data and two flags
 */
function parseResults(content, budgets) {
  // Initiates allResults variable
  const allResults = {
    data: null,
    crux_data: false,
    origin_fallback: false,
  };

  // Processes data (https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed#response)
  const lighthouseResult = content.lighthouseResult;
  const loadingExperience = content.loadingExperience;

  // Lighthouse Categories
  const LHPerfScore = lighthouseResult["categories"]["performance"]["score"] * 100;
  const LHAccScore = lighthouseResult["categories"]["accessibility"]["score"] * 100;
  const LHBPScore = lighthouseResult["categories"]["best-practices"]["score"] * 100;
  const LHPWAScore = lighthouseResult["categories"]["pwa"]["score"] * 100;
  const LHSEOScore = lighthouseResult["categories"]["seo"]["score"] * 100;

  const categories = [
    LHPerfScore,
    budgets.LHPerfBudget,
    budgets.LHPerfBudget - LHPerfScore,
    LHAccScore,
    budgets.LHAccBudget,
    budgets.LHAccBudget - LHAccScore,
    LHBPScore,
    budgets.LHBPBudget,
    budgets.LHBPBudget - LHBPScore,
    LHPWAScore,
    budgets.LHPWABudget,
    budgets.LHPWABudget - LHPWAScore,
    LHSEOScore,
    budgets.LHSEOBudget,
    budgets.LHSEOBudget - LHSEOScore,
  ];

  const LHTTFBScore = lighthouseResult["audits"]["server-response-time"]["numericValue"];
  const LHFCPScore = lighthouseResult["audits"]["first-contentful-paint"]["numericValue"];
  const LHSIScore = lighthouseResult["audits"]["speed-index"]["numericValue"];
  const LHLCPScore = lighthouseResult["audits"]["largest-contentful-paint"]["numericValue"];
  const LHTTIScore = lighthouseResult["audits"]["interactive"]["numericValue"];
  const LHTTBTScore = lighthouseResult["audits"]["total-blocking-time"]["numericValue"];
  const LHTCLSScore = lighthouseResult["audits"]["cumulative-layout-shift"]["numericValue"];

  // Lighthouse Metrics
  const metrics = [
    LHTTFBScore,
    budgets.LHTTFBBudget,
    budgets.LHTTFBBudget - LHTTFBScore,
    LHFCPScore,
    budgets.LHFCPBudget,
    budgets.LHFCPBudget - LHFCPScore,
    LHSIScore,
    budgets.LHSIBudget,
    budgets.LHSIBudget - LHSIScore,
    LHLCPScore,
    budgets.LHLCPBudget,
    budgets.LHLCPBudget - LHLCPScore,
    LHTTIScore,
    budgets.LHTTIBudget,
    budgets.LHTTIBudget - LHTTIScore,
    LHTTBTScore,
    budgets.LHTTBTBudget,
    budgets.LHTTBTBudget - LHTTBTScore,
    LHTCLSScore,
    budgets.LHTCLSBudget,
    budgets.LHTCLSBudget - LHTCLSScore,
  ];

  // Lighthouse Assets
  // const assets = [];
  const resources = lighthouseResult["audits"]["resource-summary"]["details"]["items"];

  

  const totalAssets = resources["total"];
  const scriptAssets = resources["script"];
  const imageAssets = resources["image"];
  const stylesheetAssets = resources["stylesheet"];
  const documentAssets = resources["document"];
  const fontAssets = resources["font"];
  const otherAssets = resources["other"];
  const mediaAssets = resources["media"];
  const thirdPartyAssets = resources["third-party"];

  const assetsList = [
    "total",
    "script",
    "image",
    "stylesheet",
    "document",
    "font",
    "other",
    "media",
    "third-party",
  ];
  let assetsObject = {};
  for (const asset in assetsList) {
    resources.forEach( (resource) => {
        if (resource.resourceType === assetsList[asset]) {
        assetsObject[resource.resourceType] = resource;
      }
    })
  }

  const assets = [
    ...getAssetArray(assetsObject["total"], budgets.LHTotalBudget),
    ...getAssetArray(assetsObject["script"], budgets.LSScriptBudget),
    ...getAssetArray(assetsObject["image"], budgets.LHImageBudget),
    ...getAssetArray(assetsObject["stylesheet"], budgets.LHStylesheetBudget),
    ...getAssetArray(assetsObject["document"], budgets.LHDocumentBudget),
    ...getAssetArray(assetsObject["font"], budgets.LHFontBudget),
    ...getAssetArray(assetsObject["other"], budgets.LHOtherBudget),
    ...getAssetArray(assetsObject["media"], budgets.LHMediaBudget),
    ...getAssetArray(assetsObject["third-party"], budgets.LHThirdPartyBudget)
  ];


  // Lighthouse Version
  const version = lighthouseResult["lighthouseVersion"];

  // CrUX
  let crux = [];
  if (loadingExperience["metrics"]) {
    allResults.crux_data = true;
    // Overall categorization
    let overall_category = loadingExperience["overall_category"];
    // FCP
    let fcp;
    if (loadingExperience["metrics"]["FIRST_CONTENTFUL_PAINT_MS"]) {

      const FCPMetric = loadingExperience["metrics"]["FIRST_CONTENTFUL_PAINT_MS"]["percentile"];

      fcp = [
        FCPMetric,
        budgets.CrUXFCPBudget,
        budgets.CrUXFCPBudget - FCPMetric,
        loadingExperience["metrics"]["FIRST_CONTENTFUL_PAINT_MS"]["category"],
        loadingExperience["metrics"]["FIRST_CONTENTFUL_PAINT_MS"]["distributions"][0]["proportion"],
        loadingExperience["metrics"]["FIRST_CONTENTFUL_PAINT_MS"]["distributions"][1]["proportion"],
        loadingExperience["metrics"]["FIRST_CONTENTFUL_PAINT_MS"]["distributions"][2]["proportion"],
      ];
    } else {
      fcp = [, , , , ,];
    }
    // LCP
    let lcp;
    if (loadingExperience["metrics"]["LARGEST_CONTENTFUL_PAINT_MS"]) {

      const LCPMetric = loadingExperience["metrics"]["LARGEST_CONTENTFUL_PAINT_MS"]["percentile"];

      lcp = [
        LCPMetric,
        budgets.CrUXLCPBudget,
        budgets.CrUXLCPBudget - LCPMetric,
        loadingExperience["metrics"]["LARGEST_CONTENTFUL_PAINT_MS"]["category"],
        loadingExperience["metrics"]["LARGEST_CONTENTFUL_PAINT_MS"]["distributions"][0]["proportion"],
        loadingExperience["metrics"]["LARGEST_CONTENTFUL_PAINT_MS"]["distributions"][1]["proportion"],
        loadingExperience["metrics"]["LARGEST_CONTENTFUL_PAINT_MS"]["distributions"][2]["proportion"],
      ];
    } else {
      lcp = [, , , , ,];
    }
    // FID
    let fid;
    if (loadingExperience["metrics"]["FIRST_INPUT_DELAY_MS"]) {

      const FIDMetric = loadingExperience["metrics"]["FIRST_INPUT_DELAY_MS"]["percentile"];

      fid = [
        FIDMetric,
        budgets.CrUXFIDBudget,
        budgets.CrUXFIDBudget - FIDMetric,
        loadingExperience["metrics"]["FIRST_INPUT_DELAY_MS"]["category"],
        loadingExperience["metrics"]["FIRST_INPUT_DELAY_MS"]["distributions"][0]["proportion"],
        loadingExperience["metrics"]["FIRST_INPUT_DELAY_MS"]["distributions"][1]["proportion"],
        loadingExperience["metrics"]["FIRST_INPUT_DELAY_MS"]["distributions"][2]["proportion"],
      ];
    } else {
      fid = [, , , , ,];
    }
    // CLS
    let cls;
    if (loadingExperience["metrics"]["CUMULATIVE_LAYOUT_SHIFT_SCORE"]) {

      const CLSMetric = loadingExperience["metrics"]["CUMULATIVE_LAYOUT_SHIFT_SCORE"]["percentile"] / 100;

      cls = [
        CLSMetric,
        budgets.CrUXCLSBudget,
        budgets.CrUXCLSBudget - CLSMetric,
        loadingExperience["metrics"]["CUMULATIVE_LAYOUT_SHIFT_SCORE"]["category"],
        loadingExperience["metrics"]["CUMULATIVE_LAYOUT_SHIFT_SCORE"]["distributions"][0]["proportion"],
        loadingExperience["metrics"]["CUMULATIVE_LAYOUT_SHIFT_SCORE"]["distributions"][1]["proportion"],
        loadingExperience["metrics"]["CUMULATIVE_LAYOUT_SHIFT_SCORE"]["distributions"][2]["proportion"],
      ];
    } else {
      cls = [, , , , ,];
    }
    // Checks if data falls back to domain
    // If not sufficient field data for the page, the API responds with Origin Field Data and origin_fallback = true
    if (loadingExperience["origin_fallback"]) {
      allResults.origin_fallback = true;
    }
    crux.push(overall_category, fcp, lcp, fid, cls);
  }

  // Puts all data together and returns
  allResults.data = [].concat(categories, metrics, assets, version, ...crux);
  return allResults;
}

/**
 * Adds info note to row
 *
 * @param {string} note The note
 * @param {string} formatColor The color
 */
function addNote(note, formatColor) {
  const sheet = SPREADSHEET.getSheetByName(RESULTS_TAB);
  const lastRow = sheet.getLastRow();
  sheet.getRange(`${lastRow}:${lastRow}`).setBackground(formatColor);
  if (note != null) {
    sheet.getRange(`D${lastRow}`).setNote(note);
  }
}
