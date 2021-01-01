import {columnNumberToName, reduceRowsToDelete} from './utils';
import {Sheet, SheetData, SheetProperties} from './ResponseStructure';

type primitiveTypes = string | boolean | number | null | undefined;
type rowData = Array<primitiveTypes>|Record<string, primitiveTypes>
import type {Database} from './Database';

export class Table {
  /**
   * @private
   * @description
   * Reference of the belonging Database (Google Sheet)
   */
  _database: Database;
  /**
   * @private
   * @description
   *
   */
  _properties: SheetProperties;
  /**
   * @private
   * @description
   * all the values of the sheet stored in 2D Array
   */
  _cells: (primitiveTypes)[][];
  /**
   * @private
   * @description
   * holds the index of the last row with values
   */
  _lastRowsWithValues = 0;

  /**
   * @description
   * Names of columns in the table
   * - Values in the first row of the sheet
   */
  columnNames: string[];

  /**
   * @description
   * Is there any change made locally which has made the current data invalid
   * - Note - the value may be incorrect if there are remote change on the sheet
   */
  isFetchPending = true;

  constructor(database: Database, {properties, data}: Sheet) {
    this._database = database;
    this._properties = properties;

    this._cells = [];
    this.columnNames = [];

    this._fillTableData(data);
  }

  /**
   * Loads the column names of the table
   * @param {boolean} enforceHeaders whether to raise error if headers empty
   */
  async loadColumnNames(enforceHeaders = true) {
    const rows = await this.getCellsInRange(`A1:${this.lastColumnLetter}1`);
    if (!rows) {
      if (!enforceHeaders) {
        return;
      }
      throw new Error('Table Headers (Header Row) is missing.');
    }

    this.columnNames = rows[0].map((header: string) => header.trim());

    if (!this.columnNames.filter(Boolean).length) {
      if (!enforceHeaders) {
        return;
      }
      throw new Error('All table headers are empty');
    }
  }


  /**
   * Set the header values in the sheet to the given values
   * @param {Array.<string>} headerValues Name of header values to be set
   * @param {boolean} shrinkTable pass true if you want to shrink table:
   * - Note - It deletes the values beyond length of headers passed
   */
  async setColumnNames(headerValues: string[], shrinkTable = false) {
    if (!headerValues) return;

    if (headerValues.length > this.columnCount) {
      await this._setColumnSize(headerValues.length);
    }

    const trimmedHeaderValues = headerValues.map((h) => h.trim());

    // checkForDuplicateHeaders(trimmedHeaderValues);

    if (!trimmedHeaderValues.filter(Boolean).length) {
      throw new Error('All your header cells are blank');
    }

    const response = await this._database.axios.request({
      method: 'put',
      url: `/values/${this.encodedA1SheetName}!1:1`,
      params: {
        valueInputOption: 'USER_ENTERED', // other option is RAW
        includeValuesInResponse: true,
      },
      data: {
        range: `${this.a1SheetName}!1:1`,
        majorDimension: 'ROWS',
        values: [
          [
            ...trimmedHeaderValues,
            // pad the rest of the row with empty values to clear them all out
            ...Array(this.columnCount - trimmedHeaderValues.length).fill(''),
          ],
        ],
      },
    });
    this.columnNames = response.data.updatedData.values[0];

    if (shrinkTable && trimmedHeaderValues.length < this.columnCount) {
      this.shrinkSheetToFitTable();
    } else {
      for (let i = 0; i < headerValues.length; i++) {
        this._cells[0][i] = headerValues[i];
      }
    }
  }

  /**
   * refetch the data of the table
   */
  async reload() {
    await this._database.loadCells(this.a1SheetName);
    this.isFetchPending = false;
  }

  /**
   * rename the table to the given name
   * @param {string} newName New Name of the table
   */
  async rename(newName: string) {
    return this._database.updateSheetProperties(this.sheetId, {title: newName});
  }

  /**
   * Delete the given table
   */
  async drop() {
    await this._database.deleteTable(this.sheetId);
  }

  /**
   * get the data of the table in the form of array
   * - Note: The data is the one which we got in last reload
   * @return {Array<Array<primitiveTypes>>} the data values aray
   */
  getDataArray() : primitiveTypes[][] {
    return this._cells.slice(1, this._lastRowsWithValues + 1);
  }

