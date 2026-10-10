// Deterministic noise + RNG helpers (pure JS, no deps)
export function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function hash2(ix,iy){let h=(Math.imul(ix,374761393)+Math.imul(iy,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
export const clamp=(x,a,b)=>x<a?a:x>b?b:x;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const S=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// value noise 0..1
export function vnoise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const a=hash2(ix,iy),b=hash2(ix+1,iy),c=hash2(ix,iy+1),d=hash2(ix+1,iy+1);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
// fbm -1..1
export function fbm(x,y,oct=4){let a=0.5,s=0,n=0,f=1;for(let i=0;i<oct;i++){s+=a*(vnoise(x*f+i*17.3,y*f-i*9.1)*2-1);n+=a;a*=0.5;f*=2.03;}return s/n;}
// tileable value noise (period p cells)
export function pnoise(x,y,p){
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const m=(i)=>((i%p)+p)%p;
  const a=hash2(m(ix),m(iy)),b=hash2(m(ix+1),m(iy)),c=hash2(m(ix),m(iy+1)),d=hash2(m(ix+1),m(iy+1));
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
export function pfbm(x,y,p,oct=4){let a=0.5,s=0,n=0,f=1;for(let i=0;i<oct;i++){s+=a*pnoise(x*f,y*f,p*f);n+=a;a*=0.5;f*=2;}return s/n;}
