// spreadsheets
const ALERTS = 'Alerts';
// const HOW_TO_TAB = 'How to Use' // duplication

/**
 * send alart
 */
function sendEmailAlert(user, message) {

  if (!user.email || !message) return;

  var subject = 'PSI Performance Tracker: Some of your PSI budgets have been exceeded!'; // make configurable option?
  MailApp.sendEmail(user.email, subject, message);
}

/**
 * get active users
 */
const getUsers = () => {
  
  const alertsSheet = SPREADSHEET.getSheetByName(ALERTS)

  let lastRow = alertsSheet.getMaxRows();
  const users = [];

  for(let i = 2; i < lastRow + 1; i++) {
  
    const email = alertsSheet.getRange(`A${i}`).getValue();

    if (email === '') continue;

    const activeStatus = alertsSheet.getRange(`B${i}`).getValue();

    if (activeStatus !== true) continue;

    const user = {};
    user.email = email
    // user.activeStatus = activeStatus
    users.push(user)
  }

  return users;

}

const generateAlertMessage = (exceededBudgetReports) => {

  if (exceededBudgetReports.length === 0) return;

  let message = `The following budgets have been exceeded:`;

  exceededBudgetReports.forEach(exceededBudgetReport => {

    message += `

    Label: ${exceededBudgetReport.label}
    URL: ${exceededBudgetReport.url}
    `;

    exceededBudgetReport.budgets.forEach((budget) => {

      message += `
      - Budget: ${budget.budgetLabel}: ${budget.budgetDiff}
      `;
    })
  })

  return message

}

const alertUsers = () => {

  const exceededBudgets = checkBudgets();

  if (exceededBudgets.length === 0) return;

  const users = getUsers();

  const message = generateAlertMessage(exceededBudgets);

  users.map(user => {
    sendEmailAlert(user, message)
  })
  
}