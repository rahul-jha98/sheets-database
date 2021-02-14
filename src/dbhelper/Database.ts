import axios, {
  AxiosError, AxiosInstance, AxiosRequestConfig,
} from 'axios';
import {JWT} from 'google-auth-library';
import {ACTIONS} from './actions';
import {Sheet} from './ResponseStructure';
import {Table} from './Table';
import type {OAuth2Client} from 'google-auth-library';
import {checkIfNameValid} from './utils';

const AUTH_MODE = {
  ACCESS_TOKEN: 1,
  API_KEY: 2,
  SERVICE_ACCOUNT: 3,
  OAUTH: 4,
};

const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const sheet_fields = 'sheets.data.rowData.values.effectiveValue,sheets.properties';
const document_fields = 'properties.title';
/**
 * @class
 */
export class Database {
  /**
   * @description
   * sheetId of the connected sheet document
   */
  sheetId: string;
  /**
   * @description
   * title of the sheet document
   */
  title?: string;

  /**
   * @private
   * @description
   * object with tables connected by sheetId
   */
  _tables:{[sheetId: number]: Table} = {};
  /**
   * @description
   * axios instance to make requests
   */
  axios: AxiosInstance;
  authMode?: number;
  apiKey?: string;
  accessToken?: string;
  jwtClient?: JWT;
  oAuth2Client?: OAuth2Client;

  notifyAction: (actionType: number, ...params: string[]) => void = () => {};

