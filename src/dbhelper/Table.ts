import {columnNumberToName, reduceRowsToDelete} from './utils';
import type {Database} from './Database';
import {Sheet, SheetData, SheetProperties} from './ResponseStructure';

type primitiveTypes = string | boolean | number | null | undefined;
type rowData = Array<primitiveTypes>|Record<string, primitiveTypes>

export class Table {
  _database: Database;
  _properties: SheetProperties;
  _cells: (primitiveTypes)[][];
  columnNames: string[];
  lastRowWithValues: number = 0;

  isFetchPending: boolean = true;

  constructor(database: Database, {properties, data}: Sheet) {
    this._database = database;
    this._properties = properties;

    this._cells = [];
    this.columnNames = [];

    this._fillTableData(data);
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
            this.lastRowWithValues = row;
            const cellValue = range.rowData[row].values[column].effectiveValue;
            this._cells[row][column] = cellValue?.numberValue ||
               cellValue?.stringValue ||
               cellValue?.boolValue
          }
        }
      }
    });
  }

  _getProp(propertyName: string) {
    return this._properties[propertyName];
  }

  /**
   * sheetId of the given table
   */
  get sheetId() {
    return this._getProp('sheetId');
  }

  /**
   * name of the given table
   */
  get title() {
    return this._getProp('title');
  }

  get index() {
    return this._getProp('index');
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
    return this._getProp('gridProperties');
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
    return `'${this.title.replace(/'/g, "''")}'`;
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


  async loadColumnNames(silent:boolean= false) {
    
    const rows = await this.getCellsInRange(`A1:${this.lastColumnLetter}1`);
    if (!rows) {
      if (silent)
        return;
      throw new Error('Table Headers (Header Row) is missing.');
    }

    this.columnNames = rows[0].map((header: string) => header.trim());
    
    if (!this.columnNames.filter(Boolean).length) {
      if (silent)
        return;
      throw new Error('All table headers are empty');
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
      }
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
  /**
   * Updates the header values in the sheet
   * @param {Array.<string>} headerValues Name of header values to be set
   */
  async setColumnNames(headerValues: string[], shrinkTable:boolean = false) {
    if (!headerValues) return;

    if (headerValues.length > this.columnCount) {
      await this._setColumnSize(headerValues.length);
    }

    const trimmedHeaderValues = headerValues.map(h => h.trim());

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

  async shrinkSheetToFitTable() {
    this._database.updateSheetProperties(this.sheetId, {
      gridProperties: {
        rowCount: this.lastRowWithValues + 2,
        columnCount: this.columnNames.length
      }
    });
  }

  async loadCells() {
    await this._database.loadCells(this.a1SheetName);
    this.isFetchPending = false; 
  }

  /**
   * Delete the given table
   */
  async drop() {
    await this._database.deleteTable(this.sheetId);
  }

  async rename(newName: string) {
    return this._database.updateSheetProperties(this.sheetId, {title: newName});
  }

  
  async insertMany(rowValueArray: Array<rowData>,
    refetch: boolean = true) {
    const rowsArray: primitiveTypes[][] = []

    rowValueArray.forEach((row) => {

      let rowAsArray;

      if (Array.isArray(row)) {
        rowAsArray = row;
      } else if (typeof row === 'object' && row != null) {
        rowAsArray = []
        for(let i = 0; i < this.columnNames.length; i++) {
          const columnName = this.columnNames[i];
          rowAsArray[i] = row[columnName];
        }
      } else {
        throw new Error("Row must be object or array")
      }
      rowsArray.push(rowAsArray);
    });

    return this._addRows(rowsArray, refetch = refetch);

  }
  async insertOne(rowValue: rowData, refetch:boolean = true) {
    return this.insertMany([rowValue], refetch=refetch);
  }

  async insert(rowValue: rowData | Array<rowData>, refetch: boolean = true) {
    if (Array.isArray(rowValue)) {
      if (Array.isArray(rowValue[0]) || (typeof rowValue[0] === 'object' && rowValue[0] != null)) {
        // @ts-ignore : type has been checked to ensure its not primitive type
        return this.insertMany(rowValue, refetch);
      }
    }
    // @ts-ignore : if its array we have returned earlier
    return this.insertMany([rowValue], refetch)
  }

  async _addRows(rowsArrays: primitiveTypes[][], 
    refetch: boolean = true,
    insert: boolean = false) {
    console.log(insert, refetch);
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
    console.log("Inserted Values");
    if (refetch) {
      console.log("Fetching")
      await this.loadCells();
    }
  }

  getDataArray() : primitiveTypes[][] {
    return this._cells.slice(1, this.lastRowWithValues + 1);
  }

  getData() : Array<Record<string, primitiveTypes>>{
    const dataArray = []
    for(let i = 1; i <= this.lastRowWithValues; i++) {
      let rowObject:Record<string, primitiveTypes> = {};

      for(let j = 0; j < this.columnNames.length; j++) {
        rowObject[this.columnNames[j]] = this._cells[i][j];
      }
      dataArray.push(rowObject);
    }
    return dataArray;
  }

  getRow(idx: number) : Record<string, primitiveTypes> {
    idx = idx + 1;
    this._ensureRowValid(idx)
    let rowObject:Record<string, primitiveTypes> = {};

    for(let j = 0; j < this.columnNames.length; j++) {
      rowObject[this.columnNames[j]] = this._cells[idx][j];
    }
    return rowObject;
  }

  _ensureRowValid(idx: number) {
    if (idx > this.lastRowWithValues || idx < 1) {
      throw new Error(`Cannot operate on row index ${idx-1} from table with ${this.lastRowWithValues} entries`);
    }
  }

  async deleteRow(idx: number, refetch: boolean = true) {
    idx = idx + 1;
    this._ensureRowValid(idx);
    await this._database._requestUpdate('deleteRange', {
      range: {
        sheetId: this.sheetId,
        startRowIndex: idx,
        endRowIndex: idx+1
      },
      shiftDimension: 'ROWS',
    });
    if (refetch) {
      console.log("Fetching")
      await this.loadCells();
    }
  }

  async deleteRowRange(startIndex: number, endIndex: number, refetch: boolean = true) {
    if (startIndex > endIndex) {
      throw new Error("startIndex needs to be less than endIndex");
    }
    startIndex = startIndex + 1;
    this._ensureRowValid(startIndex);
    this._ensureRowValid(endIndex);
    
    await this._database._requestUpdate('deleteRange', {
      range: {
        sheetId: this.sheetId,
        startRowIndex: startIndex,
        endRowIndex: endIndex+1
      },
      shiftDimension: 'ROWS',
    });

    if (refetch) {
      console.log("Fetching")
      await this.loadCells();
    }
  }

  async deleteRows(rows: number[], sorted: boolean = false) {
    if (!sorted) {
      rows.sort((a, b) => b - a);
    }
    this._ensureRowValid(rows[0] + 1);
    this._ensureRowValid(rows[rows.length - 1] + 1);
    const rowRanges = reduceRowsToDelete(rows);;

    for (const range of rowRanges) {
      console.log("deleting ", range[0], " to ", range[1]);
      await this.deleteRowRange(range[0], range[1], false);
    }
    await this.loadCells();
  }

  async clear() {
    await this._database.axios.request({
      method: 'post',
      url: `/values/${this.encodedA1SheetName}:clear`,
    });
    await this.setColumnNames(this.columnNames);
  }
}