/**
 * Returns the column name for the gviven column number
 * @param {number} columnNumber 1 indexed position of the column
 * @return {string} column name of the given column
 */
export function columnNumberToName(columnNumber: number): string {
  let temp;
  let name = '';
  let column = columnNumber;

  while (column > 0) {
    temp = (column - 1) % 26;
    name = String.fromCharCode(temp + 65) + name;
    column = (column - temp - 1) / 26;
  }

  return name;
}

/**
 * Returns the column number for the given column name
 * @param {string} columnName alphabetical name of the column
 * @return {number} column number of the given column
 */
export function columnNameToNumber(columnName: string): number {
  let column = 0;
  const length = columnName.length;
  for (let i = 0; i < length; i++) {
    column += (columnName.charCodeAt(i) - 64) * 26 ** (length - i - 1);
  }
  return column;
}