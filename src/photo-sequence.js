export const PHOTO_SAMPLES=32;
export function halton(index,base){let value=0,fraction=1;while(index>0){fraction/=base;value+=fraction*(index%base);index=Math.floor(index/base);}return value;}
/** Stationary accumulation only: never blends unrelated live gameplay frames. */
export class PhotoSequence{
 constructor(){this.version=0;this.reset();}
 reset(){this.count=0;this.active=false;this.version++;}
 start(){this.reset();this.active=true;return this.version;}
 next(){if(!this.active||this.count>=PHOTO_SAMPLES)return null;return {version:this.version,index:this.count,jitter:[halton(this.count+1,2)-.5,halton(this.count+1,3)-.5],weight:1/(this.count+1)};}
 commit(sample){if(!this.active||sample.version!==this.version||sample.index!==this.count)return false;this.count++;if(this.count===PHOTO_SAMPLES)this.active=false;return true;}
}
