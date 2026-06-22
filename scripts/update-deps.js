const fs = require('fs');

// 1. Update bucket-list package.json
const blPath = 'artifacts/bucket-list/package.json';
const blJson = JSON.parse(fs.readFileSync(blPath, 'utf8'));
const radixDeps = Object.keys(blJson.devDependencies).filter(k => k.startsWith('@radix-ui/'));
radixDeps.forEach(k => {
  if(k !== '@radix-ui/react-toast' && k !== '@radix-ui/react-dialog' && k !== '@radix-ui/react-slot') {
    delete blJson.devDependencies[k];
  }
});
delete blJson.devDependencies['tw-animate-css'];
delete blJson.devDependencies['framer-motion'];
fs.writeFileSync(blPath, JSON.stringify(blJson, null, 2));

// 2. Update api-server package.json (remove carets)
const apiPath = 'artifacts/api-server/package.json';
const apiJson = JSON.parse(fs.readFileSync(apiPath, 'utf8'));
for (const key in apiJson.dependencies) {
  if (apiJson.dependencies[key].startsWith('^') || apiJson.dependencies[key].startsWith('~')) {
    apiJson.dependencies[key] = apiJson.dependencies[key].substring(1);
  }
}
for (const key in apiJson.devDependencies) {
  if (apiJson.devDependencies[key].startsWith('^') || apiJson.devDependencies[key].startsWith('~')) {
    apiJson.devDependencies[key] = apiJson.devDependencies[key].substring(1);
  }
}
fs.writeFileSync(apiPath, JSON.stringify(apiJson, null, 2));

// 3. Update pnpm-workspace.yaml (remove carets)
const wsPath = 'pnpm-workspace.yaml';
let ws = fs.readFileSync(wsPath, 'utf8');
ws = ws.replace(/(\s+[\w@\/-]+):\s+[\^~](\d+\.\d+\.\d+)/g, '$1: $2');
fs.writeFileSync(wsPath, ws);

console.log('Dependencies updated!');
