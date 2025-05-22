import { IPlainTransactionObject } from "@terradharitri/sdk-core/out";


export interface SignTransactionsParams
{
  transactions: IPlainTransactionObject[];
}

export interface SignMessageParams
{
  message: string;
}

export interface SignAuthTokenParams
{
  token: string;
}