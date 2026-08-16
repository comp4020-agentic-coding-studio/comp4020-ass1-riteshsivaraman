// The only line that touches a global. Everything it calls takes the document
// as an argument, so the same wiring runs under a test with no browser.
import { init } from "./app";

init(document);
