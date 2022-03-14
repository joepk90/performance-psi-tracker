# Performance PSI Tracker (Budget & Emails)
Performance Tracker using PSI API and App Script to collect reports, set budgets and send email alerts.

Based off of: https://github.com/danieltxok/performance-psi

### Main Functions (for testing):

| File | Function |
| ------ | ------ |
| helper.gs | cloneSiteSheet (required when running a whole new report) |
| helper.gs | runBatchFromQueue (generating a report) |
| checkBudgets.gs | checkBudgets (independantly check budgets)|
| sendAlerts.gs | alertUsers  (independantly send out emails) |


To Do:
- [x] Setup DataStudio Interface
- [x] Setup Spreadsheet Template
- [x] Use tick boxes for budget/email settings
- [ ] Improve Spreadksheet UI
    - [ ] Include datastudio url in email alert
    - [ ] Styles...
- [ ] Refactor code:
    - [ ] Create Matrix of items - see checkBudgets.gs file (declare cell to metrix in once place)
    - [ ] Adjust the way data is being appended - can it be controlled in a more manageable way?
- [ ] Generate report function (report on all active budget changes - positive & negative changes)
- [ ] Function to generate budgets using the pages current measurements
- [ ] HTML Emails? For reports