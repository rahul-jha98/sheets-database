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

  describe('updating table properties', () => {
    
    it('can rename tables', async () => {
      await database.fetchTablesList();
      let numTables = database.tablesByIndex.length;
      const oldTableName = `toRename${new Date().getTime()}`;
      await database.addTable(oldTableName, ['temp', 'data']);
      expect(database.tablesByIndex.length).toBe(numTables + 1);
      const newTableName = `toRename${new Date().getTime()}`;
      await database.renameTable(oldTableName, newTableName); 
      expect(() => database.getTable(oldTableName)).toThrow();
      expect(database[newTableName]).toBeInstanceOf(Table);
      await database.dropTable(newTableName);
    });

    it('can resize when renaming column names', async () => {
      await database.fetchTablesList();
      let numTables = database.tablesByIndex.length;
      const tableName = `toRenameHeaders${new Date().getTime()}`;
      await database.addTable(tableName, ['temp', 'data']);
      expect(database.tablesByIndex.length).toBe(numTables + 1);

      await database.getTable(tableName).setColumnNames(['temp', 'data', 'newcolumn']);
      await database[tableName].drop();
    });
  });

  describe('deleting tables', () => {
    it('can drop tables', async () => {
      await database.fetchTablesList();
      let numTables = database.tablesByIndex.length;
      const tableName = `toDelete${new Date().getTime()}`;
      let table = await database.addTable(tableName, ['temp', 'data ']);
      expect(database.tablesByIndex.length).toBe(numTables + 1);

      await database.dropTable(tableName);
      expect(database.tablesByIndex.length).toBe(numTables);
    });
  });
});