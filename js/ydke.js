// Formato YDKE: ydke://main!extra!side! (uint32 little-endian em base64)
const b64=ids=>{const u=new Uint8Array(new Uint32Array(ids).buffer);let s='';u.forEach(b=>s+=String.fromCharCode(b));return btoa(s)};
export const toYdke=cs=>`ydke://${b64(cs.filter(c=>!c.x).map(c=>c.i))}!${b64(cs.filter(c=>c.x).map(c=>c.i))}!!`;
export const fromYdke=s=>s.trim().replace(/^ydke:\/\//i,'').split('!').slice(0,3).flatMap((p,k)=>{if(!p)return[];const bin=atob(p),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return[...new Uint32Array(u.buffer)].map(i=>({i,n:'',r:'C',x:k==1?1:0}))});


// Arquivo .ydk (YGOPro / EDOPro)
export const toYdk=cs=>'#created by YGO Cube Draft\n#main\n'+cs.filter(c=>!c.x).map(c=>c.i).join('\n')+'\n#extra\n'+cs.filter(c=>c.x).map(c=>c.i).join('\n')+'\n!side\n';