  getData() : Array<Record<string, primitiveTypes>> {
    const dataArray = [];
    for (let i = 1; i <= this._lastRowsWithValues
      ; i++) {
      const rowObject:Record<string, primitiveTypes> = {};

      for (let j = 0; j < this.columnNames.length; j++) {
        rowObject[this.columnNames[j]] = this._cells[i][j];
      }
      dataArray.push(rowObject);
    }
    return dataArray;
  }

  getRow(idx: number) : Record<string, primitiveTypes> {
    idx = idx + 1;
    this._ensureRowValid(idx);
    const rowObject:Record<string, primitiveTypes> = {};

    for (let j = 0; j < this.columnNames.length; j++) {
      rowObject[this.columnNames[j]] = this._cells[idx][j];
    }
    return rowObject;
  }

  async insert(rowValue: rowData | Array<rowData>, refetch = true) {
    if (Array.isArray(rowValue)) {
      if (Array.isArray(rowValue[0]) ||
        (typeof rowValue[0] === 'object' && rowValue[0] != null)) {
        return this.insertMany(rowValue as rowData[], refetch);
      }
    }
    return this.insertMany([rowValue as rowData], refetch);
  }

  async insertOne(rowValue: rowData, refetch = true) {
    return this.insertMany([rowValue], refetch=refetch);
  }

  async insertMany(rowValueArray: Array<rowData>,
      refetch = true) {
    const rowsArray: primitiveTypes[][] = [];

    rowValueArray.forEach((row) => {
      let rowAsArray;

      if (Array.isArray(row)) {
        rowAsArray = row;
      } else if (typeof row === 'object' && row != null) {
        rowAsArray = [];
        for (let i = 0; i < this.columnNames.length; i++) {
          const columnName = this.columnNames[i];
          rowAsArray[i] = row[columnName];
        }
      } else {
        throw new Error('Row must be object or array');
      }
      rowsArray.push(rowAsArray);
    });

    return this._addRows(rowsArray, refetch = refetch);
  }

  /**
   * Deletes the row with the given index
   * - Note all the subsequent rows are moved up in the sheet
   * @param idx index of row to delete
   * @param refetch whether to refetch rows after the operation
   */
  async deleteRow(idx: number, refetch = true) {
    return this.deleteRowRange(idx, idx+1, refetch);
  }

  /**
   * 
   * @param startIndex starting index of range of rows
   * @param endIndex end index of range of rows
   * @param refetch whether to refetch rows after the operation
   */
  async deleteRowRange(startIndex: number, endIndex: number, refetch = true) {
    if (startIndex > endIndex) {
      throw new Error('startIndex needs to be less than endIndex');
    }
    startIndex = startIndex + 1;
    this._ensureRowValid(startIndex);
    this._ensureRowValid(endIndex);

    await this._database._requestUpdate('deleteRange', {
      range: {
        sheetId: this.sheetId,
        startRowIndex: startIndex,
        endRowIndex: endIndex+1,
      },
      shiftDimension: 'ROWS',
    });

    if (refetch) {
      console.log('Fetching');
      await this.reload();
    } else {
      this.isFetchPending = true;
    }
  }

  /**
   * given the current indices delete all the rows from the table
   * @param rows current indices of of all the rows to delete
   * @param sorted whether the rows is in sorted format. 
   * - This prevents sort to be explicitly called
   */
  async deleteRows(rows: number[], sorted = false) {
    if (!sorted) {
      rows.sort((a, b) => a - b);
    }
    this._ensureRowValid(rows[0] + 1);
    this._ensureRowValid(rows[rows.length - 1] + 1);
    const rowRanges = reduceRowsToDelete(rows);

    for (const range of rowRanges) {
      await this.deleteRowRange(range[0], range[1], false);
    }
    await this.reload();
  }

  /**
   * Delete rows which match the given criteria
   * @param selectionCondition condition which will be used to select which rows to delete
   */
  async deleteRowsWhere(selectionCondition: (rowData: Record<string, primitiveTypes>) => boolean) {
    const rowsToDelete : number[] = [];
    const isToBeDeleted = this.getData().map(selectionCondition);
    isToBeDeleted.forEach((status, rowIdx) => {
      if (status) {
        rowsToDelete.push(rowIdx);
      }
    });
    console.log(rowsToDelete);
    return this.deleteRows(rowsToDelete);
  }

  /**
   * Clears all the entries from the table
   * @param refetch whether to refetch the values once operation completes
   */
  async clear(refetch = true) {
    await this._database.axios.request({
      method: 'post',
      url: `/values/${this.encodedA1SheetName}!A2:${this.lastColumnLetter+this.rowCount}:clear`,
    });
    if (refetch) {
      await this.reload();
    } else {
      this.isFetchPending = true;
    }
  }

