const fs = require('fs');
const path = 'client/app/seo-scan/page.tsx';
const s = fs.readFileSync(path, 'utf8');
let inSingle=false,inDouble=false,inBack=false,escaped=false;
let line=1;
for(let i=0;i<s.length;i++){
  const c = s[i];
  if(c==='\n'){
    if(inSingle) console.log('Newline inside single quote at line', line);
    line++;
    escaped=false;
    continue;
  }
  if(escaped){ escaped=false; continue; }
  if(c==='\\') { escaped=true; continue; }
  if(!inDouble && !inBack && c==="'") { inSingle=!inSingle; continue; }
  if(!inSingle && !inBack && c==='"') { inDouble=!inDouble; continue; }
  if(!inSingle && !inDouble && c==='`') { inBack=!inBack; continue; }
}
console.log('done');
