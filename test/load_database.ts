import {SheetDatabase} from '../src/index';

export const load_database = () => ({
  PUBLIC: new SheetDatabase('1hVV4i7tFpzKjD3lqEcMIDrQBs-IR2w9hhJBVuvybGhw'),
  PUBLIC_READ_ONLY: new SheetDatabase('1fn1UE49_LPwVZ3BEkluhGA1lD5ods0EJTls9Jk5oVRA'),
  PRIVATE: new SheetDatabase('12XVgXTiwwriBAyDu8yNK5fPt0vTVNGOv-nJtBcElQJ8'),
  PRIVATE_READ_ONLY: new SheetDatabase('1ciy4TyVsMobTNPvxmYXT6bnNNQjffNTnmj3E9vHCKJg')
});
