// matches the bduget name to the bduget diff from the results sheet
const BUDGET_DIFF_MATRIX = {
    'LH Performance Budget': 'G',
    'LH Accessibility Budget': 'J',
    'LH Best Practices Budget': 'M',
    'LH PWA Budget': 'P',
    'LH SEO Budget': 'S',
    'LH TTFB Budget': 'V',
    'LH FCP': 'Y',
    'LH Speed Index Budget': 'AB',
    'LH LCP Budget': 'AE',
    'LH TTI Budget': 'AH',
    'LH TBT Budget': 'AK',
    'LH CLS Budget': 'AN',
    'LH Size Budget': 'AQ',
    'LH Script Budget': 'AU',
    'LH Image Budget': 'AY',
    'LH Stylesheet Budget': 'BC',
    'LH Document Budget': 'BG',
    'LH Font Budget': 'BK',
    'LH Other Budget': 'BO',
    'LH Media Budget': 'BS',
    'LH Third-party Budget': 'BW',
    'CrUX FCP Budget': 'CC',
    'CrUX LCP Budget': 'CJ',
    'CrUX FID Budget': 'CQ',
    'CrUX CLS Budget': 'CX'
  }
  
  const getActiveBudgets = () => {
    
    const alertsSheet = SPREADSHEET.getSheetByName(ALERTS)
  
    let lastRow = alertsSheet.getMaxRows();
    const metrics = [];
  
    for(let i = 2; i < lastRow + 1; i++) {
    
      const metric = alertsSheet.getRange(`D${i}`).getValue();
  
      if (metric === '') continue;
  
      const activeStatus = alertsSheet.getRange(`E${i}`).getValue();
  
      if (activeStatus !== true) continue;
  
      metrics.push(metric);
    }
  
    return metrics;
  
  }
  
  
  const checkBudgets = () => {
  
    const activeBudgets = getActiveBudgets();
  
    const latestResults = getLatestResults();
  
    const budgetReports = []  
    latestResults.forEach(result => {
  
      const budgetReport = {};
      budgetReport.budgets = []
  
      activeBudgets.forEach(budgetLabel => {
  
        const columnIndex = letterToColumnIndex(BUDGET_DIFF_MATRIX[budgetLabel]);
        const budgetDiff = result[columnIndex - 1];
  
        // if budgetDiff is positive, don't add the budget to the report
        // only report on metrics which have exceeded their budget
        if (budgetDiff >= 0) return;
  
        budget = {
          budgetLabel: budgetLabel,
          budgetDiff: budgetDiff
        }
  
        budgetReport.budgets.push(budget)
  
      })
  
      if (budgetReport.budgets.length === 0) return;
      budgetReport.label = result[1];
      budgetReport.url = result[0];
      budgetReports.push(budgetReport)
  
    })
  
    
  
    return budgetReports;
  
  }
  
  /**
   * Latest Results
   * Returns the latest set of results using labels and the unique id
   * A previous result with a duplicate label will be ignored
   */
  function getLatestResults() {
  
      const resultsSheet = SPREADSHEET.getSheetByName(RESULTS_TAB);
  
    last_row = resultsSheet.getLastRow()
    last_column = resultsSheet.getLastColumn()
  
    const results = []
    const labels = []; // array used to limit returned results
    for (let i = last_row; i > 0; i--) {
      
      // TO DO: could this be speed up by querying the exact amount in one go somehow?
      // const label = resultsSheet.getRange(`B${i}`).getValue();
      // method getRange(row, column, optionalNumberOfRows, optionalNumberOfColumns)
      // optionalNumberOfRows: how many rows to run through
      const result = resultsSheet.getRange(i, 1, 1, last_column).getValues();
  
      const label = result[0][0];
  
      if (labels.includes(label)) break;
      labels.push(label);
      results.push(result[0]);
    }
  
    
  
    return results;
  
  }