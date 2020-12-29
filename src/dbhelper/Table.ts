import {columnNumberToName} from './utils';
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

  /**
   * Column letter of the last column in grid
   */
  get lastColumnLetter() {
    return columnNumberToName(this.columnCount);
  }


  async loadTableHeaders() {
    const rows = await this.getCellsInRange(`A1:${this.lastColumnLetter}1`);
    if (!rows) {
      throw new Error('Table Headers (Header Row) is missing.');
    }
    console.log(rows[0]);
    this.headerValues = rows[0].map((header: string) => header.trim());
    
    if (!this.headerValues.filter(Boolean).length) {
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

  /**
   * Updates the header values in the sheet
   * @param {Array.<string>} headerValues Name of header values to be set
   */
  async setTableHeaders(headerValues: string[]) {
    if (!headerValues) return;

    if (headerValues.length > this.columnCount) {
      throw new Error(
        `Sheet is not large enough to fit ${headerValues.length} columns.` +
          `Resize the sheet first.`
      );
    }

    const trimmedHeaderValues = headerValues.map(h => h.trim());

    // checkForDuplicateHeaders(trimmedHeaderValues);

    if (!trimmedHeaderValues.filter(Boolean).length) {
      throw new Error('All your header cells are blank -');
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
    this.headerValues = response.data.updatedData.values[0];

    for (let i = 0; i < headerValues.length; i++) {
      this._cells[0][i] = headerValues[i];
    }
  }
}