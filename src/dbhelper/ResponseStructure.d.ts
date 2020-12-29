export type SheetProperties = {
  sheetId: number,
  title: string,
  [key: string]: any
}
export type SheetData = {
  rowData: Array<{values: Array<{formattedValue: any}>}>
  rowMetadata: Array<Object>,
  columnMetadata: Array<Object>
}
export type Sheet = {
  properties: SheetProperties,
  data: Array<SheetData>
}

export type Dictionary<Key extends number | string, Value> = {
   [index in Key]: Value 
};