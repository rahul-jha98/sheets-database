export type SheetProperties = {
  sheetId: number,
  title: string,
  index: number,
  [key: string]: any
}
export type SheetData = {
  rowData: Array<{values: Array<{effectiveValue: {
    numberValue?: number,
    stringValue?: string,
    boolValue?: boolean,
  }}>}>
}
export type Sheet = {
  properties: SheetProperties,
  data: Array<SheetData>
}
