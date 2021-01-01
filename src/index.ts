import {Database} from './dbhelper/Database';
import {ACTIONS} from './dbhelper/actions';
import type {Table} from './dbhelper/Table';

/**
 * @class
 */
export class SheetDatabase {
  [key: string]: any;
  _db: Database;

  _tables: Record<string, Table>;

  /**
   * @param {string} [sheetId] sheetId for the Google Sheets file to be used
   */
  constructor(sheetId = '') {
    this._db = new Database(sheetId);
    this._tables = {};

    this._db.subscrible((actionType: number, ...payload: string[]) => {
      if (actionType === ACTIONS.TABLE_DELETED) {
        delete this[payload[0]];
        delete this._tables[payload[0]];
      } else if (actionType === ACTIONS.TABLE_RENAMED) {
        const table = this[payload[0]];
        delete this[payload[0]];
        delete this._tables[payload[0]];
        this[payload[1]] = table;
        this._tables[payload[1]] = table;
      }
    });
  }

  /**
   * Fetches the tables (worksheets) from the connected sheet
   * @param {boolean} loadTableData whether the table data should also be loaded
   */
  async fetchTablesList(loadTableData = true) {
    await this._db.loadData(loadTableData);

    for (const table of Object.values(this._db.tables)) {
      await table.loadColumnNames(false);
      this[table.title] = table;
      this._tables[table.title] = table;
    }
  }

  /**
   * Returns the table with the given table name
   * @param {string} tableName Name of the table you need
   * @return {Table} Table object corresponding to given table name
   */
  getTable(tableName: string): Table {
    if (this._tables.hasOwnProperty(tableName)) {
      return this._tables[tableName];
    }
    throw new Error('No table named ' + tableName);
  }

  /**
   * Add a table to the database
   * @param {string} tableName name of the table to add
   * @param {Array.<string>} columnNames list with all the column names
   * @param {number} [rowCount=20] initial number or rows
   */
  async addTable(tableName: string, columnNames: string[], rowCount = 20) {
    const table = await this._db.addTable({
      title: tableName,
      gridProperties: {
        rowCount: rowCount,
        columnCount: columnNames.length,
      },
      headerValues: columnNames,
    });
    await table.loadColumnNames();
    this[table.title] = table;
    this._tables[table.title] = table;
    return table;
  }

  /**
   * Deletes the table with the given table name
   * @param {string} tableName name of the table to drop
   */
  async dropTable(tableName: string) {
    await this.getTable(tableName).drop();
  }

  /**
   * Change the name of a table
   * @param {string} tableName name of the table to be renamed
   * @param {string} newTableName new name of the table
   */
  async renameTable(tableName: string, newTableName: string) {
    await this.getTable(tableName).rename(newTableName);
  }

  /**
   * Title of the Sheet Document
   */
  get title() {
    return this._db.title;
  }

  /**
   * Array of tables sorted by their order in the Google Sheet
   */
  get tablesByIndex() {
    return [...Object.values(this._tables)]
        .sort((tab1, tab2) => tab1.index - tab2.index);
  }

  /**
   * Object of tables indexed by their table name
   */
  get tables() {
    return this._tables;
  }

  // AUTH RELATED FUNCTIONS \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
  /**
   * Set authentication mode to use given API key
   * @param {string} key API key with Sheets API enabled
   */
  useApiKey(key: string) {
    this._db.useApiKey(key);
  }

  /**
   * Set authentication mode to use google OAuth
   * Note: The token needs to be refreshed externally
   * @param {string} token User access token with suitable authscope
   */
  useAccessToken(token: string) {
    this._db.useAccessToken(token);
  }
}

export default SheetDatabase;
const db = new SheetDatabase();
