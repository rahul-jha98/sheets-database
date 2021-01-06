_Welcome to the documentation site for_
<p class='logo'>
  <img alt="logo" src="./assets/imgs/logo.svg" width="580">
</p>

[![License](https://img.shields.io/badge/license-MIT-green)](https://raw.githubusercontent.com/rahul-jha98/google-sheets-db/main/LICENSE)

> Library to help use a Google Sheet as an database


## Features
- Simple & Intuitive API
- Supports most of the simple operations needed in a database
- Multiple auth options - Service Account, OAuth, Access Token and API Key
- Provides method to reduce memory and network usage to optimize for your use case.

<!-- **Docs site -**
Full docs available at [https://rahul-jha98.github.io/google-sheets-db/](https://rahul-jha98.github.io/google-sheets-db/) -->

> 🚀 **Installation** - `npm i google-sheets-db --save` or `yarn add google-sheets-db`

## Examples
_the following examples are meant to give you an idea of just some of the things you can do_

> **IMPORTANT NOTE** - To keep the examples concise, I'm calling await [at the top level](https://v8.dev/features/top-level-await) which is not allowed by default in most versions of node. If you need to call await in a script at the root level, you must instead wrap it in an async function.


### Working with Tables
```javascript
const { SheetDatabase } = require('google-sheets-db');

// Initialize the Database with doc ID (long id in the sheets URL)
const db = new SheetDatabase('<the sheet ID from the url>');

// Initialize Auth
// see more available options at https://rahul-jha98.github.io/google-sheets-db/#/getting-started/authentication
await db.useServiceAccount({
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
});

await db.sync(); // actually connecting with sheet and fetching data

// ADDING TABLES
const table1 = await db.addTable('table1', ['column1', 'column2', 'column3']);
const table2 = await db.addTable('table2', ['column1', 'column2']);

// RENAMING TABLES
await table1.rename('newTable1'); 

await db.renameTable('table2', 'newTable2');


// DELETING TABLES
await db.newTable1.drop();

await db.dropTable('newTable2');
```
More info:
- [Authentication](https://rahul-jha98.github.io//#/getting-started/authentication)
- [SheetDatabase](https://rahul-jha98.github.io/google-sheets-db//#/classdocs/sheetdatabase)


### Working with Table Entries
```javascript
// add a new table
const table = await db.addTable('entries', ['name', 'age'']);

// Insert Single Entry
await table.insertOne({'name': 'Micheal Scott', 'age': 43});

// Insert Multiple Entries
await table.insert([
  {'name': 'Jim Halpert', 'age': 30},
  ['Dwight Schrute', 35]
]);

console.log(table.getData());
/**
 * [
 *  {name: 'Micheal Scott', age: 43},
 *  {name: 'Jim Halpert', age: 30},
 *  {name: 'Dwight Schrute', age: 35}
 * ]
 */

// Update Rows
// Here we add 10 to all the rows where current age is less than 40
await table.updateRowsWhere(
  (currentData) => (currentData.age < 40),
  (data) => {
    return {age: data.age + 10}
  });

console.log(table.getData());
/**
 * [
 *  {name: 'Micheal Scott', age: 43},
 *  {name: 'Jim Halpert', age: 40},
 *  {name: 'Dwight Schrute', age: 45}
 * ]
 */

// Delete Rows
await table.deleteRowsWhere((data) => data.name === 'Micheal Scott');
console.log(table.getData());
/**
 * [
 *  {name: 'Jim Halpert', age: 40},
 *  {name: 'Dwight Schrute', age: 45}
 * ]
 */
```
More Info:
- [Table](https://rahul-jha98.github.io/google-sheets-db//#/classdocs/table)


## Contributions

This module was written by [Rahul Jha](https://github.com/rahul-jha98).

Contributions are welcome. Make sure to add relevant documentation along with code changes.
Also, since I am new to Typescript and still exploring any help in improving the code practices and conventions would be appreciated.

The docs site is generated using [docsify](https://docsify.js.org). To preview and run locally so you can make edits, install docsify_cli and run `docsify serve ./docs` in the project root folder and head to http://localhost:3000
The content lives in markdown files in the docs folder.