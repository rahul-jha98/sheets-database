import axios, {
  AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse,
} from 'axios';
import {ACTIONS} from './actions';
import {Sheet} from './ResponseStructure';
import {Table} from './Table';

const AUTH_MODE = {
  ACCESS_TOKEN: 1,
  API_KEY: 2,
};

/**
 * @class
 */
export class Database {
  sheetId: string;
  title?: string;

  _tables: Record<number, Table> = {};
  axios: AxiosInstance;

  authMode?: number;
  apiKey?: string;
  accessToken?: string;

  notifyAction: (actionType: number, ...params: string[]) => void = () => {};

  /**
   * Interact with the Google Sheet Document
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
    const response = await this.axios.post(':batchUpdate', {
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
    const headerValues = properties['headerValues'];

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
    const tableName = this._tables[sheetId].name;
    await this._requestUpdate('updateSheetProperties', {
      properties: {
        sheetId: sheetId,
        ...properties,
      },
      fields: Object.keys(properties).join(','),
    }, true);
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
        },
      });
    } else {
      result = await this.axios.post(':getByDataFilter', {
        includeGridData: true,
        dataFilters,
      });
    }
    const {sheets} = result.data;
    sheets.forEach((s: Sheet) => this._updateOrCreateTable(s));
  }
}
