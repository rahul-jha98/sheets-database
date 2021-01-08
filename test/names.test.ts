import {SheetDatabase} from '../src/index';
import {Table} from '../src/dbhelper/Table';
// @ts-ignore
import {load_database} from './load_database';
import creds from './creds.json';

const databases: Record<string, SheetDatabase> = load_database();
const database = databases.PRIVATE;

describe('Prevent incorrect naming of tables and columns', () => {
  beforeAll(async () => {
    await database.useServiceAccount(creds);
  });

  describe('adding table with name as one of the class properties', () => {
    it('can add new table with name one of the properties', async () => {
      const table = await database.addTable('addTable', ['header1', 'header2', 'header3']);
      expect(table.title).toBe('addTable');
      // expect(database['addTable'].name).toThrow();
      expect(database.tables.addTable.title).toBe('addTable');

      await database.addTable('test', ['abc']);
      await database.test.drop();
      await database.getTable('addTable').drop();
    });
    it('can prevent setting incorrect table headers', async () => {
      const table = await database.addTable('headers', ['header1', 'header2', 'header3']);
      expect(async () => await table.setColumnNames(['header@1', 'header2'])).rejects;
      table.drop();
    });
  });
});
