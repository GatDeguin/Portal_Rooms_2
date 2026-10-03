import {existsSync} from 'node:fs';import {homedir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
let api;const supplied=process.env.PORTAL_PLAYWRIGHT??process.env.PLAYWRIGHT_MODULE;
if(supplied)api=supplied.endsWith('.mjs')?await import(pathToFileURL(supplied)):createRequire(import.meta.url)(supplied);
else try{api=await import('playwright');}catch{const candidate=path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');if(!existsSync(candidate))throw new Error('Provide Playwright via PLAYWRIGHT_MODULE, PORTAL_PLAYWRIGHT, or the installed playwright package.');api=await import(pathToFileURL(candidate));}
export const chromium=api.chromium;
export const CHROME_PATH=process.env.CHROME_PATH??process.env.CHROMIUM_PATH??(process.platform==='win32'?['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync):undefined);
