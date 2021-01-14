_Welcome to the documentation site for_
<p class='logo'>
  <img alt="logo" src="./assets/imgs/logo.svg" width="480">
</p>

[![NPM version](https://img.shields.io/npm/v/sheets-database)](https://www.npmjs.com/package/sheets-database)
[![License](https://img.shields.io/badge/license-MIT-green)](https://raw.githubusercontent.com/rahul-jha98/sheets-database/main/LICENSE)

> Library to help use a Google Sheet as a database (or CMS)


## Features
- Simple & Intuitive API
- Supports most of the simple operations needed in a database
- Multiple auth options - Service Account, OAuth, Access Token and API Key
- Provides method to reduce memory and network usage to optimize for your use case.

<!-- **Docs site -**
Full docs available at [https://rahul-jha98.github.io/sheets-database/](https://rahul-jha98.github.io/sheets-database/) -->


> 🚀 **Installation** - `npm i sheets-database --save` or `yarn add sheets-database`

## Examples
_the following examples are meant to give you an idea of just some of the things you can do_

> **IMPORTANT NOTE** - To keep the examples concise, I'm calling await [at the top level](https://v8.dev/features/top-level-await) which is not allowed by default in most versions of node. If you need to call await in a script at the root level, you must instead wrap it in an async function.


### Working with Tables
```javascript
const { SheetDatabase } = require('sheets-database');

// Initialize the Database with doc ID (long id in the sheets URL)
const db = new SheetDatabase('<the sheet ID from the url>');

// Initialize Auth
// see more available options at https://rahul-jha98.github.io/sheets-database/#/getting-started/authentication
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
- [Authentication](https://rahul-jha98.github.io/sheets-database#/getting-started/authentication)
- [SheetDatabase](https://rahul-jha98.github.io/sheets-database/#/classdocs/sheetdatabase)


### Working with Table Entries
```javascript
// add a new table
const table = await db.addTable('entries', ['name', 'age']);

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
- [Table](https://rahul-jha98.github.io/sheets-database//#/classdocs/table)

## Why?
> The library will let you worry only about the CRUD operation you wish to perfrom and handles the task of updating it to the spreadsheet internally.

Do you ever wonder if you can use Google Sheets as a no-cost database? Well, if your application deals with lot of entries and joins across tables than of course it isn't such a good idea. But if you have a **small application or a static website that needs very few dynamic content** there is no point in having a backend that deals with a database to serve those content since you could easily use a Google Sheet to store the data. You could also consider this as an option to get the frontend part's development started by using Google Sheet as a mock database while the actual backend is being built.

But the Google Sheet's API v4 is a bit awkward with confusing docs, at least to get started. Moreover, the API is not designed to use Sheets API as a database which is why you would require you to deal with the rows and columns data manually to deal with data. With such a steep learning curve to get started the prospect of using it as a database doesn't seems like a good deal. 

The library aims to remove the learning curve completely by providing methods that lets you interact with the database without worrying about the Sheets API at all. 
Moreover the API of the library is quite intuitive to get started with and provides functionalities for most of the database operations.

## Note
`sheets-database` is heavily inspired by and borrows some code from [node-google-spreadsheet](https://github.com/theoephraim/node-google-spreadsheet).

## Contributions

This module was written by [Rahul Jha](https://github.com/rahul-jha98). 

Contributions are welcome. Make sure to add relevant documentation along with code changes.
Also, since I am new to Typescript and still exploring any help in improving the code practices and conventions would be appreciated.

The docs site is generated using [docsify](https://docsify.js.org). To preview and run locally so you can make edits, install docsify_cli and run `docsify serve ./docs` in the project root folder and head to http://localhost:3000
The content lives in markdown files in the docs folder.

## License
[MIT](https://github.com/rahul-jha98/sheets-database/blob/main/LICENSE)
