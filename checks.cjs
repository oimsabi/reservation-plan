const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const siteRoot=path.join(__dirname,'dist','doi-khun-tan');
const houses=require('./dist/doi-khun-tan/data.js');
const calc=require('./dist/doi-khun-tan/model.js');
const houseRecords=houses.filter(h=>h.type==='house');
assert.equal(houseRecords.length,19);
assert.deepEqual(houseRecords.map(h=>h.id),['101','102','201','202','203','204','301','302','303','304','401','402','403','404','405','410','502','503','504']);
assert.deepEqual([1,2,3,4,5].map(zone=>houseRecords.filter(h=>h.zone===zone).length),[2,4,4,6,3]);
for(const h of houseRecords){
  const expected=h.id==='410'||h.id==='502'?[2200,660,1540,9,3,2]:h.id==='503'||h.id==='504'?[1500,450,1050,6,2,2]:[500,150,350,2,1,1];
  assert.deepEqual([h.price,h.discount,h.netPrice,h.capacity,h.bedrooms,h.bathrooms],expected);
  assert.equal(h.price-h.discount,h.netPrice);
}
assert.equal(new Set(houses.map(h=>h.id)).size,houses.length);
for(const h of houses){assert(h.x>0&&h.x<1&&h.y>0&&h.y<1);for(const p of h.photos)assert(fs.existsSync(path.join(siteRoot,p.src)));}
assert.deepEqual(calc.houses(houses,['401','402','403','404'],8,1),{count:4,total:2000,perPerson:250,capacity:8,bathrooms:4,bedrooms:4,enough:true});
assert.equal(calc.houses(houses,['502'],8,2).total,4400);
assert.equal(calc.houses(houses,['502'],10,1).enough,false);
assert.equal(calc.houses(houses,['502','502'],8,1).total,2200);
assert.equal(calc.houses(houses,[],8,1).total,0);
assert.equal(calc.houses(houses,['401','402','403','404'],8,2,true).total,2800);
assert.equal(calc.houses(houses,['502','502'],8,2,true).total,3080);
assert.deepEqual(calc.houses(houses,['503','504'],12,2,true),{count:2,total:4200,perPerson:350,capacity:12,bathrooms:4,bedrooms:4,enough:true});
assert.equal(calc.houses(houses,['101','102','201','202','203','204','302'],14,1).total,3500);
assert.equal(calc.houses(houses,[],8,1,true).total,0);
assert.deepEqual(calc.camping(8,1),{tents:4,area:240,gear:400,min:1280,max:1540});
assert.deepEqual(calc.camping(8,2),{tents:4,area:480,gear:800,min:2560,max:3080});
assert.equal(calc.camping(3,1).tents,2);
assert.equal(calc.camping(8,1,{rent:false}).min,240);
assert.equal(calc.camping(8,1,{bag:false,mat:false,pillow:false,ground:false}).min,640);
assert.equal(calc.camping(8,1,{pillow:true}).min,1360);
assert.equal(calc.camping(8,1,{ground:false}).min,1040);
assert.equal(calc.integer(-5,8,99),1);
assert.equal(calc.integer(999,8,99),99);
assert.equal(calc.integer('bad',8,99),8);
assert.equal(calc.integer(1.8,8,99),2);
console.log('Passed: 19 house records, workbook rates and capacities, unique map points, photo assets, capacity, duplicate selection, regular/net nightly rates, odd tent counts, equipment and nonduplicated ground fees.');

// Check the public tree and every local HTML/CSS asset after moving the park.
const root=__dirname;
const dist=path.join(root,'dist');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.name==='.git'?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
assert(!fs.existsSync(path.join(root,'.openai')));
const files=walk(root);
const forbiddenHost=new RegExp('\\.'+'chatgpt'+'\\.site','i');
const internalChat=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
for(const file of files){
  assert(!/park-map\.png$|doi-khun-tan-reference-9000\.png$/i.test(file));
  if(!/\.(?:html|css|js|cjs|json|md|yml)$/.test(file))continue;
  const content=fs.readFileSync(file,'utf8');
  assert(!forbiddenHost.test(content),`Old hosting URL in ${file}`);
  assert(!internalChat.test(content),`Internal chat identifier in ${file}`);
  if(file.endsWith('.html')){
    const head=content.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
    assert(/<meta\s+name="robots"\s+content="noindex"\s*\/?\s*>/i.test(head),`Missing noindex: ${file}`);
    for(const [,url] of content.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(/^(?:https?:|mailto:|tel:|data:|#)/i.test(url))continue;
      assert(!url.startsWith('/'),`Root-absolute path breaks project Pages: ${url}`);
      const resolved=path.resolve(path.dirname(file),url.split(/[?#]/)[0]);
      assert(!path.relative(dist,resolved).startsWith('..'),`Link escapes published directory: ${url}`);
      assert(fs.existsSync(resolved),`Missing local resource: ${file}: ${url}`);
      if(fs.statSync(resolved).isDirectory())assert(fs.existsSync(path.join(resolved,'index.html')));
    }
  }
  if(file.endsWith('.css'))for(const [,url] of content.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)){
    if(/^(?:https?:|data:)/.test(url))continue;
    assert(fs.existsSync(path.resolve(path.dirname(file),url)),`Missing CSS asset: ${url}`);
  }
}
const home=fs.readFileSync(path.join(dist,'index.html'),'utf8');
assert(/href="doi-khun-tan\/"/.test(home)&&home.includes('Doi Khun Tan'));
const parkHtml=fs.readFileSync(path.join(siteRoot,'index.html'),'utf8');
assert(parkHtml.includes('href="../"'));
assert(/src="assets\/park-map\.webp" width="3000" height="2100"/.test(parkHtml));
const webp=fs.readFileSync(path.join(siteRoot,'assets','park-map.webp'));
assert.equal(webp.toString('ascii',0,4),'RIFF');
assert.equal(webp.toString('ascii',8,12),'WEBP');
assert(webp.length<2679527,'Map should be smaller than the original');
console.log('Passed: home/park routes, relative HTML/CSS assets, noindex on every page, WebP map, and sanitized public tree.');
