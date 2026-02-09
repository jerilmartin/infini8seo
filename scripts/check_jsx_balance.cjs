const fs = require('fs');
const path = require('path').join(__dirname,'..','client','app','seo-scan','page.tsx');
const s = fs.readFileSync(path,'utf8');
const openTags = (s.match(/<\s*[A-Za-z]/g)||[]).length;
const closeTags = (s.match(/<\//g)||[]).length;
console.log('openTagStarts:', openTags, 'closeTags:', closeTags);
// print first 200 locations where openTags - closeTags grows
let balance = 0;
const regex = /(<\s*[A-Za-z])|(<\/) /g;
let i=0;
for(let idx=0; idx<s.length; idx++){
  // inefficient but ok
  if(s[idx]==='<'){
    const next = s.slice(idx, idx+10);
    if(/^<\s*\//.test(s.slice(idx))){ balance--; }
    else if(/^<\s*[A-Za-z]/.test(s.slice(idx))){ balance++; }
    if(balance>0 && i<20){
      const line = s.slice(0,idx).split(/\r?\n/).length;
      console.log('first imbalance at idx',idx,'line',line,'balance',balance);
      i++;
    }
  }
}
console.log('final balance',balance);
