const fs = require('fs');
const files = ['artifacts/bucket-list/package.json', 'artifacts/api-server/package.json'];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/"\^/g, '"');
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
