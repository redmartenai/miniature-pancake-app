import academics from './academics.en';
import admin from './admin.en';
import dashboard from './dashboard.en';
import engage from './engage.en';
import operations from './operations.en';
import people from './people.en';
import shell from './shell.en';

/** The principal's web console (/console). Each area file holds its pages' strings. */
const consoleEn = { shell, dashboard, people, academics, operations, engage, admin };

export default consoleEn;
export type ConsoleTranslation = typeof consoleEn;
