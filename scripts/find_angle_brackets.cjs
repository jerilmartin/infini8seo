const fs = require('fs');
const p = require('path').join(__dirname,'..','client','app','seo-scan','page.tsx');
const s = fs.readFileSync(p,'utf8');
let inS=false,inD=false,inB=false,esc=false;
let line=1;
for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='\n'){line++;esc=false;continue;}
  if(esc){esc=false;continue;}
  if(c==='\\'){esc=true;continue;}
  if(!inD && !inB && c==="'") { inS=!inS; continue; }
  if(!inS && !inB && c==='"') { inD=!inD; continue; }
  if(!inS && !inD && c==='`') { inB=!inB; continue; }
  if(c==='<' && !inS && !inD && !inB){
    console.log('line',line,'context:',s.slice(Math.max(0,i-40),i+40).replace(/\n/g,'\\n'));
  }
}
console.log('done');
