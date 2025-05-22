import { SignTransactionsParams } from "./types/snapParam";
import { IPlainTransactionObject, Transaction } from "@terradharitri/sdk-core/out";
import { DECIMALS, DIGITS, REWA_LOGO } from "./constants";
import { getNetworkConfig, getNetworkType } from "./network";
import { NetworkType } from "./types/networkType";
import { NetworkConfig } from "@terradharitri/sdk-network-providers/out";
import { UserSecretKey } from "@terradharitri/sdk-wallet/out";
import {
  divider,
  image,
  panel,
  row,
  text,
  copyable,
  RowVariant,
} from "@metamask/snaps-sdk";
import { formatAmount } from "./operations";
import { KeyOps } from "./operations/KeyOps";

/**
 * @param params - The transaction(s) to sign.
 */
export const signTransactions = async (
  transactionsParam: SignTransactionsParams
): Promise<string[]> => {
  if (transactionsParam.transactions.length == 0) {
    throw new Error("There must be atleast one transaction");
  }

  const chainId = transactionsParam.transactions[0].chainID;

  if (!validateSameChainId(transactionsParam.transactions, chainId)) {
    throw new Error("All transactions must have the same chainId.");
  }

  const networkType = getNetworkType(chainId);

  if (!networkType) {
    throw new Error(`Cannot identify the network with chainId ${chainId}.`);
  }

  const networkConfig = await getNetworkConfig(networkType.apiAddress);
  if (!networkConfig) {
    throw new Error("Cannot retrieve the network configuration from the api.");
  }

  const transactionsSigned: string[] = [];
  for (const transactionPlain of transactionsParam.transactions) {
    const transaction = Transaction.fromPlainObject(transactionPlain);

    await processTransaction(
      transaction,
      networkType,
      networkConfig,
      transactionsSigned
    );
  }

  return transactionsSigned;

  async function processTransaction(
    transaction: Transaction,
    networkType: NetworkType,
    networkConfig: NetworkConfig,
    transactionsSigned: string[]
  ) {
    const keyOps = new KeyOps();
    const txValue = formatREWA(
      transaction.getValue().toString(),
      networkType.rewaLabel
    );
    const fees = transaction.computeFee(networkConfig).toString();
    const txFees = formatREWA(fees, networkType.rewaLabel);

    const confirmationResponse = await showConfirmationDialog(
      transaction,
      txValue,
      txFees
    );

    if (confirmationResponse !== true) {
      throw new Error("All transactions must be approved by the user");
    }

    const serializedTransaction = transaction.serializeForSigning();
    const transactionSignature: Buffer = await keyOps.getTransactionSignature(serializedTransaction);

    // Convert Buffer to a plain Uint8Array with ArrayBuffer backing
    const uint8Signature = new Uint8Array(transactionSignature.buffer.slice(
      transactionSignature.byteOffset,
      transactionSignature.byteOffset + transactionSignature.byteLength
    ));
    
    transaction.applySignature(uint8Signature);
    

    transactionsSigned.push(JSON.stringify(transaction.toPlainObject()));
  }

  async function showConfirmationDialog(
    transaction: Transaction,
    txValue: string,
    txFees: string
  ): Promise<string | boolean | null> {
    return snap.request({
      method: "snap_dialog",
      params: {
        type: "confirmation",
        content: panel([
          text("Send to"),
          text(transaction.getReceiver().bech32()),
          divider(),
          text("Amount"),
          row(txValue, image(REWA_LOGO), RowVariant.Default),
          divider(),
          text("Fee"),
          row(txFees, image(REWA_LOGO), RowVariant.Default),
          divider(),
          text("Data"),
          copyable(transaction.getData().toString()),
        ]),
      },
    });
  }

  function validateSameChainId(
    transactions: IPlainTransactionObject[],
    targetChainId: string
  ): boolean {
    return transactions.every(
      (transaction) => transaction.chainID === targetChainId
    );
  }

  function formatREWA(input: string, ticker: string) {
    return formatAmount({
      input: input,
      ticker: ticker,
      decimals: DECIMALS,
      digits: DIGITS,
    });
  }
};
