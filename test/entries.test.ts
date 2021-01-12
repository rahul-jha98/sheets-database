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

let table : Table;
const tableName = `tableEntries${new Date().getTime()}`;

const INITIAL_COLUMN_NAMES = ['index', 'letter', 'rowNo'];

const INITIAL_DATA = [1, 2, 3, 4, 5, 6].map((number) => [number-1, `row${number-1}`, number]);

describe('Handle CRUD Operations on Table Entries', () => {
  beforeAll(async () => {
    const jwtClient = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: GOOGLE_AUTH_SCOPES,
    });

    await jwtClient.authorize();
    database.useAccessToken(jwtClient.credentials.access_token as string);
    table = await database.addTable(tableName, INITIAL_COLUMN_NAMES);
    await database[tableName].insert(INITIAL_DATA);
  });

  afterAll(async () => {
    await table.drop();
  });


  describe('refetching table entries', () => {
    it('can refetch mulitple rows', async () => {
      await table.reload();
      expect(table.getDataArray().length).toBe(INITIAL_DATA.length);
    });

    it('can be accessed using column names as keys', () => {
      expect(table.getData()[0].index).toEqual(INITIAL_DATA[0][0]);
      expect(table.getData()[0].letter).toEqual(INITIAL_DATA[0][1]);
    });
  });

  describe('inserting values to table', () => {
    it('can insert row based on array', async () => {
      const dataCount = table.getDataArray().length;
      const data = [dataCount, `letter${dataCount}`, dataCount + 1];
      const expectedIndex = INITIAL_DATA.length;
      await table.insert(data);
      expect(table.getData()[expectedIndex].index).toEqual(data[0]);
    });

    it('can insert row based on object', async () => {
      const newData = {index: 100, rowNo: 101, letter: 'testData'};
      await table.insert(newData);
      expect(table.getData()[table.getData().length-1].letter).toBe(newData.letter);
    });

    it('can insert multiple rows at once', async () => {
      const data = [{index: 500, rowNo: 500, letter: 'testObject'}, [501, 'testArray', 501]];
      await table.insert(data);
      // @ts-ignore
      expect(table.getData()[table.getData().length-1].letter).toBe(data[1][1]);
    });
  });

  describe('deleting entries from table', () => {
    it('can delete single row', async () => {
      const rowNo = table.getDataArray().length - 2;
      await table.deleteRow(rowNo);
      expect(table.getDataArray().length).toBe(rowNo+1);
    });

    it('can delete row range', async () => {
      expect(table.getDataArray()[0][0]).toBe(INITIAL_DATA[0][0]);
      await table.deleteRowRange(0, 3);
      expect(table.getDataArray()[0][0]).toBe(INITIAL_DATA[3][0]);
    });

    it('can clear all entries', async () => {
      await table.clear();
      expect(table.getDataArray().length).toBe(0);
    });

    it('can delete based on condition', async () => {
      await table.insert(INITIAL_DATA);
      expect(table.getDataArray().length).toBe(INITIAL_DATA.length);
      await table.deleteRowsWhere((data) => data.index as number % 2 === 0);
      expect(table.getDataArray().length).toBe(INITIAL_DATA.length/2);
    });
  });

  describe('updating entries', () => {
    it('can update rows using array', async () => {
      await table.updateRow(0, [1, null]);
      expect(table.getRow(0).index).toBe(1);
    });
    it('can update rows using objects', async () => {
      await table.updateRow(0, {letter: 'changed'});
      expect(table.getRow(0).letter).toBe('changed');
    });
    it('can update multiple rows', async () => {
      await table.updateRows([0, 1, 2], (data) => {
        return {letter: data?.index};
      });
    });
  });
});