  /**
   * @param {string} [sheetId] sheetId of the excel sheet to connect
   */
  constructor(sheetId = '') {
    this.sheetId = sheetId;
    this.axios = axios.create({
      baseURL: `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,

      paramsSerializer(params) {
        let options = '';

        Object.keys(params).forEach((key: string) => {
          const isParamTypeObject = typeof params[key] === 'object';

          const isParamTypeArray = isParamTypeObject && params[key].length >= 0;

          if (!isParamTypeObject) {
            options += `${key}=${encodeURIComponent(params[key])}&`;
          }

          if (isParamTypeObject && isParamTypeArray) {
            params[key].forEach((val: string) => {
              options += `${key}=${encodeURIComponent(val)}&`;
            });
          }
        });
        return options ? options.slice(0, -1) : options;
      },
    });
    this.axios.interceptors.request.use(
        this._setAuthorizationInRequest.bind(this));

    this.axios.interceptors.response.use(
        (response) => response,
        this._onAxiosError.bind(this),
    );
  }

  /**
   * @param {function} onActionCallback callback when action happens
   */
  subscrible(onActionCallback: (actionType: number, ...params: string[]) => void) {
    this.notifyAction = onActionCallback;
  }

  /**
   * @private
   * @param {Object} _ sheet data returned by Google API
   */
  _updateOrCreateTable({properties, data}: Sheet) {
    const {sheetId} = properties;
    if (!this._tables[sheetId]) {
      this._tables[sheetId] = new Table(this, {properties, data});
    } else {
      this._tables[sheetId]._properties = properties;
      this._tables[sheetId]._fillTableData(data);
    }
  }

  /**
   * Make a request to fetch all the table with its data
   * @param {boolean} withData should request sheet data
   */
  async loadData(withData = true) {
    const response = await this.axios.get('/', {
      params: {
        includeGridData: withData,
        fields: `${document_fields},${sheet_fields}`,
      },
    });
    this.title = response.data.properties.title;
    response.data.sheets.forEach((s: Sheet) => {
      this._updateOrCreateTable(s);
    });
  }

  // AUTH RELATED METHODS ///////////////////////////////
  /**
   * Set the api key to use when making requests
   * @param {string} key Api Key to use
   */
  useApiKey(key: string) {
    this.authMode = AUTH_MODE.API_KEY;
    this.apiKey = key;
  }

  /**
   * Set the token to use when making requests
   * @param {string} token Auth Token to use
   */
  useAccessToken(token: string) {
    this.authMode = AUTH_MODE.ACCESS_TOKEN;
    this.accessToken = token;
  }

  async useServiceAccount(email: string, privateKey: string) {
    this.jwtClient = new JWT({
      email: email,
      key: privateKey,
      scopes: GOOGLE_AUTH_SCOPES,
    });
    await this.jwtClient.authorize();
    this.authMode = AUTH_MODE.SERVICE_ACCOUNT;
  }

  useOAuth2Client(oAuth2Client: OAuth2Client) {
    this.authMode = AUTH_MODE.OAUTH;
    this.oAuth2Client = oAuth2Client;
  }

  async _setAuthorizationInRequest(
      config: AxiosRequestConfig,
  ): Promise<AxiosRequestConfig> {
    if (this.authMode === AUTH_MODE.ACCESS_TOKEN) {
      if (!this.accessToken) throw new Error('Access Token not provided');
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    } else if (this.authMode === AUTH_MODE.API_KEY) {
      if (!this.apiKey) throw new Error('Please set API key');
      config.params = config.params || {};
      config.params.key = this.apiKey;
    } else if (this.authMode === AUTH_MODE.SERVICE_ACCOUNT) {
      if (!this.jwtClient) throw new Error('JWT Auth not set up properly');
      await this.jwtClient.authorize();
      config.headers.Authorization = `Bearer ${this.jwtClient.credentials.access_token}`;
    } else if (this.authMode === AUTH_MODE.OAUTH) {
      if (!this.oAuth2Client) throw new Error('OAuth Client was not set up properly');
      const credentials = await this.oAuth2Client.getAccessToken();
      config.headers.Authorization = `Bearer ${credentials.token}`;
    } else {
      throw new Error('You need to set up some kind of authorization');
    }
    return config;
  }

  async _onAxiosError(error: AxiosError) {
    if (error.response && error.response.data) {
      // usually the error has a code and message, but occasionally not
      if (!error.response.data.error) throw error;

      const {code, message} = error.response.data.error;
      error.message = `Google API error - [${code}] ${message}`;
      throw error;
    }

    if (error?.response?.status === 403) {
      if (this.authMode === AUTH_MODE.API_KEY) {
        throw new Error('Sheet is private. Use authentication or make public.');
      }
    }
    throw error;
  }


  async _requestUpdate(
      requestType: string,
      requestParams: any,
      fetchSpreadsheet = false) {
    const response = await this.axios.post(':batchUpdate', {
      requests: [{[requestType]: requestParams}],
      includeSpreadsheetInResponse: fetchSpreadsheet,
      responseIncludeGridData: fetchSpreadsheet,
    });

    if (fetchSpreadsheet) {
      response.data.updatedSpreadsheet.sheets.forEach((s: Sheet) =>
        this._updateOrCreateTable(s),
      );
    }

    return response.data.replies[0][requestType];
  }

  async _requestBatchUpdate(requests: any) {
    await this.axios.post(':batchUpdate', {
      requests,
    });
  }


  get tables() {
    return this._tables;
  }

  /**
   * Adds a table with the given properties
   * @param {Object} properties the properties of the new sheet configuration
   */
  async addTable(properties: Record<string, any>) : Promise<Table> {
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#AddSheetRequest
    if (!checkIfNameValid(properties.title)) {
      throw new Error(`Table names can only consist of letters, numbers and underscores`);
    }
    const headerValues = properties['headerValues'];
    this._validateColumnNames(headerValues);

    delete properties['headerValues'];

    const response = await this._requestUpdate('addSheet', {
      properties: properties || {},
    }, true);

    const newSheetId = response.properties.sheetId;
    const newSheet = this._tables[newSheetId];

    // allow it to work with `.headers` but `.headerValues` is the real prop
    if (headerValues) {
      await newSheet.setColumnNames(headerValues, true);
    }

    return newSheet;
  }

  /**
   * Deletes the table with the given sheetId
   * @param {number} sheetId sheetId of the sheet to delete
   */
  async deleteTable(sheetId: number) {
    // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/request#DeleteSheetRequest
    const tableName = this._tables[sheetId].name;
    await this._requestUpdate('deleteSheet', {sheetId});
    delete this._tables[sheetId];
    this.notifyAction(ACTIONS.TABLE_DELETED, tableName);
  }

  /**
   * Updates the properties of the sheet with given sheetId
   * @param {number} sheetId sheetId of the worksheet
   * @param {Object} properties Properties that needs to be updated
   */
  async updateSheetProperties(sheetId: number, properties: Object) {
    if ('title' in properties) {
      if (!checkIfNameValid(properties['title'])) {
        throw new Error(`Table names can only consist of letters, numbers and underscores`);
      }
    }
    const tableName = this._tables[sheetId].name;
    await this._requestUpdate('updateSheetProperties', {
      properties: {
        sheetId: sheetId,
        ...properties,
      },
      fields: Object.keys(properties).join(','),
    },
    true);
    if ('title' in properties) {
      this.notifyAction(ACTIONS.TABLE_RENAMED, tableName, properties['title']);
    }
  }

  /**
   * Loads the cell data with the given filters
   * @param {string|Array.<string>} filters filters used for the request
   */
  async loadCells(filters: string | Array<string>) {
    const readOnlyMode = this.authMode === AUTH_MODE.API_KEY;
    const filtersArray = Array.isArray(filters) ? filters : [filters];

    const dataFilters = filtersArray.map((filter) => {
      return readOnlyMode ? filter : {a1Range: filter};
    });

    let result;
    if (this.authMode === AUTH_MODE.API_KEY) {
      result = await this.axios.get('/', {
        params: {
          includeGridData: true,
          ranges: dataFilters,
          fields: sheet_fields,
        },
      });
    } else {
      result = await this.axios.post(':getByDataFilter', {
        includeGridData: true,
        dataFilters,
      },
      {
        params: {
          fields: sheet_fields,
        },
      });
    }
    const {sheets} = result.data;
    sheets.forEach((s: Sheet) => this._updateOrCreateTable(s));
  }

  _validateColumnNames(headerValues: string []) {
    if (!headerValues) throw new Error('Column names is empty');

    if (!checkIfNameValid(headerValues)) {
      throw new Error('Invalid column names. Column names should contain of only letters, numbers and underscore');
    }

    if (new Set(headerValues).size !== headerValues.length) {
      throw new Error('There are duplicate column names');
    }
    if (!headerValues.filter(Boolean).length) {
      throw new Error('All header values are blank');
    }
  }
}
