import fs from 'fs';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const jsrJson = JSON.parse(fs.readFileSync('./jsr.json', 'utf8'));

if (packageJson.version !== jsrJson.version) {
    jsrJson.version = packageJson.version;
    fs.writeFileSync('./jsr.json', JSON.stringify(jsrJson, null, 2) + '\n');
    console.log('Updated JSR version to match package.json:', packageJson.version);
}
