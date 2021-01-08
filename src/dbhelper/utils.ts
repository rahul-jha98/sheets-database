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

export function reduceRowsToDelete(rowsToDelete: number[]) : number[][] {
  const rangeRowsToDelete = rowsToDelete.map((rowNo) => [rowNo, rowNo+1]);
  const reducedRowsToDelete : number[][] = []
  reducedRowsToDelete.push(rangeRowsToDelete[0])
  let lastIdx = 0;

  for (let i = 1; i < rangeRowsToDelete.length; i++) {
    if (reducedRowsToDelete[lastIdx][1] === rangeRowsToDelete[i][0]) {
      reducedRowsToDelete[lastIdx][1] = rangeRowsToDelete[i][1];
    } else {
      reducedRowsToDelete.push(rangeRowsToDelete[i]);
      lastIdx++;
    }
  }

  let deletedSoFar = 0;
  for (let i = 0; i < reducedRowsToDelete.length; i++) {
    const [a, b] = reducedRowsToDelete[i];
    const toDelete = b-a;
    reducedRowsToDelete[i]= [a-deletedSoFar, b-deletedSoFar];
    deletedSoFar += toDelete;
  }
  return reducedRowsToDelete;
}

export function checkIfNameValid(data: string[] | string) : boolean {
  if (typeof(data) === 'string') {
    data = [data];
  }
  const validRegex = /^[A-Za-z0-9_]+$/;
  return data.every((name) => name.match(validRegex) !== null);
}