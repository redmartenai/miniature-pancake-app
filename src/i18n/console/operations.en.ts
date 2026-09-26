/** Web console strings: operations (fees, transport, approvals). Each page's strings live in ./operations/<page>.en.ts. */
import approvals from './operations/approvals.en';
import fees from './operations/fees.en';
import transport from './operations/transport.en';

const operations = { fees, transport, approvals };

export default operations;
export type ConsoleOperationsTranslation = typeof operations;
