_Class Documentation_

# SheetDatabase

> **This class represents the entire Database object**
  <br>
  It act as the main gateway to interact with the tables and table entries in the Database.

## Initializing with Sheet ID

`new SheetDatabase(sheetId);`

Param|Type|Description
---|---|---
`sheetId`|string|Document ID for the Google Sheet Document


## Properties
Once initialized the Database with a Google Sheet, call `db.sync()` to actually connect with the Google Sheet Document and fetch the data in memory. Once the data has been loaded the following readonly properties can then be accessed.

Property|Type|Description
---|---|---
`sheetId`|string|Sheet ID of the Google Sheet <br>_unique id for sheet, not editable_
`title`|string|Title of the Google Sheet
`tables`|Record<string, [Table](classdocs/table)>|Tables of database, keyed by their `title`
`tablesByIndex`|Array.<[Table](classdocs/table)>|Array of tables, ordered by their index<br>_The index is the position of individual sheet in the Document_

## Methods

### Authentication

#### `useApiKey(key)` :id=method-useApiKey
> Set API-key to use for auth - only allows read-only access to public docs.

Param|Type|Required|Description
---|---|---|---
`key`|string|✅|API key for your google project

- ✨ **Side effects** - all requests will now authenticate using this api key only

> See [Getting Started > Authentication > API Key](getting-started/authentication#api-key) for more details

#### `useServiceAccountAuth(creds)` (async) :id=method-useServiceAccountAuth
> Initialize JWT-style auth for [google service account](https://cloud.google.com/iam/docs/service-accounts)

Param|Type|Required|Description
---|---|---|---
`creds`|Object|✅|Object containing credendtials from google for your service account<br>_usually just `require` the json file google gives you_
`creds.client_email`|String<br>_email_|✅|The email of your service account
`creds.private_key`|String|✅|The private key for your service account

- ✨ **Side effects** - all requests will now authenticate using these credentials

> See [Getting Started > Authentication > Service Account](getting-started/authentication#service-account) for more details

#### `useOAuth2Client(oAuth2Client)` :id=method-useOAuth2Client
> Use [Google's OAuth2Client](https://github.com/googleapis/google-auth-library-nodejs#oauth2) to authenticate on behalf of a user

Param|Type|Required|Description
---|---|---|---
`oAuth2Client`|OAuth2Client|✅|Configured OAuth2Client

- ✨ **Side effects** - requests will use oauth access token to authenticate requests. New access token will be generated if token is expired.

> See [Getting Started > Authentication > OAuth Login](getting-started/authentication#oauth) for more details

#### `useAccessToken(token)` :id=method-useAccessToken
> Set access token to use for auth

Param|Type|Required|Description
---|---|---|---
`token`|string|✅|Oauth token to use

- ✨ **Side effects** - all requests will now authenticate using this OAuth Token

!> This assumes you are creating and managing/refreshing the token yourself.

> See [Getting Started > Authentication > Access Token](getting-started/authentication#aceess-token) for more details
### Load data from Sheet

#### `sync(syncTableEntries)` (async) :id=method-sync
> Loads all the tables and its entries into memory

Param|Type|Required|Description
---|---|---|---
`syncTableEntries`|boolean|-|Whether to also load the entries of tables<br> _default = true_
- ✨ **Side effects** - all tables and their headers are fetched.

### Managing Tables
#### `getTable(tableName)` :id=method-getTable
> returns the table with the given table name

Param|Type|Required|Description
---|---|---|---
`tableName`|string|✅|name of the table
- ↩️ **Returns** - [Table](classdocs/table) in database with the given name

!> If no table with given table name if found it throws an error

#### `addTable(tableName, columnNames)` (async) :id=method-addTable
> adds a table to database (by adding a new sheet to the Document)

Param|Type|Required|Description
---|---|---|---
`tableName`|string|✅|name of the added table
`columnNames`|Array.< string >|✅|list of column names in the new table
- ↩️ **Returns** - Promise.<[Table](classdocs/table)> (reference to the added table)
- ✨ **Side effects** - table is accessible via (`db.tablesByIndex`, `db.tables`, `db.getTable()`)

#### `dropTable(tableName)` (async) :id=method-dropTable
> drop the table with the given name 

Param|Type|Required|Description
---|---|---|---
`tableName`|string|✅|name of the table to delete
- ✨ **Side effects** - table is no longer accessible via (`db.tablesByIndex`, `db.tables`, `db.getTable()`)

!> If no table with given table name if found it throws an error

#### `renameTable(tableName, newTableName)` (async) :id=method-renameTable
> rename the table with the given name 

Param|Type|Required|Description
---|---|---|---
`tableName`|string|✅|name of the table to rename
`newTableName`|string|✅|new name of the table
- ✨ **Side effects** - table is no longer accessible via its old name.

!> If no table with given table name if found it throws an error