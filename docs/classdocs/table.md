_Class Documentation_

# Table

> **Represents each Table in the Database (i.e. each Worksheet in Google Sheet Document)**
  <br>
  It exposes method to read and manipulate data of the table.

## Properties
When you load the data of the table the following read only properties are populated. 

### Basic Properties
Property|Type|Description
---|---|---
`name`|string|Name of the Table <br/>_Also referred as `title`_
`index`|number<br>_int >= 0_|Index of the sheet in Document
`sheetId`|number|Id of the sheet being used as table
`rowCount`|number<br>_int >=1_|number of rows in the sheet
`columnCount`|number<br>_int >= 1_|number of columns in the sheet

### Properties related to entries
Property|Type|Description
---|---|---
`length`|number|Number of entries in the table
`columnNames`|Array.< string >|List of column names in the table
`data`|Array.< Object >|returns value of [`getData()`](#method-getData)


## Methods

### Setting the Column Names

#### `loadColumnNames(enforceHeaders)` (async) :id=method-loadColumnNames
> Loads the first row of the sheet (Which is used to save column names) <br> _usually do not need to call this directly_

Param|Type|Required|Description
---|---|---|---
`enforceHeaders`|boolean|-<br>_default = false_|If true an error is thrown if header row is empty

- ✨ **Side effects** - `table.columnNames` is populated

#### `setColumnNames(headerValues, shrinkTable)` (async) :id=method-setColumnNames
> Set the column names of the table (first row of the sheet)

Param|Type|Required|Description
---|---|---|---
`headerValues`|Array.< string >|✅|Array of string to set as column names
`shrinkTable`|boolean|-<br>_default = false_|Pass true if you want to delete the extra columns in sheet <br>_(Recommended to set true)_

- ✨ **Side effects** - the first row of sheet is updates and `table.columnNames` is set to new value


### Reading Table Entries 

#### `getData()` :id=method-getData
> Get array of objects with row values keyed by column names


- ↩️ **Returns** - Array< Object > of entries stored in table **[ { columnName : value1 }, { columnName : value2 } ]**

#### `getDataArray()` :id=method-getDataArray
> Get the 2D array of entries as stored in the sheet

- ↩️ **Returns** - 2D Array of entries stored in table (all rows except header row)

#### `getRow(idx)` :id=method-getRow
> Get Object for entry at particular index

- ↩️ **Returns** - Object for entry at given index **{ col1: value1, col2: value2 }**

### Inserting Table Entries

> The entries of table can be one of the following :- **string, number, boolean, null, undefined**

Unlike delete and update which requires you to fetch the data atleast once inserting can be done without ever fetching the data from the sheet.
By default, after every insert the table data is fetched again. But passing false for the refetch parameter will skip fetching data. But then it is your responsibilty to call `reload()` before any other operation is performed.

#### `insertOne(rowValue, refetch)` (async) :id=method-insertOne
> Append one row of data to the table

Param|Type|Required|Description
---|---|---|---
`rowValue`<br>_option 1_|Object|✅|Object of entries, keys are based on the columnNames<br>_ex: `{ col1: 'val1', col2: 'val2', ... }`_
`rowValue`<br>_option 2_|Array|✅|Array of entries in order from first column onwards<br>_ex: `['val1', 'val2', ...]`_
`refetch`|boolean|-|If false the updated table is not fetched.<br>_default = true_

- ✨ **Side effects** - entry is added to the table

#### `insertMany(rowValueArray, refetch)` (async) :id=method-insertMany
> Append multiple entries to the table at once

Param|Type|Required|Description
---|---|---|---
`rowValueArray`|Array.< rowValue >|✅|Array of rows values to append to the table<br>_see [`table.insertOne()`](#method-insertOne) above for more info_
`refetch`|boolean|-|If false the updated table is not fetched.<br>_default = true_

- ✨ **Side effects** - entries are added to the table


#### `insert(data, refetch)` (async) :id=method-insert
> Depending on passed data executes one of `insertOne()` or `insertMany()`

Param|Type|Required|Description
---|---|---|---
`data`|rowValue <br>_or_<br> Array.< rowValue >|✅|Rows value or array of row values to append to the table<br>_see [`table.insertOne()`](#method-insertOne) above for more info_
`refetch`|boolean|-|If false the updated table is not fetched.<br>_default = true_

- ✨ **Side effects** - entries are added to the table


### Deleting Table Entries

#### `deleteRow(idx, refetch)` (async) :id=method-deleteRow
> Delete entry at the given index (First entry is 0)

Param|Type|Required|Description
---|---|---|---
`idx`|number|✅|index of the entry to delete
`refetch`|boolean|-|If false the updated table is not fetched.<br>_default = true_

- ✨ **Side effects** - deletes the entry at given index.

#### `deleteRowRange(startIdx, endIdx, refetch)` (async) :id=method-deleteRowRange
> Delete entry from startIdx to endIdx (excluding endIdx) 

Param|Type|Required|Description
---|---|---|---
`startIdx`|number|✅|index of beginning of range
`endIdx`|number|✅|index of the end of range (endIdx itself is excluded from range)
`refetch`|boolean|-|If false the updated table is not fetched.<br>_default = true_

- ✨ **Side effects** - deletes the range of values. 

#### `deleteRows(rows, sorted)` (async) :id=method-deleteRows
> Delete all the entries at the given indices

Param|Type|Required|Description
---|---|---|---
`rows`|Array.< number >|✅|current indices of rows to delete
`sorted`|boolean|-|pass true if the `rows` array is already in sorted order.<br>_default = false_

- ✨ **Side effects** - deletes the values at the given indices and fetches the updated table.

#### `deleteRowsWhere(selectFunction)` (async) :id=method-deleteRowsWhere
> Delete all the entries that returns true for selectFunction

The function would be passed the rowValue as dictionary and row index as parameter and should return a boolean value stating whether to delete the row.
```javascript
// Function to delete rows with index below 5 or having col1 (col1 is name of the column) as 'abc'
const selectionFunction = (rowData, rowIdx) => (rowIdx < 5 || rowData.col1 === 'abc');
await table.deleteRowsWhere(selectionFunction);

//selection function to select all
const allSelector = () => true;
```

Param|Type|Required|Description
---|---|---|---
`selectFunction`|function|✅|function used to select which rows to delete

- ✨ **Side effects** - deletes the values and fetches the updated table


### Updating Table Entries
> For updating values in table we can use an **update object** which is an Object keyed by column names with only those entries you need to update. <br>
For example: if we need to update the value of column col2 the udpate object would be `{col2: 'new value'}`

#### `updateRow(rowIdx, updates)` (async) :id=method-updateRow
> Update row at the given index

Param|Type|Required|Description
---|---|---|---
`rowIdx`|number|✅|index of the entry to update
`updates`|Object|✅|Object with the updates to be applied
''

- ✨ **Side effects** - updates the row value

#### `updateRows(rowIndices, updateGenerator)` (async) :id=method-updateRows
> Update row at the given list of indices, using the updates generated from updateGenerator

```javascript
// Example generator that can generate the updates given the rowData and rowIdx of the given data
// Here we set the col1 to rowIdx of the row and double the values of col2 for selected rows
const updateGenerator = (rowData, rowIdx) => {return { col1: rowIdx, col2: rowData.col2 * 2 }};
await table.updateRows([0, 2, 4, 8], updateGenerator);
```

Param|Type|Required|Description
---|---|---|---
`rowIndices`|Array.< number >|✅|indices of entries to update
`updateGenerator`|function|✅|function that generates the updates to be applied
''

- ✨ **Side effects** - updates the rows values 

#### `updateRowsWhere(selectionFunction)` (async) :id=method-updateRowsWhere
> Update the rows that satisfies a selection condition, using the updates generated from updateGenerator

Param|Type|Required|Description
---|---|---|---
`selectionFunction`|function|✅|function used to select which rows to update<br>__see [`table.deleteRowsWhere()`](#method-deleteRowsWhere) above for more info__
`updateGenerator`|function|✅|function that generates the updates to be applied<br>__see [`table.updateRows()`](#method-updateRows) above for more info__

- ✨ **Side effects** - updates the rows that satisfies the selection criteria

### Other methods

#### `clear()` (async) :id=method-clear
> Clear all the entries from the table

- ✨ **Side effects** - clears the entire data from table except header rows.

#### `drop()` (async) :id=method-delete
> Delete the table

- ✨ **Side effects** - table is deleted and cannot be accessed via table getters in `SheetDatbase`

#### `reload()` (async) :id=method-delete
> Refetch the data from the google sheet

- ✨ **Side effects** - Table entries are updated.

#### `rename(newName)` (async) :id=method-rename
> rename the table

Param|Type|Required|Description
---|---|---|---
`newName`|string|✅|new name of the table

- ✨ **Side effects** - table is no longer accessible via its old name.

#### `shrinkSheetToFitTable()` (async) :id=method-shrinkSheetToFitTable
> delete unnecessary columns from the Google Sheet

The way the library works is by fetching and creating an in memory 2D array with all the values in the google sheet. In order to save unnecessary network bandwidth and memory to store data which we know will always be null, it is recommended to call `shrinkSheetToFitTable()` once you have reanmed the column names (which is automatically done by `shrinkTable` param in [`setColumnNames()`](#method-setColumnNames)) or you have manually cleared entries from the Google Sheet Document.

- ✨ **Side effects** - resizes the sheet to fit only the data which is saved locally. (Make sure the local data is updated with the Google Sheet)