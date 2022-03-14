// spreadsheets
const ALERTS = 'Alerts';
// const HOW_TO_TAB = 'How to Use' // duplication

/**
 * send alart
 */
function sendEmailAlert(user) {

  if (!user.email) return;

  var message = 'This is your Alert email!'; // Second column
  var subject = 'Your Google Spreadsheet Alert';
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

const alertUsers = () => {

  // const exceededBudgets = getBudgetAlerts();
  // if (isEmpty(exceededBudgets)) return;

  const users = getUsers();

  users.map(user => {
    sendEmailAlert(user)
  })
  
}