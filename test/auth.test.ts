// @ts-ignore
import {load_database} from './load_database';
// @ts-ignore
import API_KEY from './API_KEY';
// @ts-ignore
import creds from './creds.json';

import {JWT} from 'google-auth-library';
import type { SheetDatabase } from '../src';
import type { Table } from '../src/dbhelper/Table';

const databases: Record<string, SheetDatabase> = load_database();
const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];


const checkDatabaseOperations= (SHEET_ACCESS: string, options: Record<string, boolean|string>) => {
  const database = databases[SHEET_ACCESS];
  let table: Table; 
  describe(`For sheet which is ${SHEET_ACCESS}`, () => {
    if (options.canDoReadOperation) {
      
      it('reading database properties should succeed', async () => {
        await database.fetchTablesList(false);
        expect(database.title).toBeTruthy();
        table = database.tablesByIndex[0]
      });

      it('reading table data should succeed', async () => {
        await table.loadCells();
        expect(table.isFetchPending).toBeFalsy();
      });

    } else {

      it('reading database properties should fail', async () => {
        await expect(database.fetchTablesList(false)).rejects.toThrow(options.readError as string);
      })
    }

    if (options.canDoWriteOperation) {
      it('writing to table should succeed', async () => {
        if (!table) throw Error("Read needs to pass to check write");
        table.setColumnNames(['header1', 'header2', 'header3']);
      });
    } else {
      it('writing to table should fail', async () => {
        if (!table) return;
        await expect(table.
          setColumnNames(['header1', 'header2', 'header3']))
          .rejects.toThrow(options.writeError as string);
      });
    }
  });
}

describe("Authorization", () => {

  describe("Accessing without auth", () => {
    it("fetchTables should fail for all databases", async () => {
      await expect(databases.PUBLIC.fetchTablesList()).rejects.toThrow(
        `You need to set up some kind of authorization`
      );
    });
  });


  describe("Accessing with API Key", () => {
    it('*setting all database to use API Key', async () => {
      await databases.PRIVATE.useApiKey(API_KEY);
      await databases.PUBLIC.useApiKey(API_KEY);
      await databases.PUBLIC_READ_ONLY.useApiKey(API_KEY);
    });

    checkDatabaseOperations('PUBLIC', {
      canDoReadOperation: true,
      canDoWriteOperation: false,
      writeError: '[401]'
    });

    checkDatabaseOperations('PUBLIC_READ_ONLY', {
      canDoReadOperation: true,
      canDoWriteOperation: false,
      writeError: '[401]'
    });

    checkDatabaseOperations('PRIVATE', {
      canDoReadOperation: false,
      canDoWriteOperation: false,
      readError:'[403]'
    });
  });


  describe("Accessing with Authorization Token", () => {
    let token = "";
    const jwtClient = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: GOOGLE_AUTH_SCOPES,
    });

    it("*initialize with access token", async () => {
      await jwtClient.authorize();
      token = jwtClient.credentials.access_token as string;
      databases.PUBLIC.useAccessToken(token);
      databases.PRIVATE.useAccessToken(token);
      databases.PUBLIC_READ_ONLY.useAccessToken(token);
      databases.PRIVATE_READ_ONLY.useAccessToken(token);
    });

    checkDatabaseOperations('PUBLIC', {
      canDoWriteOperation: true,
      canDoReadOperation: true
    });

    checkDatabaseOperations('PUBLIC_READ_ONLY', {
      canDoWriteOperation: false,
      canDoReadOperation: true,
      writeError:'[403]'
    });

    checkDatabaseOperations('PRIVATE', {
      canDoReadOperation: true,
      canDoWriteOperation: true,
    });

    checkDatabaseOperations('PRIVATE_READ_ONLY', {
      canDoWriteOperation: false,
      canDoReadOperation: true,
      writeError:'[403]'
    });
  });


  describe("Accessing with invalid key and token", () => {
    it('*initialize incorrect Access Token', () => {
      databases.PUBLIC.useAccessToken('random_text_123');
    });
    checkDatabaseOperations('PUBLIC', {
      canDoWriteOperation: false,
      canDoReadOperation: false,
      readError:'[401]'
    });
    
    it('*initialize incorrect API Key', () => {
      databases.PUBLIC.useApiKey('random_text_123');
    });
    checkDatabaseOperations('PUBLIC', {
      canDoWriteOperation: false,
      canDoReadOperation: false,
      readError:'[400]'
    });
  });
})
