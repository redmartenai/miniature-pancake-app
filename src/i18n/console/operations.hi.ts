import approvals from './operations/approvals.hi';
import fees from './operations/fees.hi';
import transport from './operations/transport.hi';
import type { ConsoleOperationsTranslation } from './operations.en';

const operations: ConsoleOperationsTranslation = { fees, transport, approvals };

export default operations;
