import {Database} from './dbhelper/Database';
import {ACTIONS} from './dbhelper/actions';
import {Table} from './dbhelper/Table';
import type {OAuth2Client} from 'google-auth-library';
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
        this._removeTableReference(payload[0]);
      } else if (actionType === ACTIONS.TABLE_RENAMED) {
        const table = this.getTable(payload[0]);
        this._removeTableReference(payload[0]);
        this._addTableReference(payload[1], table);
      }
    });
  }


  /**
   * fetches the tables (worksheets) from the connected sheet
   * @param {boolean} [syncTableEntries=true] whether the table data should also be loaded
   */
  async sync(syncTableEntries = true) {
    await this._db.loadData(syncTableEntries);

    for (const table of Object.values(this._db.tables)) {
      await table.loadColumnNames(false);
      this._addTableReference(table.name, table);
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
   * @return {Promise<Table>} A promise to return the added table object
   */
  async addTable(tableName: string, columnNames: string[], rowCount = 20) {
    const table = await this._db.addTable({
      title: tableName,
      gridProperties: {
        rowCount: rowCount,
        columnCount: columnNames.length,
        frozenRowCount: 1,
      },
      headerValues: columnNames,
    });
    this._addTableReference(tableName, table);
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
   * title of the Sheet Document
   */
  get title() : string {
    if (this._db.title) {
      return this._db.title;
    }
    throw new Error('Must call sync() once before accessing title');
  }

  /**
   * array of tables sorted by their order in the Google Sheet
   */
  get tablesByIndex() : Table[] {
    return [...Object.values(this._tables)]
        .sort((tab1, tab2) => tab1.index - tab2.index);
  }

  /**
   * object of tables indexed by their table name
   */
  get tables() : {[tableName : string]: Table} {
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

  /**
   * Set authentication mode to use service account with the given credentials.
   * @param credentials object which will contain keys client_email and private_key.
   */
  async useServiceAccount(credentials: {client_email: string, private_key: string}) {
    return this._db.useServiceAccount(credentials.client_email, credentials.private_key);
  }

  /**
   * Use the oauthclient passed for authentication. Token is refreshed used the refresh token automatically.
   * @param oAuth2Client client object with refresh token set. The access token and expiration date can be generated
   */
  useOAuth2Client(oAuth2Client: OAuth2Client) {
    this._db.useOAuth2Client(oAuth2Client);
  }

  /**
   * @private
   * @param name key which will be used to access table
   * @param table corresponding Table object
   */
  _addTableReference(name: string, table: Table) {
    if (!this.hasOwnProperty(name) && typeof this[name] !== 'function') {
      this[name] = table;
    }
    this._tables[name] = table;
  }

  /**
   * @private
   * @param name key of property which will be removed
   */
  _removeTableReference(name: string) {
    if (this.hasOwnProperty(name) && this[name] instanceof Table) {
      delete this[name];
    }
    delete this._tables[name];
  }
}

export default SheetDatabase;
