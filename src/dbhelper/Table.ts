import type Database from './Database';
import {Sheet, SheetData, SheetProperties} from './ResponseStructure';

export default class Table {
  _database: Database;
  _properties: SheetProperties;
  _cells: (string | null)[][];
  headerValues: string[];

  constructor(database: Database, {properties, data}: Sheet) {
    this._database = database;
    this._properties = properties;

    this._cells = [];
    this.headerValues = [];

    if (data) this._fillTableData(data);
  }

  _fillTableData(dataRanges: Array<SheetData>) {
    dataRanges.forEach((range: SheetData) => {
      console.log(range.rowData);

      const numRows = range.rowMetadata.length;
      const numColumns = range.columnMetadata.length;

      for (let row = 0; row < numRows; row++) {
        for (let column = 0; column < numColumns; column++) {
          if (!this._cells[row]) this._cells[row] = [];
          if (!this._cells[row][column]) this._cells[row][column] = null;
          if (
            range.rowData &&
            range.rowData[row] &&
            range.rowData[row].values[column]
          ) {
            const cellValue = range.rowData[row].values[column].formattedValue;
            this._cells[row][column] = cellValue;
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
}