import {Database} from './dbhelper/Database';
import {ACTIONS} from './dbhelper/actions';
import type {Table} from './dbhelper/Table';

export class SheetDatabase {
  db: Database;
  [key: string]: any;
  tables: Record<string, Table> = {}

  constructor(sheetId: string = '') {
    this.db = new Database(sheetId);
    this.db.subscrible((actionType: number, ...payload: string[]) => {
      if (actionType === ACTIONS.TABLE_DELETED) {
        delete this[payload[0]];
        delete this.tables[payload[0]]
      } else if (actionType === ACTIONS.TABLE_RENAMED) {
        const table = this[payload[0]];
        delete this[payload[0]];
        delete this.tables[payload[0]]
        this[payload[1]] = table;
        this.tables[payload[1]] = table;
      }
    });
  }

  /**
   * Set authentication mode to use given API key
   * @param {string} key API key with Sheets API enabled
   */
  useApiKey(key: string) {
    this.db.useApiKey(key);
  }


  /**
   * Set authentication mode to use google OAuth
   * Note: The token needs to be refreshed externally
   * @param {string} token User access token with suitable authscope
   */
  useAccessToken(token: string) {
    this.db.useAccessToken(token);
  }

  /**
   * Load the data of tables from sheet into memory
   */
  async fetchTablesList(loadTableData: boolean = true) {
    await this.db.loadData(loadTableData);

    for (const table of Object.values(this.db.tables)) {
      await table.loadColumnNames(true);
      this[table.title] = table;
      this.tables[table.title] = table;
    }
  }

  /**
   * Returns the table with the given table name
   * @param {string} tableName Name of the table you need
   * @return {Table} Table object corresponding to given table name
   */
  getTable(tableName: string) : Table {
    if (this.tables.hasOwnProperty(tableName)) {
      return this.tables[tableName];
    }
    throw new Error('No table named ' + tableName);
  }

  /**
   * Add a table to the database
   * @param {string} tableName name of the table to add
   * @param {Array.<string>} columnNames list with all the column names
   * @param {number} [rowCount=20] number of rows to be added
   */
  async addTable(tableName: string, columnNames: string[], rowCount: number = 20) {
    const table = await this.db.addTable({
      title: tableName,
      gridProperties: {
        rowCount: rowCount,
        columnCount: columnNames.length,
      },
      headerValues: columnNames,
    });
    await table.loadColumnNames();
    this[table.title] = table;
    this.tables[table.title] = table;
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
  async renameTable(tableName:string, newTableName:string) {
    await this.getTable(tableName).rename(newTableName);
  }

  get title() {
    return this.db.title;
  }

  get tablesByIndex() {
    const tables = [...Object.values(this.db._tables)].sort((tab1, tab2) => tab1.index - tab2.index);
    return tables;
  }
}

export default SheetDatabase;