import Database from './dbhelper/Database';
import ACTIONS from './dbhelper/actions';
import type Table from './dbhelper/Table';
import creds from './creds.json';

export default class SheetDatabase {
  db: Database;
  [key: string]: any;

  constructor(sheetId: string = '') {
    this.db = new Database(sheetId);
    this.db.subscrible((actionType: number, ...payload: string[]) => {
      if (actionType === ACTIONS.TABLE_DELETED) {
        delete this[payload[0]];
      } else if (actionType === ACTIONS.TABLE_RENAMED) {
        const table = this[payload[0]];
        delete this[payload[0]];
        this[payload[1]] = table;
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
   * Use service account with creds
   * @param {object} creds Json file
   */
  async useServiceAccount(client_email: string, private_key: string) {
    await this.db.useServiceAccountAuth(client_email, private_key);
  }

  /**
   * Load the data of tables from sheet into memory
   */
  async fetchTables() {
    await this.db.loadData();
    console.log(this.db._tables)
    for (const table of Object.values(this.db.tables)) {
      await table.loadTableHeaders();
      this[table.title] = table;
    }
  }

  /**
   * Returns the table with the given table name
   * @param {string} tableName Name of the table you need
   * @return {Table} Table object corresponding to given table name
   */
  getTable(tableName: string) {
    if (this.hasOwnProperty(tableName)) {
      return this[tableName];
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
    await table.loadTableHeaders();
    this[table.title] = table;
  }

  /**
   * Deletes the table with the given table name
   * @param {string} tableName name of the table to drop
   */
  async dropTable(tableName: string) {
    await this[tableName].delete();
  }

  /**
   * Change the name of a table
   * @param {string} tableName name of the table to be renamed
   * @param {string} newTableName new name of the table
   */
  async renameTable(tableName:string, newTableName:string) {
    await this[tableName].rename(newTableName);
  }

}

async function test() {
  const dat = new SheetDatabase('1nwIJ9lLyivfsAlRBnkxl7Su7tCBo6tVsW9zwVCdTfsU');
  dat.useServiceAccount(creds.client_email, creds.private_key);
  await dat.fetchTables();

  await dat.addTable('test3', ['id', 'name']);
  console.log(dat.test3.headerValues);
  await dat.test3.rename('test4');

  await dat.test4.delete();
}

test();