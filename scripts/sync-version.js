import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const jsrJson = JSON.parse(fs.readFileSync('./jsr.json', 'utf8'));
const versionModulePath = './src/version.ts';

if (packageJson.version !== jsrJson.version) {
    jsrJson.version = packageJson.version;
    fs.writeFileSync('./jsr.json', JSON.stringify(jsrJson, null, 2) + '\n');
    console.log('Updated JSR version to match package.json:', packageJson.version);
}

const versionModule = `// Kept in sync with package.json by scripts/sync-version.js.\nexport const VERSION = '${packageJson.version}';\n`;
if (!fs.existsSync(versionModulePath) || fs.readFileSync(versionModulePath, 'utf8') !== versionModule) {
    fs.writeFileSync(versionModulePath, versionModule);
    console.log('Updated CLI version to match package.json:', packageJson.version);
}
