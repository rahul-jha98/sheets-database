import Database from './dbhelper/Database';
import ACTIONS from './dbhelper/actions';
import type Table from './dbhelper/Table';
import creds from './creds.json';

export default class SheetDatabase {
  db: Database;
  [key: string]: any;

  constructor(sheetId: string = '') {
    this.db = new Database(sheetId);
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
}

async function test() {
  const dat = new SheetDatabase('1nwIJ9lLyivfsAlRBnkxl7Su7tCBo6tVsW9zwVCdTfsU');
    dat.useServiceAccount(creds.client_email, creds.private_key);
    await dat.fetchTables();
}

test();