  /**
   *
   * @param {string} a1Range Range in the form of A1 representation eg: A1:D1
   * @param {Object} options prameters along with data
   */
  async getCellsInRange(a1Range: string, options?: Object) {
    const response = await this._database.axios.get(
        `/values/${this.encodedA1SheetName}!${a1Range}`,
        {
          params: options,
        },
    );

    return response.data.values;
  }

  async _setColumnSize(columnCount: number) {
    return this._database.updateSheetProperties(this.sheetId, {
      gridProperties: {
        rowCount: this.rowCount,
        columnCount: columnCount,
      },
    });
  }


  async shrinkSheetToFitTable() {
    this._database.updateSheetProperties(this.sheetId, {
      gridProperties: {
        rowCount: this._lastRowsWithValues +
     2,
        columnCount: this.columnNames.length,
      },
    });
  }

  _fillTableData(dataRanges: Array<SheetData>|null|undefined) {
    if (!dataRanges) {
      this.isFetchPending = true;
      return;
    }
    this.isFetchPending = false;
    dataRanges.forEach((range: SheetData) => {
      const numRows = this.rowCount;
      const numColumns = this.columnCount;

      for (let row = 0; row < numRows; row++) {
        for (let column = 0; column < numColumns; column++) {
          if (!this._cells[row]) this._cells[row] = [];
          if (!this._cells[row][column]) this._cells[row][column] = undefined;
          if (
            range.rowData &&
            range.rowData[row] &&
            range.rowData[row].values[column]
          ) {
            this._lastRowsWithValues =
         row;
            const cellValue = range.rowData[row].values[column].effectiveValue;
            let value = undefined;
            if (cellValue) {
              if (cellValue.numberValue !== undefined) {
                value = cellValue.numberValue;
              } else if (cellValue.stringValue !== undefined) {
                value = cellValue.stringValue;
              } else if (cellValue.boolValue !== undefined) {
                value = cellValue.boolValue;
              }
            }
            this._cells[row][column] = value;
          }
        }
      }
    });
  }

  async _addRows(rowsArrays: primitiveTypes[][],
      refetch = true,
      insert = false) {
    if (!Array.isArray(rowsArrays)) throw new Error('Row values needs to be an array');

    if (!this.columnNames) await this.loadColumnNames();

    await this._database.axios.request({
      method: 'post',
      url: `/values/${this.encodedA1SheetName}!A1:append`,
      params: {
        valueInputOption: 'RAW',
        insertDataOption: insert ? 'INSERT_ROWS' : 'OVERWRITE',
      },
      data: {
        values: rowsArrays,
      },
    });

    // if new rows were added, we need update sheet.rowRount
    if (refetch) {
      await this.reload();
    }
  }


  /**
   * @private
   * Helper function to ensure that the row index is valid before making request
   * @param idx actual index of the row we need to access
   */
  _ensureRowValid(idx: number) {
    if (idx > this._lastRowsWithValues ||
   idx < 1) {
      throw new Error(`Cannot operate on row index ${idx-1} from table with ${this._lastRowsWithValues
      } entries`);
    }
  }

  /**
   * Array of data objects with column names as keys
   */
  get data() {
    return this.getData();
  }

  _getProperty(propertyName: string) {
    return this._properties[propertyName];
  }

  /**
   * sheetId of the given table
   */
  get sheetId() {
    return this._getProperty('sheetId');
  }

  /**
   * name of the given table
   */
  get title() {
    return this._getProperty('title');
  }

  /**
   * index of the table (worksheet) in google sheet document
   */
  get index() {
    return this._getProperty('index');
  }
  /**
   * name of the given table
   */
  get name() {
    return this.title;
  }

  /**
   * Properites of the table grid
   */
  get gridProperties() {
    return this._getProperty('gridProperties');
  }

  /**
   * nubmer of rows in grid
   */
  get rowCount() {
    return this.gridProperties.rowCount;
  }

  /**
   * number of columns in grid
   */
  get columnCount() {
    return this.gridProperties.columnCount;
  }

  /**
   * name of the given sheet
   */
  get a1SheetName() {
    return `'${this.title.replace(/'/g, '\'\'')}'`;
  }
  /**
   * sheet name to be passed as params in API calls
   */
  get encodedA1SheetName() {
    return encodeURIComponent(this.a1SheetName);
  }

  /**
   * Column letter of the last column in grid
   */
  get lastColumnLetter() {
    return columnNumberToName(this.columnCount);
  }
}
