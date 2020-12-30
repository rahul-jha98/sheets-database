import {SheetDatabase} from '../src/index';
import {Table} from '../src/dbhelper/Table';
// @ts-ignore
import creds from './creds.json';
import {JWT} from 'google-auth-library';

// @ts-ignore
import {load_database} from './load_database';


const databases: Record<string, SheetDatabase> = load_database();
const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',

  // the list from the sheets v4 auth for spreadsheets.get
  // 'https://www.googleapis.com/auth/drive',
  // 'https://www.googleapis.com/auth/drive.readonly',
  // 'https://www.googleapis.com/auth/drive.file',
  // 'https://www.googleapis.com/auth/spreadsheets',
  // 'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const database = databases.PRIVATE;

describe('Handle Table CRUD Operations', () => {

  

  beforeAll(async () => {
    const jwtClient = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: GOOGLE_AUTH_SCOPES,
    });

    await jwtClient.authorize();
    database.useAccessToken(jwtClient.credentials.access_token as string);
  });

  it('can fetch Tables Data', async () => {
    await database.fetchTablesList();
  });
  
  describe('adding tables and modify its properties', () => {
    const date = new Date();
    const tableName = `addedSheet${date.getTime()}`;
    let table: Table;

    afterAll(async () => {
      if (table) await table.drop();
    });
    
    it('can add new table', async () => {
      const numTables = database.tablesByIndex.length;
      table = await database.addTable(tableName, ['header1', 'header2', 'header3']);
      expect(database.tablesByIndex.length).toBe(numTables + 1);
      expect(table.title).toBe(tableName);
    });

    it('is having header rows', async() => {
      await table.loadColumnNames();
      expect(table.columnNames.length === 3);
      expect(table.columnNames[0]).toBe('header1');
      expect(table.columnNames[2]).toBe('header3');
    });
  });


  describe('deleting tables', () => {
    it('can drop tables', async () => {
      await database.fetchTablesList();
      let numTables = database.tablesByIndex.length;
      const tableName = `toDelete${new Date().getTime()}`;
      let table = await database.addTable(tableName, ['temp']);
      expect(database.tablesByIndex.length).toBe(numTables + 1);

      await database.dropTable(tableName);
      expect(database.tablesByIndex.length).toBe(numTables);
    });
  });
});